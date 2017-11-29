/**
 *  Ros-System uses roslib.js to connect to a rosbridge instance and provide telemetry.
 * @module ros-system
 */
/* global require module */

var ROSLIB = require('roslib')
var Q = require('q')
var dictUtils = require('../utils/dictionaryUtils')

/**
 * Initialize a Ros-System to communicate with rosbrige on the specified url:port
 * @param {string} rosbridgeurl the base url where rosbridge resides
 * @param {string} rosbridgeprot the port number rosbridge is listening on
 * @param {object} info identifier information about the ros system
 * @param {string} info.name the ros system's name
 * @param {string} info.key the ros system's id key
 */
function RosSystem (rosbridgeurl, rosbridgeport, info) {
    var self = this

    self.rosbridgeurl = rosbridgeurl
    self.rosbridgeport = rosbridgeport
    self.info = info
    self.dictionaryPromise = Q.defer()

    let url = 'ws://' + rosbridgeurl + ':' + rosbridgeport
    self.subscribers = []
    self.listeners = []

    self.connectRos(url)
        .then(function () {
            self.generateDictionary()
        })
};

/**
 * Calls all registered listener functions on a new telemetry point
 * @param {object} point a telemetry point
 * @param {string} point.id telemetry datum name
 * @param {string} point.timestamp telemetry timestamp (epoch time)
 * @param {object} point.data telemetry data
 */
RosSystem.prototype.notify = function (point) {
    var self = this
    self.listeners.forEach(function (l) {
        l(point)
    })
}

/**
 * Register a listener function to call upon receipt of new telemetry data
 * @param {function} listener callback function for telemetry delivery
 */
RosSystem.prototype.listen = function (listener) {
    var self = this
    self.listeners.push(listener)
    return function () {
        self.listeners = self.listeners.filter(function (l) {
            return l !== listener
        })
    }
}

/**
 * Establishes a connection to rosbridge via roslibjs
 * @param {string} rosbridgeurl the concantenated url+port where rosbridge is located
 */
RosSystem.prototype.connectRos = function (rosbridgeurl) {
    var self = this
    var deferred = Q.defer()
    self.ros = new ROSLIB.Ros({
        url: rosbridgeurl
    })

    self.ros.on('connection', function () {
        console.log('Connected to rosbridge websocket server at ' + rosbridgeurl)
        deferred.resolve()
    })

    self.ros.on('error', function (error) {
        console.log('Error connecting to rosbridge websocket server at ' + rosbridgeurl + ' : ', error)
        deferred.reject()
    })

    self.ros.on('close', function () {
        console.log('Connection to rosbridge websocket server at ' + rosbridgeurl + ' closed.')
    })
    return deferred.promise
}

RosSystem.prototype.disconnectRos = function(){
    var self = this
    self.ros.close()
}

/**
 * Generates an openMCT readable dictionary from rosbridge list of available topics
 * @returns {object} openMCT telemetry dictionary
 */
RosSystem.prototype.generateDictionary = function () {
    var self = this
    self.topicsListMap = {}
    function getTopics () {
        var deferred = Q.defer()
        self.ros.getTopics(function (topics) {
            deferred.resolve(topics)
        })
        return deferred.promise
    };

    getTopics()
        .then(function (topics) {
            /*convert the topics object from
             {
             topics: [],
             types: []
             }
             
             to
             
             {
             topic1: type1,
             topic2: type2,
             ...
             topicN: typeN
             }
             */
            var tmp = {}
            for(let i = 0; i < topics.topics.length; i++){
                tmp[topics.topics[i]] = topics.types[i]
            }
            topics = tmp
            var topicEntries = Object.keys(topics).map(function (topic) {
                let deferred = Q.defer()
                self.ros.getMessageDetails(topics[topic], function (details) {
                    let topicInfo = {
                        name: topic,
                        type: topics[topic],
                        details: details
                    }
                    deferred.resolve(dictUtils.createDictEntry(topicInfo))
                })
                return deferred.promise
            })
            return Q.all(topicEntries)
        })
        .then(function (topicentries) {
            var info = self.info
            info.membersName = 'topics'
            self.dictionary = dictUtils.createDict(info, topicentries)
            self.dictionaryPromise.resolve(self.dictionary)
            self.updateSubscribers()
        })
}

/**
 * API to retreive the Ros System's telemetry dictionary
 * @returns {object} telemetry dictionary promise
 */
RosSystem.prototype.getDictionary = function () {
    var self = this
    return self.dictionaryPromise.promise
}

/**
 * Registers subscribers to all avaialable ros topics
 */
RosSystem.prototype.updateSubscribers = function () {
    var self = this
    self.subscribers = []
    
    self.dictionary.topics.forEach(function (topic) {
        let s = new ROSLIB.Topic({
            ros: self.ros,
            name: topic.name,
            messageType: topic.key
        })

        /**
         * Define the method of parsing subscriber message into key:value pairs
         */
        s.parse = function(message){
            let values = {}
            topic.values.forEach(function(val){
                if(val.name != 'Timestamp'){
                    var path = val.name.split('.')
                    console.log('path: ', path)
                    var tmp = message
                    for(let i = 0; i < path.length; i++){
                        tmp = tmp[path[i]]
                    }
                    values[path] = tmp
                }
                /*if(typeof message[val.name] != 'Object'){
                    values[val.name] = message[val.name]
                } else {
                    values[val.name] = s.parse(message[val.name]);
                }*/
            })
            return values
        }

        //subscribe to each topic
        s.subscribe(function (message) {
            var timestamp = Date.now()
            var state = {timestamp: timestamp, value: s.parse(message), id: s.name}
            self.notify(state)
        })        
        self.subscribers.push(s)
    })
}

/** return constructor */
module.exports = RosSystem
