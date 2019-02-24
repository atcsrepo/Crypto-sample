const React = require('react');
const styles = require('./overviewstyles.js');
const RangeButton = require('./rangebutton.js')
const d3 = Object.assign({}, 
  require("d3-axis"), 
  require("d3-path"), 
  require("d3-scale"),
  require("d3-selection"),
  require("d3-array"));

module.exports = class Overview extends React.Component {
  /*
    Dynamic heat map used on portfolio page
  */
  
  constructor(props){
    super(props);
    
    this.state = {
      range: "1hr"
    };
    
    this.checkPaint = this.checkPaint.bind(this);
    this.checkPageHeight = this.checkPageHeight.bind(this);
    this.changeRange = this.changeRange.bind(this);
    this.createHeatmap = this.createHeatmap.bind(this);
    this.createLegend = this.createLegend.bind(this);
    this.processData = this.processData.bind(this);
    this.createTooltip = this.createTooltip.bind(this);
  }
  
  changeRange(id){ 
    this.setState({range: id});
  }
  
  //Calculates the min and max change in the given time range (1h, 24h, 7d) for CMC data
  processData(data){
    let range, temp, intermediatePrice,
        results = {},
        maxChange = -Infinity, 
        minChange = Infinity;
        
    switch(this.state.range){
      case "24hrs":
        range = "percent_change_24h";
        break;
      case "7days":
        range = "percent_change_7d";
        break;
      default:
        range = "percent_change_1h";
    }
    
    results.marketData = [];
    
    for (let dataPoint = 0; dataPoint < data.length; dataPoint++){
      temp = {};
      temp.name = data[dataPoint].name;
      temp.change = parseFloat(data[dataPoint]["quotes"]["USD"][range]);
      intermediatePrice = parseFloat(data[dataPoint]["quotes"]["USD"].price);
      temp.price = intermediatePrice < 1 ? intermediatePrice.toFixed(4) : intermediatePrice.toFixed(2);
      minChange = minChange > temp.change ? temp.change : minChange;
      maxChange = maxChange < temp.change ? temp.change : maxChange;
      results.marketData.push(temp);
    }
    
    results.maxChange = maxChange;
    results.minChange = minChange;
    
    return results;
  }
  
  //Create heatmap with canvas
  createHeatmap(data){
    //In case we can't get data right away, otherwise it'll recursively call because it can't resolve sizes
    if (data.length === 0) {
      return;
    }
    
    //Clear old canvas before starting
    d3.select("#legend").selectAll("*").remove();
    d3.select("#marketHeatmap").selectAll("*").remove();

    let changeDomain, changeRange, legendData;
    let processedMarketData = this.processData(data);
    
    const heatmapDiv = document.getElementById("marketHeatmap");
    const ratio = window.devicePixelRatio;
    
    //Get dimensions of heatmap and legend div for canvas
    const heatmapDivWidth = parseFloat(window.getComputedStyle(heatmapDiv, null).width);

    //Define number of item/row and number of rows
    const heatmapMargin = {top: 20, bottom: 30, left: 10, right: 10};
    const numItemsPerRow = Math.floor((heatmapDivWidth - (heatmapMargin.left + heatmapMargin.right)) / 12);
    const numRows = Math.ceil(data.length / numItemsPerRow);
    
    //Create and scale canvas for drawing

    let heatmapCanvas = d3.select("#marketHeatmap")
                          .append("canvas")
                          .attr("width", heatmapDivWidth * ratio)
                          .attr("height", (12 * numRows + heatmapMargin.top) * ratio)
                          .attr("id", "heatmapCanvas")
                          .style("width", heatmapDivWidth + "px")
                          .style("height", (12 * numRows + heatmapMargin.top) + "px");

    let heatmapContext = document.getElementById("heatmapCanvas").getContext("2d");
    
    heatmapContext.transform(ratio, 0, 0, ratio, 0, 0);

    //Changes post paint causes weird effects. Check width, and redefine if needed before checking height.
    this.checkPageHeight();

    if ((Math.abs(heatmapDivWidth - heatmapDiv.getBoundingClientRect().width) > 1)) {
      return this.createHeatmap(data);
    }

    //Create Scales
    const xScale = d3.scaleLinear()
                     .domain([0, numItemsPerRow])
                     .range([heatmapMargin.left, (parseFloat(heatmapCanvas.attr('width'))/ratio - heatmapMargin.right)]);

    const yScale = d3.scaleLinear()
                     .domain([0, numRows])
                     .range([heatmapMargin.top, parseFloat(heatmapCanvas.attr("height"))/ratio]);

    if(processedMarketData.minChange > 0) {
      changeDomain = [0, processedMarketData.maxChange];
      changeRange = ["white","#00FF00"];
      legendData = [{offset: "0", color: "white"},
                    {offset: processedMarketData.maxChange, color: "#00FF00"}];
    } else if (processedMarketData.maxChange < 0) {
      changeDomain = [processedMarketData.minChange, 0];
      changeRange = ["#FF0000","white"];
      legendData = [{offset: processedMarketData.minChange, color: "#FF0000"},
                    {offset: "0", color: "white"}];
    } else {
      changeDomain = [processedMarketData.minChange, 0, processedMarketData.maxChange];
      changeRange = ["#FF0000","white","#00FF00"];
      legendData = [{offset: processedMarketData.minChange, color: "#FF0000"},
                    {offset: "0", color: "white"},
                    {offset: processedMarketData.maxChange, color: "#00FF00"}];
    }
    
    const colorScale = d3.scaleLinear()
                         .domain(changeDomain)
                         .range(changeRange);
                      
    for (let rect = 0; rect < processedMarketData.marketData.length; rect++){
      let data = processedMarketData.marketData[rect];
      heatmapContext.fillStyle = isNaN(data.change) ? "#3638F2" : colorScale(data.change);
      heatmapContext.fillRect(xScale(rect % numItemsPerRow), yScale(Math.floor(rect / numItemsPerRow)), 11, 11);
      heatmapContext.strokeStyle = isNaN(data.change) ? "white" : colorScale(data.change);
      heatmapContext.stroke();
    }
    
    this.createLegend(changeDomain, legendData);
  }
  
  //Create color gradient legend for heat map
  createLegend(domain, legendStops){
    const legendDiv = document.getElementById("legend");
    const legendDivWidth = parseFloat(window.getComputedStyle(legendDiv, null).width);
    const legendDivHeight = parseFloat(window.getComputedStyle(legendDiv, null).height);
    const legendMargin = {left: 15, right: 15};
    const legendWidth = legendDivWidth - (legendMargin.right + legendMargin.left);
    const domainRange = d3.extent(domain);
    const upperLimit = domainRange[1] > 150 ? 150 : domainRange[1];
    
    let legendSvg = d3.select("#legend")
                  .append("svg")
                  .style("width", legendDivWidth + "px")
                  .style("height", legendDivHeight + "px");
    
    const legendScale = d3.scaleLinear()
                            .domain([domainRange[0], upperLimit])
                            .range([0, legendWidth]);
    
    legendSvg.append("defs")
             .append("linearGradient")
             .attr("id", "gradientLegend")
             .attr("x1", '0%').attr("y1", '0%')
             .attr("x2", '100%').attr("y2", '0%')
             .selectAll("stop")
             .data(legendStops)
             .enter().append("stop")
             .attr("offset", (d) => {
                if (!isNaN(legendScale(d.offset))){
                  return "" + (legendScale(d.offset) / legendWidth) * 100 + "%";
                }
             })
             .attr("stop-color", (d) => d.color);
          
    legendSvg.append("rect")
              .attr("width", legendWidth)
              .attr("height", 14)
              .attr("transform", "translate("+ legendMargin.left +", 35)")
              .style("fill", "url(#gradientLegend)");
    
    let legendAxis = d3.axisBottom()
                        .scale(legendScale)
                        .ticks(5);
    
    legendSvg.append("text")
              .style("text-anchor", "middle")
              .attr("transform", "translate("+ legendDivWidth / 2 +", 25)")
              .text("Legend (% change)")
              .style("font-size", "1.2rem");
    
    legendSvg.append('g')
              .attr("transform", "translate("+ legendMargin.left +", 50)")
              .style("font-size", "1rem")
              .call(legendAxis);
  }

  checkPaint(){
    window.requestAnimationFrame(() => {
      if (document.getElementById("marketHeatmap") !== undefined){        
        this.createHeatmap(this.props.marketData);  
      }
    });
  }
  
  checkPageHeight(){
    //Because canvas is added after paint, page height may change, especially if flex wrap occurs
    //Need to redraw based on final parameters
    let body = document.body, 
        html = document.documentElement,
        pageHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        
    if (pageHeight - 50 >= 600) {
      document.getElementById("portfolio-container").style.height = pageHeight - 50 + "px";
    }
  }
  
  componentDidMount(){
    this.checkPaint();
  }
  
  componentDidUpdate(){
    this.checkPaint();
  }
  
  render(){
    let heatmapHolder = Object.assign({}, styles.heatmapHolder);

    if (window.innerWidth < 768) {
      heatmapHolder.width = "100%";
      heatmapHolder.display = "block";
    } else if (window.innerWidth < 1200) {
      heatmapHolder.width = "100%";
      heatmapHolder.display = "inline-block";
    } else if (window.innerWidth >= 1200) {
      heatmapHolder.width = "40%";
      heatmapHolder.display = "inline-block";
    }

    return (
      <div style={heatmapHolder} id="heat-map-container">
        <div style={styles.heatmapControl} id="heatmap-control-box">
          <p style={styles.heatmapTitle}>Market at a Glance:</p>
          <RangeButton id="1hr" text="1 hr" 
                        changeRange={this.changeRange} 
                        currentRange={this.state.range}/>
          <RangeButton id="24hrs" text="24 hrs" 
                        changeRange={this.changeRange} 
                        currentRange={this.state.range}/>
          <RangeButton id="7days" text="7 days" 
                        changeRange={this.changeRange} 
                        currentRange={this.state.range}/>              
          {this.props.marketData.length > 0 ? 
            <div style={styles.legendDiv} id="legend"/> :
            <p style={styles.plainText}>No data available.</p>}
          <div style={styles.tooltip} id="tooltip"/>
        </div>
        <div style={styles.heatmapContainer} id="marketHeatmap" />
      </div>
    );
  }
}