const React = require("react");
const StreamFunctions = require('./streamfunctions.js');

//Used to maintain or null ticker streams, if supported.
//Sequence of events: Get historic data via setStreamInfo, which also sets the details of stream.
//setStream is used as a callback in setStreamInfo. It sets the "historic" data for stream.
//Future re-rendering triggers streaming, if supported

module.exports = class StreamManager extends React.Component {
  constructor(props){
    super(props)
    
    this.streamOne = null;
    this.streamTwo = null;
    this.streamThree = null;
    this.streamFour = null;
    this.streamFive = null;
    this.streamSix = null;
    
    this.setStreamInfo = this.setStreamInfo.bind(this);
    this.setStream = this.setStream.bind(this);
    this.manageStreams = this.manageStreams.bind(this);
  }
  
  //Initiates ticker stream data for requested ticker by retrieving historical data
  //Data to be used by StreamManager component, which combines websocket stream (if supported) with historical data for pseudo real time info
  setStreamInfo(update){
    /*
      this.props.streamData has structure:
      {
        streamOne: {detail: {}, data: {}},
        streamTwo: {detail: {}, data: {}},
        etc.
      }
    */
    let tempState = this.props.streamData;
    
    //Used to get historical data from exchange
    StreamFunctions[update.details.exchange](update.id, update.urls, this.setStream, this.props.setError);
  
    //Sets the details component of streamData to defined values
    tempState[update.id].details = update.details;
    this.props.alterState(tempState);
    this.props.alterState({streamUpdate: null});  //Clears update request
  }
  
  setStream(id, data) {
    //Call back used in getStreamInfo
    //Sets the historical data for the stream
    //If data is null'ed, it causes clearance/closing of stream
    let tempState = this.props.streamData;
    tempState[id].data = data;
    
    this.props.alterState(tempState);
  }
  
  //Used to start and close stream data
  manageStreams(){
    let code, data, details, wsAddress,
        streamDataKeys = Object.keys(this.props.streamData),
        streamData = this.props.streamData;

    /*
    Structure of details -
      details = {exchange: exchange, 
                 marketID: marketID, 
                 market: this.state.markets[marketIdx], 
                 base: this.state.base[baseIdx], 
                 streamws: response.data.data.streamws};
    */
    for (let i = 0; i < streamDataKeys.length; i++) {
      //Checks to see if historic data is present and that there is no stream ongoing presently
      if (streamData[streamDataKeys[i]].data !== null && this[streamDataKeys[i]] === null){
        details = streamData[streamDataKeys[i]].details;
        //Checks to make sure the exchange actually supports streaming
        if (details && details.streamws){           
          code = details.exchange + "WS";
          data = streamData[streamDataKeys[i]].data;
          wsAddress = details.streamws;
          //Sets object to stream data, which is processed in StreamFunctions
          this[streamDataKeys[i]] = StreamFunctions[code](wsAddress ,data, streamDataKeys[i], this.setStream, details.marketID);
        }
      } else if (streamData[streamDataKeys[i]].data === null){
        //If data is null'ed by endStream in application.js, clear stream
        //Note that application.js is used to cache data so that when users switch views data is still saved
        this[streamDataKeys[i]] = null;
        StreamFunctions.clearStream(streamDataKeys[i]);
      }
    }
  }
  
  componentDidUpdate(){
    if (this.props.streamUpdate) {
      this.setStreamInfo(this.props.streamUpdate);
    }
 
    this.manageStreams();
  }
  
  render(){
    return null;
  }
}