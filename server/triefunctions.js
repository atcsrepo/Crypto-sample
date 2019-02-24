const fs = require('fs');
let symbolTrie = JSON.parse(fs.readFileSync('./server/cointrack/data/searchtriesymbol.txt'));
let nameTrie = JSON.parse(fs.readFileSync('./server/cointrack/data/searchtriename.txt'));

//Generates a search tree for AJAX searches
module.exports = {
  generateSearchTrie: function(db, coinList, log){
    //Used to initialize trie creation parameters
    
    let entries, combinedName, symbol, name,
        nameList = [],
        symbolList = [],    
        coinKeys = Object.keys(coinList.convertSymbol);
    
    //Initializes process to generate a name-based and symbol based list for search tree
    //e.g. [[Bitcoin (BTC), bitcoin]] and [[Bitcoin (BTC), btc]]  
    for (let i = 0;i < coinKeys.length; i++) {
      entries = coinList.convertSymbol[coinKeys[i]];

      for (let j = 0; j < entries.length; j++) {
        symbol = entries[j].symbol;
        name = entries[j].name;
        combinedName = name + " ("+symbol+")";

        nameList.push([combinedName, name.toLowerCase()]);
        symbolList.push([combinedName, symbol.toLowerCase()]);
      }
    }
    
    this.createTrie(db, nameList, "name", log);
    this.createTrie(db, symbolList, "symbol", log);
  },
  createTrie: function(db, valuesList, type, log){
    //Creates trie and stores it in text file
    let combinedName, trieValue, holder, fileName, varName,
        trie = {};
    
    for (let i = 0; i < valuesList.length; i++) {
      combinedName = valuesList[i][0];
      trieValue = (valuesList[i][1]).split('');
      holder = trie;

      for (let idx = 0; idx < trieValue.length; idx++) {
        if (trieValue[idx] in holder) {
          holder = holder[trieValue[idx]];
          holder.possibilities.push(combinedName);
        } else {
          holder[trieValue[idx]] = {possibilities:[combinedName]};
          holder = holder[trieValue[idx]];
        }
      }
    }
    
    fileName = "./server/cointrack/data/searchtrie"+type+".txt";
    
    fs.writeFile(fileName, JSON.stringify(trie), (err)=> {
      if(err){
        log.info("Error while writing %s: %s", fileName, err);
      }
      
      if (type === "symbol"){
        symbolTrie = trie;
      } else {
        nameTrie = trie;
      }
      
      log.info('Trie file written: %s', fileName);
    })
  },
  searchSymbols: function (db, query, log) {
    let holder = symbolTrie;
    query = query.toLowerCase();
    
    for (let i = 0; i < query.length; i++) {
      if (query[i] in holder) {
        holder = holder[query[i]];
      } else {
        holder = null;
        break;
      }
    }
    
    if (holder) {
      return holder.possibilities;
    } else {
      return [];
    }
  },
  searchNames: function (db, query, log) {
    let holder = nameTrie;
    query = query.toLowerCase();
    
    for (let i = 0; i < query.length; i++) {
      if (query[i] in holder) {
        holder = holder[query[i]];
      } else {
        holder = null;
        break;
      }
    }
    
    if (holder) {
      return holder.possibilities;
    } else {
      return [];
    }
  }
}