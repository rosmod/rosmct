/**
* Realtime ROS telemetry server
* @module realtime-server
*/
/* global require,module */

var express = require('express');
var RosSystemCollection = require('./ros-system-collection');

/**
* Sets up handling of web socket connections
* @returns {object} router with web socket configuration
*/
function RealtimeServer() {

    var router = express.Router();
    var rossystems = new RosSystemCollection;
    
    /**
     * Web socket setup
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
                console.log("Subsribe Handler for: ", id);
                subscribed[id] = true;
            },
            /**
             * unsubscrib handler
             * @param {string} id telemetry datum id
             */
            unsubscribe: function (id) {
                console.log("Unsubscribe Handler for: ", id);
                delete subscribed[id];
            },
            /**
             * Dictionary request handler.
             * Sends dictionary request over websocket
             */
            dictionary: function() {
                //console.log('Got dictionary request');
                rossystems.getDictionary()
                    .then(function(dict){
                        //console.log('Sending dictionary over websocket');
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
         * @param {object} point a telemetry point
         * @param {string} point.id telemetry datum name
         * @param {string} point.timestamp telemetry timestamp (epoch time)
         * @param {object} point.data telemetry data
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
            var parts = message.split(' '),
                handler = handlers[parts[0]];
            if (handler) {
                handler.apply(handlers, parts.slice(1));
            }
        });

        // Stop sending telemetry updates for this connection when closed
        ws.on('close', unlisten);
    });
    

    return router;
};

module.exports = RealtimeServer;
