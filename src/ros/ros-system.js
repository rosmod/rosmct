/**
*  Ros-System uses roslib.js to connect to a rosbridge instance and provide telemetry.
* @module ros-system
*/
/* global require module */


var ROSLIB = require('roslib');
var Q = require('q');
var fs = require('fs');

/**
* Initialize a Ros-System to communicate with rosbrige on the specified url:port
* @param {string} rosbridgeurl the base url where rosbridge resides
* @param {string} rosbridgeprot the port number rosbridge is listening on
* @param {object} info identifier information about the ros system
* @param {string} info.name the ros system's name
* @param {string} info.key the ros system's id key
*/
function RosSystem(rosbridgeurl, rosbridgeport, info) {
    var self = this;
    
    self.rosbridgeurl = rosbridgeurl;
    self.rosbridgeport = rosbridgeport;
    self.info = info;
    
    let url = 'ws://' + rosbridgeurl + ':' + rosbridgeport;
    self.subscribers = [];
    self.listeners = [];
    
    self.connectRos(url)
        .then(function(){
            self.getDictionary();
        });
};

/**
* Calls all registered listener functions on a new telemetry point
* @param {object} point a telemetry point
* @param {string} point.id telemetry datum name
* @param {string} point.timestamp telemetry timestamp (epoch time)
* @param {object} point.data telemetry data
*/
RosSystem.prototype.notify = function (point) {
    var self = this;
    self.listeners.forEach(function (l) {
        l(point);
    });
};

/**
* Register a listener function to call upon receipt of new telemetry data
* @param {function} listener callback function for telemetry delivery
*/
RosSystem.prototype.listen = function (listener) {
    var self = this;
    self.listeners.push(listener);
    return function () {
        self.listeners = self.listeners.filter(function (l) {
            return l !== listener;
        });
    }.bind(self);
};

/**
* Establishes a connection to rosbridge via roslibjs
* @param {string} rosbridgeurl the concantenated url+port where rosbridge is located
*/
RosSystem.prototype.connectRos = function (rosbridgeurl){
    var self = this;
    var deferred = Q.defer();
    self.ros = new ROSLIB.Ros({
        url : rosbridgeurl
    });

    self.ros.on('connection', function() {
        console.log('Connected to rosbridge websocket server at ' + rosbridgeurl );
        deferred.resolve();
    });

    self.ros.on('error', function(error) {
        console.log('Error connecting to rosbridge websocket server at ' + rosbridgeurl +' : ', error);
        deferred.reject();
    });

    self.ros.on('close', function() {
        console.log('Connection to rosbridge websocket server at ' + rosbridgeurl + ' closed.');
    });
    return deferred.promise;
};

/**
* Parses message details json from rosbridge into the values objects expected by openmct
* @param {array} detail array of objects with fieldnames and field datatypes
* @returns {array} array of openmct value objects
*/
RosSystem.prototype.parseDetails = function(details) {
    var self = this;
    var parsed = [];

    var formatConversionMap = {
        "uint64": "int",
        "int64": "int",
        "uint32": "int",
        "int32": "int",
        "uint16": "int",
        "int16": "int",
        "uint8": "int",
        "int8": "int",

        "float32": "float",
        "float64": "float",

        "byte": "byte",
        "string": "string"
    };

    details.map(function(detail) {
        for (var i=0; i<detail.fieldtypes.length; i++) {
            var fieldtype = detail.fieldtypes[i];
            var name = detail.fieldnames[i];
            var converted = formatConversionMap[fieldtype];
            if (converted != undefined) {
                var value = {
                    key: name,
                    name: name,
                    units: "None",
                    format: converted,
                    hints: {
                        range: 1
                    }
                };
                parsed.push(value);
            }
        }
    });

    var timeval = {
        key: "utc",
        source: "timestamp",
        name: "Timestamp",
        format: "utc",
        hints: {
            domain: 1
        }
    };
    parsed.push(timeval);

    //console.log("PARSED DETAILS");
    //console.log(parsed);

    return parsed;
};

/**
* Generates an openMCT readable dictionary from rosbridge list of available topics
* @returns {object} openMCT telemetry dictionary 
*/
RosSystem.prototype.generateDictionary = function(){
    var self = this;
    self.topicsListMap = {};
    function getTopics() {
        var deferred = Q.defer();
        self.ros.getTopics(function(topics) {
            deferred.resolve(topics);
        });
        return deferred.promise;
    };

    let dict = {
        "name" : "Ros System",
        "key" : "rs",
        "topics" : []
    };
    
    return getTopics()
        .then(function(topics){
            //console.log("Got Topics " + topics);
            var tasks = topics.map(function(topic){
                var deferred = Q.defer();
                var topicEntry = {
                    "name" : topic,
                    "key" : topic,
                    "values" : []
                };
                self.ros.getTopicType(topic, function(type){
                    self.ros.getMessageDetails(type, function(details){
                        // return the details
                        //console.log(details);
                        deferred.resolve(details);
                    });
                });
                return deferred.promise
                    .then(function(details) {
                        // parse details
                        //console.log("GOT DETAILS:");
                        //console.log(details);
                        topicEntry.values = self.parseDetails(details);
                        //console.log(topicEntry.values);
                        return topicEntry;
                    });
            });
            return Q.all(tasks)
                .then(function(topicEntryArray) {
                    //console.log(topicEntryArray);
                    //console.log(process.cwd());
                    dict.topics = topicEntryArray;
                    fs.writeFileSync('rosDictionary.json', JSON.stringify(dict, null, 2) , 'utf-8');
                    return dict;
                });
        });
};

/**
* API to generate and retreive the Ros System's telemetry dictionary
* @returns {object} telemetry dictionary
*/
RosSystem.prototype.getDictionary = function(){
    var self = this;
    var deferred = Q.defer();
    //console.log('generating dictionary')
    self.generateDictionary()
        .then(function(dict){
            //console.log('dictionary generated!')
            self.dictionary = dict;
            self.updateSubscribers();
            deferred.resolve(dict);
        });
    return deferred.promise;
};

/**
* Registers subscribers to all avaialable ros topics via rosbridge
*/
RosSystem.prototype.updateSubscribers = function(){
    var self = this;
    self.subscribers = [];

    self.subscribers.push(new ROSLIB.Topic({
        ros: self.ros,
        name: '/listener',
        messageType: 'std_msgs/String'
    }));

    self.subscribers.forEach(function(s){
        console.log(s);
        s.subscribe(function(message){
            var timestamp = Date.now();
            var id = s.name;
            var state = {timestamp: timestamp, value: message.data, id: s.name};
            console.log(state);
            self.notify(state);
        });
    });







    
    /*
      self.subscriber.forEach(function(s){
      s.subscribe(function (message){
      console.log('Recevied message on ' + s.name + ': ' +  message.data);
      var timestamp = Date.now();
      var id = s.name;
      var state = { timestamp: timestamp, value: message.data, id: s.name};
      console.log(state);
      self.notify(state);
      });
      })*/
};



/** return constructor */
module.exports =  RosSystem
