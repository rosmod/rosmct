/**
* Ros-System-Collection contains and interacts with multiple ros-systems 
* and provides an inteface for treating them as a single entity
* @module ros-system-collection
*/
/* global require module */

var RosSystem = require('./ros-system.js')
var Q = require('q');

/**
* Initialize an empty collection
* @constructor
*/
function RosSystemCollection () {
  var self = this
  self.systems = []
};

/**
* Registers a listener function to all systems curently in the collection
* @param {function} listener - listener function to register
* @return {array} array of unlisten functions
*/
RosSystemCollection.prototype.listen = function (listener) {
    var self = this
    
    var unlisteners = self.systems.map(function(sys) {
        return sys.listen(listener)
    })
    return function(){
        unlisteners.foreach(function(l){
            l()  
        })
    }
}

/**
* Returns the composite dictionary of all systems currently in the collection.
* All system dictionaries are contained as children of the root dict
* @returns {object} Composite dictionary of all ros systems
*/
RosSystemCollection.prototype.getDictionary = function () {
  var self = this
}

/**
* Creates and adds a new Ros-System to the collection
* @param {string} rosbridgeurl - the base url where rosbridge resides
* @param {string} rosbridgeport - the port number rosbridge is listening on
*/
RosSystemCollection.prototype.addSystem = function (rosbridgeurl, rosbridgeport) {
  var self = this

  let filteredSys = self.systems.filter(function (sys) {
    return sys.rosbridgeurl === rosbridgeurl && sys.rosbridgeport === rosbridgeport
  })

  if (typeof filteredSys === 'undefined' || filteredSys === null || filteredSys.length === 0) {
    self.systems.push(new RosSystem(rosbridgeurl, rosbridgeport))
  }
}

/**
* Remove a Ros-System on the specified url and port from the collection
* @param {string} rosbridgeurl - the base url where rosbridge resides
* @param {string} rosbridgeprot - the prot number rosbridge is listening on
*/
RosSystemCollection.prototype.removeSystem = function (rosbridgeurl, rosbridgeport) {
  var self = this

  self.systems = self.systems.filter(function (sys) {
    return sys.rosbridgeurl != rosbridgeurl && sys.rosbridgeport != rosbridgeport
  })
}

/** Create a new empty collection */
module.exports = function () {
  return new RosSystemCollection()
}
