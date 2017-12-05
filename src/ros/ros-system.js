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

    self.subscribers = []
    self.listeners = []
};

/**
 * Calls all registered listener functions on a new telemetry point
 * @param {object} point a telemetry point
 * @param {string} point.id telemetry datum name
 * @param {string} point.timestamp telemetry timestamp (epoch time)
 * @param {object} point.data telemetry data
 */
RosSystem.prototype.notify = function (topic) {
    var self = this
    self.listeners.forEach(function (l) {
        l(topic)
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
RosSystem.prototype.connectRos = function () {
    var self = this
    var deferred = Q.defer()

    var rosbridgeurl = 'ws://' + self.rosbridgeurl + ':' + self.rosbridgeport

    self.ros = new ROSLIB.Ros({
        url: rosbridgeurl
    })

    self.ros.on('connection', function () {
        deferred.resolve()
    })

    self.ros.on('error', function (error) {
        console.log('Roslib connection error', error)
        deferred.reject()
    })

    self.ros.on('close', function () {
    })
    return deferred.promise
        .then(function() {
            self.generateDictionary();
        });
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
                    var tmp = message
                    for(let i = 0; i < path.length; i++){
                        tmp = tmp[path[i]]
                    }
                    values[val.name] = tmp
                }
            })
            return values
        }

        //subscribe to each topic
        s.subscribe(function (message) {
            var timestamp = Date.now()
            var state = {
                timestamp: timestamp,
                value: s.parse(message),
//                system: self.info.name,
                id: self.info.name + s.name
            }
            console.log('Notifying topic: ', state)
            self.notify(state)
        })        
        self.subscribers.push(s)
    })
}

/** return constructor */
module.exports = RosSystem
