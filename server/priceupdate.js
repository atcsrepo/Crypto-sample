const axios = require('axios');
const moduleEmitter = require('./emitterhub.js').emitter;

//Maintains a list of prices in USD for trading pairs in different exchanges.
//Will update data every 5 mins. Averages price across USDT-, ETH- and BTC-based trading pairs if applicable.
module.exports = {
  initializePriceUpdates: function(db, exchangeList, log){
    let entry, exchange, url, fcnName,
        exchanges = Object.keys(exchangeList);
 
    log.info("Initiating Price Update/Stream");
    
    for (let i = 0; i < exchanges.length; i++){
      entry = exchangeList[exchanges[i]];
      exchange = exchanges[i];
      url = entry.marketPriceRest;
      
      if (url){
        fcnName = exchange +"PriceUpdate";
        
        if (this.prices[exchange]) {
          return;
        } else {
          this[fcnName](url, fcnName, log);
        }
      }
    }
  },
  binancePriceUpdate: function(url, _self, log){
    let checkBNB = /BNB$/i,
        checkBTC = /BTC$/i,
        checkETH = /ETH$/i,
        checkUSDT = /USDT$/i,
        prices = {},
        BTCPrice, ETHPrice, BNBPrice, ticker, temp;
    
    function processPrices(name, regExp, price, multiplier) {
      ticker = name.replace(regExp, '');
      temp = prices[ticker];
      // Creates a list of prices for a given ticker
      if (temp) {
        prices[ticker].push(price * multiplier);
      } else {
        prices[ticker] = [price * multiplier];
      }
    }
    
    axios.get(url)
      .then((response) => {
        marketList = response.data;
        
        //First find USD price for trading pair bases, then convert and average respective markets
        for (let i = 0; i < marketList.length; i++) {
          if (marketList[i].symbol === "ETHUSDT"){
            ETHPrice = parseFloat(marketList[i].price);
          } else if (marketList[i].symbol === "BTCUSDT"){
            BTCPrice = parseFloat(marketList[i].price);
          } else if (marketList[i].symbol === "BNBUSDT"){
            BNBPrice = parseFloat(marketList[i].price);
          }
        };

        //Processes each trading pair and gets their USD prices
        for (let i = 0; i < marketList.length; i++) {
          if (checkBNB.test(marketList[i].symbol)){
            processPrices(marketList[i].symbol, checkBNB, marketList[i].price, BNBPrice);
          } else if (checkBTC.test(marketList[i].symbol)){
            processPrices(marketList[i].symbol, checkBTC, marketList[i].price, BTCPrice);
          } else if (checkETH.test(marketList[i].symbol)){
            processPrices(marketList[i].symbol, checkETH, marketList[i].price, ETHPrice);
          } else if (checkUSDT.test(marketList[i].symbol)){
            processPrices(marketList[i].symbol, checkUSDT, marketList[i].price, 1);
          }
        }
        
        //Sets price as average price
        this.prices.binance = this.averagePrices(prices);
        moduleEmitter.emit("Updated exchange prices", this.prices);
        this.nextUpdate(url, _self, log);
      })
      .catch((err) => {
        log.info("Error while getting prices from Binance: ", err);
        this.nextUpdate(url, _self, log);
      })
  },
  poloniexPriceUpdate: function(url, _self, log){
    let checkBTC = /^BTC/i,
        checkETH = /^ETH/i,
        checkUSDT = /^USDT/i,
        prices = {},
        marketList, marketListKeys, BTCPrice, ETHPrice, ticker, temp;
    
    //Similar to above, with some exchange specific modifications
    function processPrices(name, regExp, price, multiplier) {
      ticker = name.replace(regExp, '').slice(1);
      temp = prices[ticker];
      
      if (temp) {
        prices[ticker].push(price * multiplier);
      } else {
        prices[ticker] = [price * multiplier];
      }
    }
    
    axios.get(url)
      .then((response) => {
        marketList = response.data;
        marketListKeys = Object.keys(marketList);
        
        ETHPrice = parseFloat(marketList.USDT_ETH.last);   
        BTCPrice = parseFloat(marketList.USDT_BTC.last);

        for (let i = 0; i < marketListKeys.length; i++) {          
          if (checkBTC.test(marketListKeys[i])){
            processPrices(marketListKeys[i], checkBTC, marketList[marketListKeys[i]].last, BTCPrice);
          } else if (checkETH.test(marketListKeys[i])){
            processPrices(marketListKeys[i], checkETH, marketList[marketListKeys[i]].last, ETHPrice);
          } else if (checkUSDT.test(marketListKeys[i])){
            processPrices(marketListKeys[i], checkUSDT, marketList[marketListKeys[i]].last, 1);
          }
        }
        
        this.prices.poloniex = this.averagePrices(prices);
        moduleEmitter.emit("Updated exchange prices", this.prices);
        this.nextUpdate(url, _self, log);
      })
      .catch((err) => {
        log.info("Error while getting prices from Poloniex: ", err);
        this.nextUpdate(url, _self, log);
      })
  },
  averagePrices: function(prices) {
    let priceKeys = Object.keys(prices),
        newResults = {}, 
        temp;
        
    for (let i = 0; i < priceKeys.length; i++) {
      temp = prices[priceKeys[i]];
      sum = 0;
      
      for (let j = 0; j < temp.length; j++){
        sum += temp[j];
      }
      
      newResults[priceKeys[i]] = (sum / temp.length).toFixed(4);
    }
    
    return newResults;
  },
  nextUpdate: function(url, func, log) {
    setTimeout(() => {
      this[func](url, func, log);
    }, 600000);
  },
  prices: {}
}