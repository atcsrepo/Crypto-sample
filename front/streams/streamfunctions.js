const axios = require('axios');

//Used to enable streaming of data in the background for price streams
//Prices extend up to the previous 24 hours, if possible
//Generally split into two parts: [Exchange] calls are for getting historical data for the ticker.
//[ExchangeWS] calls are for setting up websocket streams to enable real time data for symbol, if supported.
//Data is lightly processed in [ExchangeWS] and combined with historical data through processRawStreamData and mergeStreamData
//Streams can be nulled/cleared by this.clearStream()
//Functions are called from application component

//Data is organized as:
//[startTime, openPrice, highPrice, lowPrice, closePrice, volume,closeTime], using 5 min intervals
//Poloniex example below
module.exports = {
  Poloniex: function(id, urls, setfunction, setError){
    let data, entry, temp, url,
        restructuredData = [],
        start = (Date.now() / 1000) - (86400);
    url = urls.apiurl;
    url = url.replace(/:start:/, start);
    url = url.replace(/:end:/, Date.now()/1000);
    
    axios.get(url)
      .then((response) => {
        data = response.data;
        //Organize historic data
        for (let i = 0; i < data.length; i++) {
          entry = data[i];
          
          temp = [];
          temp[0] = entry.date * 1000;
          temp[1] = entry.open;
          temp[2] = entry.high;
          temp[3] = entry.low;
          temp[4] = entry.close;
          temp[5] = entry.volume;
          temp[6] = entry.date * 1000 + 299000;
          
          restructuredData.push(temp);
        }
        
        setfunction(id, restructuredData);
      })
      .catch((err) => {
        console.log(err);
        setError("Error encountered while getting data. Please try again later.");
      })
  },
  PoloniexWS: function(wsAddress, historicData, streamID, callback, marketID){
    let message, streamData, time, price, volume, id, filteredStream;

    this[streamID + "historicData"] = historicData;
    this[streamID] = new WebSocket(wsAddress);
    
    message = JSON.stringify({command: "subscribe", channel: marketID});
    
    this[streamID].onopen = () => {
      this[streamID].send(message);
    }
    
    this[streamID].onmessage = (dataStream) => {
      streamData = JSON.parse(dataStream.data)[2];
      if (streamData) {
        filteredStream = streamData.filter(events => events[0] === "t");
      } else {
        filteredStream = [];
      }
      
      if (filteredStream.length !== 0) {
        for (let i = 0; i < filteredStream.length; i++) {
          price = parseFloat(filteredStream[i][3]);
          volume = parseFloat(filteredStream[i][4]);
          time = filteredStream[i][5] * 1000;
          
          this.processRawStreamData(streamID, time, price, volume, callback);
        }
      }
    }
  },
  processRawStreamData: function(streamID, time, price, volume, callback){
    //Some exchanges do not emit kline candles, so we make our own from stream data
    //coefficient used for creating 5 min candles (5 min * 60000ms/min)
    let startTimeInterval, closeTime, periodVolume, high, low, close, open, lastKline, data,
        coefficient = 5 * 60000;
    
    //Get the last kline candle from history
    //Check whether data goes into the previous candle or create a new candle
    //Accumulate volume and re-define high/low/close as needed
    lastKline = this[streamID + "historicData"][this[streamID + "historicData"].length - 1];
    startTimeInterval = Math.floor(time / coefficient) * coefficient;
    closeTime = startTimeInterval + 299000;  //End of kline
    
    //Sets values depending on if it's a new or old candle
    periodVolume = lastKline[0] === startTimeInterval ? lastKline[5] + volume : volume;
    open = lastKline[0] === startTimeInterval ? lastKline[1] : price;
    close = price;
    high = lastKline[0] === startTimeInterval ?
      (lastKline[2] > price ? lastKline[2] : price) : price;
    low = lastKline[0] === startTimeInterval ?
      (lastKline[3] < price ? lastKline[3] : price) : price;
      
    data = [startTimeInterval, open, high, low, close, periodVolume, closeTime];
    
    //Sends newly formed candle for merger
    this.mergeStreamData(data, streamID, callback);
  },
  mergeStreamData: function(streamData, streamID, callback) {
    //Retains the 288 most recent candles (~1 day: 60 * 24 / 5) and puts it into historic data
    let historicData = this[streamID + "historicData"];

    if (streamData[0] === historicData[historicData.length - 1][0]) {
      //If start interval is the same, then update
      historicData[historicData.length - 1] = streamData;
    } else if (streamData[0] > historicData[historicData.length - 1][0]){
      //Otherwise, check to see if slicing needs to happen
      if (historicData.length >= 288) {
        historicData = historicData.slice(1);
      }
      
      historicData.push(streamData);
    }

    this[streamID + "historicData"] = historicData;
    callback(streamID, historicData);
  },
  clearStream: function(streamID) {
    //Ends stream and clears stored data
    if (this[streamID]) {
      try {
        this[streamID].close();
      } catch (err) {
        this[streamID].disconnect();
      }
      this[streamID + "historicData"] = undefined;
    }
  }
}