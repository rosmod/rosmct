/**
* Realtime ROS telemetry server
* @module realtime-server
*/
/* global require,module */

var express = require('express');
var RosSystemCollection = require('../ros/ros-system-collection');
var { Client } = require("pg")

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

    const client = new Client({
        database: "qdb",
        host: "127.0.0.1",
        password: "quest",
        port: 8812,
        user: "admin",
    })

    client.connect()

    client.on('error', (err) => {
        console.error('something bad has happened!', err.stack)
    })

    client.on('end', () => {client.connect()}) // do it again

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
                client.query("SELECT dictionary FROM dictionaries").then((res) => {
                    if (res.rowCount > 0) {
                        ws.send(JSON.stringify({
                            type: "dictionary",
                            value: JSON.parse(res.rows[0].dictionary)
                        }))
                    }
                    rossystems.getDictionary()
                        .then(function(dict){
                            if (dict.Systems == []) return
                            if (res.rowCount > 0) {
                                client.query("UPDATE dictionaries SET dictionary = '" + JSON.stringify(dict) + "'").then(() => client.query("COMMIT"))
			    }else {
                                client.query("INSERT INTO dictionaries (dictionary) VALUES ('" + JSON.stringify(dict) + "')").then(() => client.query("COMMIT"))
                                ws.send(JSON.stringify({
                                    type: "dictionary",
                                    value: dict
                                }));
                             }
                        });
                })
            },
            /**
             * Returns historical telemetry values
             */
            request: function(options) {
                options = options.split(' ')
                client.query("SELECT to_timezone(ts, '" + Intl.DateTimeFormat().resolvedOptions().timeZone + "') AS ts, id, data FROM " + options[0].split('.')[0] + " WHERE id = '" + options[0] + "' AND ts > " + Math.round(parseFloat(options[1])*1000).toString() + " AND ts < " + Math.round(parseFloat(options[2])*1000).toString()).then((res) => {
                    ws.send(JSON.stringify({
                        type: "history",
                        value: res.rows
                    }))
                })
            },

            OPEN: function(msg) {
                msg = JSON.parse(msg)
                rossystems.addSystem(msg.rosbridgeurl, msg.rosbridgeport, {
                    name: msg.name,
                    key: 'ros.system'
                }).then(() => {
                    unlisten = rossystems.listen(notifySubscribers)
                })
            },

            CLOSE: function(msg) {
                msg = JSON.parse(msg)
                rossystems.removeSystem(msg.rosbridgeurl, msg.rosbridgeport)
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
            client.query("INSERT INTO "+point.id.split('.')[0]+"(ts, id, data) VALUES ($1, $2, $3);", [point.timestamp.toString() + "000", point.id, JSON.stringify(point)]).then(() => client.query("COMMIT"))

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
