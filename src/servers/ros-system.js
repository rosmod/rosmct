/**
 *  Ros-System uses roslib.js to connect to a rosbridge instance and provide telemetry.
 * @module ros-system
 */
/* global require module */


var ROSLIB = require('roslib');
var Q = require('q');
var fs = require('fs');
var dictUtils = require('../utils/dictionaryUtils');

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

    return getTopics()
        .then(function(topics){
            var topicEntries = topics.map(function(topic){
                let deferred = Q.defer()
                let topicInfo = {name: topic}
                self.ros.getTopicType(topicInfo.name, function(type){
                    self.ros.getMessageDetails(type, function(details){
                        topicInfo.details = details
                        deferred.resolve(dictUtils.createDictEntry(topicInfo))
                    })
                })
                return deferred.promise()
            })
            return Q.all(topicEntries)  
        })
        .then(function(topicentries){
            dictUtils.createDict(self.info,topicentries)
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
