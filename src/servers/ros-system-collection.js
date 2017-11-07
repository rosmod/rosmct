var RosSystem = require('./ros-system.js');

function RosSystemCollection() {
    var self = this;
    self.systems = [];
};

RosSystemCollection.prototype.listen = function(listener){
    var self = this;
    
};

RosSystemCollection.prototype.getDictionary = function(){
    var self = this;
    
};

RosSystemCollection.prototype.addSystem = function(rosbridgeurl, rosbridgeport){
    var self = this;

    let filteredSys = self.systems.filter(function(sys){
        return sys.rosbridgeurl === rosbridgeurl && sys.rosbridgeport === rosbridgeport;
    });
    
    if(typeof filteredSys === "undefined" || filteredSys === null || filteredSys.length === 0){
        self.systems.push(new RosSystem(rosbridgeurl, rosbridgeport));
    } 

    
};

RosSystemCollection.prototype.removeSystem = function(rosbridgeurl, rosbridgeport){
    var self = this;

    self.systems = self.systems.filter(function(sys){
        return sys.rosbridgeurl != rosbridgeurl && sys.rosbridgeport != rosbridgeport;  
    });
};

module.exports = function(){
    return new RosSystemCollection;  
};
