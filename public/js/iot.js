

function Iot(){
  this.xmlHttp = new XMLHttpRequest();
  this.sensors = [];
  this.tempSensors = [];
  this.default = "inspect";
  this.inspectView = null;
  this.tableView = null;
  this.graphView = null;
  this.reView = null;
  this.selectedNode = null;
  this.currentView = null;
  var instance = this;

  this.initialize = function(){
    //hides all the views before initializing
    this.hideAllViews();


    //Load all the sensor names
    this.xmlHttp.open('GET',"http://pi:8086/db/Iot/series?u=root&p=root&q=list series",false);
    this.xmlHttp.send(null);
    var data = this.xmlHttp.responseText;
    data = data.substring(1,data.length-1);// removes outer brackets preventing parsing

    //need to get a json handle on data
    jData = JSON.parse(data);
    var length = jData.points.length;
    for(var i = 0; i<length; i++){
      this.sensors.push(jData.points[i][1]);

      if (/Temperature/.test(this.sensors[i])){ // Check whether it is a temperature sensor or motion sensor
        this.tempSensors.push(jData.points[i][1]);
      }

    }


    //Loads the default view given by this.default
    this.loadDefault();

    //Setup Navbar to load different views
    var instance = this;
    $('.navbutton').click(function(event){
      instance.loadView($(this).attr('id'));
    });




  };

  this.hideAllViews = function(){
    $('.sense-view').hide("fast");
  };
  this.loadDefault = function(){
    this.loadView(this.default);
  };

  //Pass a string to viewType to setup a certain type of view
  this.loadView = function(viewType){
    $('#data-list').unbind();
    switch(viewType){
      case "inspect":
        this.loadInspect();
        break;
      case "table":
        this.loadTable();
        break;
      case "graph":
        this.loadGraph();
        break;
      case "review":
        this.loadReview();
        break;
    }

  };

  this.loadInspect = function(){
    //var instance = this;
    if (this.currentView == "inspect"){
      return;
    }
    this.hideAllViews();
    $('#inspect-view').show(function(){
    if (instance.selectedNode === null){
      instance.selectedNode = instance.tempSensors[0];
      instance.updateInspectView(instance.tempSensors[0]);
    }
    else{
      instance.updateInspectView(instance.selectedNode);
    }
    instance.currentView = "inspect";
    });
    $('#data-list').on('click','.sensor',function(event){
        instance.selectedNode = event.target.dataset.name;
        instance.updateInspectView(event.target.dataset.name);
    });


  };

  this.updateInspectView = function(sensorName){

    var startData = instance.getPoint("value",sensorName);
    var temperature = startData.points[0][2];
    var tempTime =  startData.points[0][0];
    var sensorNumber = sensorName.match(/(\d+)/)[0];
    var motionData = instance.getPoint("value","Motion"+sensorNumber);
    var status = motionData.points[0][2];
    var statusTime = motionData.points[0][0];
    var batteryData = instance.getPoint("value","Battery"+sensorNumber);
    var batteryAmount = batteryData.points[0][2];
    var batteryTime = batteryData.points[0][0];
    var mostRecent = Math.max(parseFloat(tempTime),parseFloat(statusTime),parseFloat(batteryTime));
    var updateTime = new Date(mostRecent);
    updateTime = updateTime.toString();

    $('#name').text("Sensor: "+sensorName);
    $('#temp').text(temperature+"°C");
    if(status === 0){

      $('#status').text("Status: Clear");
    }
    else{
      $('#status').text("Status: Object Detected.");
    }
    $('#battery').text("Battery:"+batteryAmount+"%");
    $('#updated').text("Last Updated: "+updateTime);
  };

  this.loadTable = function(){
    if (this.currentView == "table"){
      return;
    }
    this.hideAllViews();
    $('#table-view').show(function(){

    });
    this.currentView = "table";


  };

  this.loadGraph = function(){
    if (this.currentView == "graph"){
      return;
    }

    $('#data-list').on('click','.sensor',function(event){
        instance.selectedNode = event.target.dataset.name;
        instance.renderGraph();
    });
    this.hideAllViews();
    $('#graph-view').show(function(){
      instance.renderGraph();

    });
    this.currentView = "graph";



  };
  this.renderGraph = function(){
    var tempChart = new CanvasJS.Chart("temp-graph-container",
    {
      title:{
        text: instance.selectedNode
    },
    axisX:{
        title: "timeline",
        gridThickness: 2
    },
    axisY: {
        title: "Temperature (°C)"
    },
    zoomEnabled: true,
    data: [
    {
        type: "area",
        dataPoints: instance.formatGraphData(instance.getData("value",instance.selectedNode))


    }
    ]
});
tempChart.render();
tempChart = {};
var motionChart = new CanvasJS.Chart("motion-graph-container",
{
  title:{
    text: "Motion"+instance.getSensorNumber(instance.selectedNode)
},
axisX:{
    title: "timeline",
    gridThickness: 2
},
zoomEnabled: true, 
axisY: {
    title: "Motion Detected"
},
data: [
{
    type: "scatter",
    dataPoints: instance.formatGraphData(instance.getData("value","Motion"+instance.getSensorNumber(instance.selectedNode)))


}
]
});



    motionChart.render();
    motionChart = {};
  };
  this.getSensorNumber = function(sensor){
    return sensor.match(/(\d+)/)[0];
  };

  this.formatGraphData = function(data){
    var length = data.length;
    var graphData = [];
    for(var i = 0; i<length; i++){
      graphData.push({x:new Date(data[i][0]),y:data[i][2] });
    }
    return graphData;
  };
  this.loadReview = function(){
    if (this.currentView == "review"){
      return;
    }
    this.hideAllViews();
    $('#review-view').show(function(){

  });
  this.currentView = "review";


  };


  this.generateSensorList = function(){
    var length = this.sensors.length;
    for (var i = 0; i<length; i++){
      if(/Temperature/.test(this.sensors[i])){
        $('#data-list').append('<a class = "list-group-item sensor" data-name="'+this.sensors[i]+'">'+this.sensors[i]+'</a>');
     }
    }
  };

  this.getPoint = function(fieldName,seriesName){
    this.xmlHttp.open('GET',"http://pi:8086/db/Iot/series?u=root&p=root&q=select "+fieldName+" from "+seriesName,false);
    this.xmlHttp.send(null);
    var data = this.xmlHttp.responseText;
    data = data.substring(1,data.length-1);// removes outer brackets preventing parsing
    //need to get a json handle on data
    jData = JSON.parse(data);
    return jData;
  };
  this.getData = function(fieldName,seriesName){
    var jdata = this.getPoint(fieldName,seriesName);
    var length = jdata.points.length;
    var data = [];
    for(var i = 0; i<length;i++){
      data.push(jdata.points[i]);

    }
    return data;
  };
}
iot = new Iot();
iot.initialize();
iot.generateSensorList();
