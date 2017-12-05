/**
* Realtime ROS telemetry server
* @module realtime-server
*/
/* global require,module */

var express = require('express');
var RosSystemCollection = require('../ros/ros-system-collection');

/**
* Sets up handling of web socket connections
* @returns {object} router with web socket configuration
*/
function RealtimeServer() {

    var router = express.Router();
    var rossystems = new RosSystemCollection({
        name: "Ros Systems",
        key: "rsCollection"
    });

    /**
     * Rosbridge notification websocket setup
     * @param {object} ws websocket
     */
    router.ws('/notify', function(ws){
        
        ws.on('message', function(message){
            console.log('Notification Message: ', JSON.stringify(message, null, 2))
            var msg = JSON.parse(message);
            if(msg.status === 'OPEN'){
                rossystems.addSystem(msg.rosbridgeurl, msg.rosbridgeport, {
                    name: msg.name,
                    key: 'ros.system'
                })
            } else if (msg.status === 'CLOSE'){
                rossystems.removeSystem(msg.rosbridgeurl, msg.rosbridgeport)
            }
        })
    })
    
    /**
     * Client websocket setup
     * @param {object} ws websocket
     */
    router.ws('/', function (ws) {
        var unlisten = rossystems.listen(notifySubscribers);

        // Active subscriptions for this connection
        var subscribed = {}; 

        // Handlers for specific requests
        var handlers = { 
            /**
             * subscribe handler
             * @param {string} id telemetry datum id
             */
            subscribe: function (id) {
                subscribed[id] = true;
            },
            /**
             * unsubscrib handler
             * @param {string} id telemetry datum id
             */
            unsubscribe: function (id) {
                delete subscribed[id];
            },
            /**
             * Dictionary request handler.
             * Sends dictionary request over websocket
             */
            dictionary: function() {
                rossystems.getDictionary()
                    .then(function(dict){
                        ws.send(JSON.stringify({
                            type: "dictionary",
                            value: dict
                        }));
                    });
            }
                       
        };

        /**
         * Callback function to pass to ros-system collection
         * for listener registration
         * @param {object} topic a telemetry point
         * @param {string} topic.id telemetry datum name
         * @param {string} topic.timestamp telemetry timestamp (epoch time)
         * @param {object} topic.data telemetry data
         */
        function notifySubscribers(point) {
            if (subscribed[point.id]) {

                ws.send(JSON.stringify({
                    type: "point",
                    value: point
                }));
            }
        }

        //Assign a callback for execution on incoming message
        ws.on('message', function (message) {
            console.log('Received message: ', message)
            var parts = message.split(' '),
                handler = handlers[parts[0]];
            if (handler) {
                parts = parts.slice(1)
                if(parts.length >1){
                    parts = [parts.join(' ')]

                }
                handler.apply(handlers, parts);
            }
        });

        // Stop sending telemetry updates for this connection when closed
        ws.on('close', unlisten);
    });
    

    return router;
};

module.exports = RealtimeServer;
