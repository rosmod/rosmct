var express = require('express');
var RosSystemCollection = require('./ros-system-collection');

function RealtimeServer() {

    var router = express.Router();
    var rossystems = new RosSystemCollection;
    

    router.ws('/', function (ws) {
        var unlisten = rossystems.listen(notifySubscribers);
        var subscribed = {}; // Active subscriptions for this connection
        var handlers = { // Handlers for specific requests
            subscribe: function (id) {
                console.log("Subsribe Handler for: ", id);
                subscribed[id] = true;
            },
            unsubscribe: function (id) {
                console.log("Unsubscribe Handler for: ", id);
                delete subscribed[id];
            },
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

        function notifySubscribers(point) {
            if (subscribed[point.id]) {
                ws.send(JSON.stringify({
                    type: "point",
                    value: point
                }));
            }
        }

        // Listen for requests
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