const trieFunctions = require('./background/triefunctions.js'),
      axios = require('axios'),
      url = require('url'),
      exchangedetails = require('./data/coinexchangelist.js');

let nameToExSym, exchangePrices;
      
module.exports = function(db, app, log) {
  /*
    Examples of some of the end points used
  */
  
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.writeHead(200, {"Content-type": "application/json",
                          "Cache-Control": "no-cache, no-store, must-revalidate",
                          "Pragma": "no-cache"});
      res.end(JSON.stringify({err: true, redirect: "/login.html"}));
    }
  }
  
  app.get("/", (req, res) => {
    res.redirect('/login.html');
  });
  
  //Provides initial data to generate user portfolio after login
  app.get('/getprofile', ensureAuthenticated, (req, res) => {
    db.collection("Users").findOne({username: req.user.username}, (err, user) => {
      if (err) {
        log.info("Error occurred while retrieving profile: %s", err);
        res.writeHead(200, {"Content-type": "application/json",
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            "Pragma": "no-cache"});
        res.end(JSON.stringify({err: "Error encountered retrieving portfolio. Please try again later.", portfolio: [], priceSourcesUsed: {}}));
      } else {
        res.writeHead(200, {"Content-type": "application/json",
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            "Pragma": "no-cache"});
        res.end(JSON.stringify(user.profile));
      }
    })
  })
  
  //Used to update user portfolio data
  app.post('/updateprofile', ensureAuthenticated, (req, res) => {
    db.collection("Users").update(
      {username: req.user.username},
      {$set: {
          "profile.portfolio": req.body
        }
      },
      (err, user) => {
      if (err) {
        log.info("Failed to update profile profile: %s", err);
        res.writeHead(200, {"Content-type": "application/json",
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            "Pragma": "no-cache"});
        res.end(JSON.stringify({err: "Unable to save portfolio changes. Please try again later."}))
      } else {
        res.end();
      }
    })
  })
  
  //Used for AJAX searches for manual cryptocurrency entries into portfolio
  //Searching from a object, so cleaning text isn't essential
  app.get('/manualinput/:query', ensureAuthenticated, (req, res) => {
    try{
      let query = req.params.query,
          symbolResults = trieFunctions.searchSymbols(db, query, log),
          nameResults = trieFunctions.searchNames(db, query, log);

      for (let i = 0; i < symbolResults.length; i++) {
        if (!(nameResults.includes(symbolResults[i]))){
          nameResults.push(symbolResults[i]);
        }
      }
      
      nameResults.sort();
      
      res.writeHead(200, {"Content-type": "application/json",
                          "Cache-Control": "no-cache, no-store, must-revalidate",
                          "Pragma": "no-cache"});
      res.end(JSON.stringify(nameResults));
    } catch (err) {
      info.log("Error while performing AJAX search: %s", err);
    }
  })
  
  //Provides a list of exchanges where streaming is available.
  //Called from streamsmain.js
  app.get('/streamableexchanges/', ensureAuthenticated, (req, res) => {
    let streamableEx = [],
        exchanges = Object.keys(exchangedetails);
    
    for (let i = 0; i < exchanges.length; i++) {
      if (exchangedetails[exchanges[i]].supportStream) {
        streamableEx.push(exchanges[i]);
      }
    }
    
    exchanges.unshift("");
    
    res.writeHead(200, {"Content-type": "application/json"});
    res.write(JSON.stringify({exchangeList: exchanges}));
    res.end();
  })
  
  //Used to retrieve pesudo real time (up to 5 min delay) prices obtained from exchanges.
  app.post("/exchangeprices/", ensureAuthenticated, (req, res) => {
    try {
      let data = req.body,
          exchanges = Object.keys(data),
          results = {},
          coins, coindata, symbol, name, derivedSymbol, price, temp;

      for (let i = 0; i < exchanges.length; i++){
        results[exchanges[i]] = {};

        if (exchanges[i] != "coinmarketcap"){
          coins = data[exchanges[i]];
          
          for (let j = 0; j < coins.length; j++) {
            coindata = coins[j].split('.');
            symbol = coindata[1];
            name = coindata[0].toUpperCase()
                    .replace(/\s/g, '')
                    .replace(/[^0-9A-Za-z]/g, (chr) => {
                      return "\\x" + chr.charCodeAt(0)
                    });
            
            //Check for valid exchange
            try {
              if (nameToExSym[exchanges[i]]){
                derivedSymbol = nameToExSym[exchanges[i]][name];

                if (derivedSymbol){
                  price = exchangePrices[exchanges[i]][derivedSymbol];
                } else {
                  price = exchangePrices[exchanges[i]][symbol];
                }
      
                if (price) {
                  temp = {name: coindata[0], symbol: coindata[1], priceUSD: price};
                } else {
                  temp = {name: coindata[0], symbol: coindata[1], priceUSD: "N/A"};
                }
              } else {
                temp = {name: coindata[0], symbol: coindata[1], priceUSD: "N/A"};
              }
                results[exchanges[i]][symbol] = [temp];
            } catch (err) {
              results[exchanges[i]][symbol] = [{name: coindata[0], symbol: coindata[1], priceUSD: price}];
            }
          }
        } else {
          continue;
        }
      }

      res.writeHead(200, {"Content-type": "application/json"});
      res.write(JSON.stringify({err: false, data: results}));
      res.end();
    } catch (err) {
      log.info("Error while getting exchange prices: ", err);
      res.writeHead(200, {"Content-type": "application/json"});
      res.write(JSON.stringify({err: true, msg: "Error processing"}));
      res.end();
    }
  })
  
  app.get("/logout", (req, res) => {
    req.logout();
    res.writeHead(200, {"Content-type": "application/json",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache"});
    res.write(JSON.stringify({redirect: "/login.html"}));
    res.end();
  })
  
  app.route('*')
    .get((req, res) => {
      log.info("Route error: ", url.parse(req.url));
    })
}