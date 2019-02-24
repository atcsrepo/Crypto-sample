const React = require('react');
const styles = require("./errorstyles");

module.exports = class ErrorModal extends React.Component {
  constructor(props){
    super(props);
  
    this.close = this.close.bind(this);
    this.stop = this.stop.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }
  
  close(){
    this.props.setError(null);
  }
  
  stop(e){
    e.stopPropagation();
  }
  
  handleScroll(){
    //shifts error modal in response to users scrolling
    document.getElementById('error-overlay').style.top = document.documentElement.scrollTop + "px";
  }
  
  componentWillUnmount(){
    window.removeEventListener('scroll', this.handleScroll);
  }
  
  componentDidMount(){
    window.addEventListener('scroll', this.handleScroll);
  }
  
  render(){
    let overlayStyle = Object.assign({}, styles.overlay);
    
    overlayStyle.top = document.documentElement.scrollTop + "px";

    return(
      <div style={overlayStyle} onClick={this.close} id="error-overlay">
        <div style={styles.modal} onClick={this.stop}>
          <div style={styles.title}>
            Error Encountered
          </div>
          <div style={styles.message}>
            {this.props.msg}
          </div>
          <div style={styles.confirm} onClick={this.close}>
            Close
          </div>
        </div>
      </div>
    );
  }
}