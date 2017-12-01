/**
* Plugin to interface with a realtime server that is connecte to a set of ros systems
* Provides ability to subscribe to ros topics 
*/
/* global define */
define([
    "ws",
    "q"

], function(
    WebSocket,
    Q
){
    return function(){
        return function install(openmct){

            // set up dictionary

            var deferredDictionary = Q.defer()

            /**
             * Handles local dictionary requests
             * @returns {object} dictionary promise 
             */
            function getDictionary(){
                return deferredDictionary.promise
            }

            // set up websocket and telemetry handling
            
            /**
             * Telemetry websocket to realtime server
             */
            var telemetrysocket = new WebSocket(location.origin.replace(/^http/, 'ws') + '/realtime/')

            /**
             * Call back functions for telemetry points
             */
            var listener = {}

            /**
             * Handlers for telemetry mesages
             */
            var handlers = { 
                dictionary: function(dict) { /**< Resolves dictionary promise upon receipt of dictionary*/
                    deferredDictionary.resolve(dict);
                },
                point: function(point) { /**< Calls listener callup upon receipt of telemetry point*/
                    if (listener[point.id]) {
                        listener[point.id](point);
                    }

                }
            }

            /**
             * Handle receipt of message on telemetry socket
             * @param {string} message websocket message
             */
            telemetrysocket.on('message' = function (event) {
                var message = JSON.parse(event.data);
                console.log('Received telemetry message of type: ' + message.type);
                console.log('Message contents: ');
                console.log(message.value);

                if(message.type){
                    var handler = handlers[message.type];
                    if(handler){
                        handler(message.value);
                    }
                }
            })

            /**
             * Send dictionary request when websocket opens
             */
            telemetrysocket.on('open', function() {
                telemetrysocket.send('dictionary');
            })

            // define object providers

            /**
             * Object Provider
             */
            var objectProvider = {

                /**
                 * constructs domain object
                 * @param {object} identifier 
                 * @param {object} identifier.namespace 
                 * @param {object} identifier.key 
                 */
                get: function (identifier) {
                    console.log("Identifier: " + identifier);
                    // for root
                    // identifier.namespace = 'rsCollection'
                    // identifier.key = dictionary name
                    // for system
                    // identifier.namespace = 'rsCollection'
                    // identifier.key = system name
                    // for topic
                    // identifier.namespace = 'topic'
                    // identifier.key = topic name
                    return getDictionary().then(function (dictionary) {
                       // console.log("object provider's dictionary");
                        //console.log(dictionary);
                        if (identifier.key === 'rsCollection') {
                            return {
                                identifier: identifier,
                                name: dictionary.name,
                                type: 'folder',
                                location: 'ROOT'
                            };
                        } else if (identifier.key === 'rs') {
                            let sys = dictionary.Systems.filter(function(s){
                                return identifier.namespace === s.name
                            })[0]
                            return {
                                identifier: identifier,
                                name: sys.name,
                                type: 'folder',
                                location: 'rosmct:rsCollection'
                            }
                        } else {
                            let sys = dictionary.Systems.filter(function(s){
                                return identifier.namespace === s.name
                            })[0]
                            console.log('identifier sys:', sys)
                            var topic = dictionary.Systems[sys].topics.filter(function (m) {
                                return m.name === identifier.name;
                            });
                            console.log("Topic: " + topic)
                            return {
                                identifier: identifier,
                                name: topic.name,
                                type: 'ros.telemetry',
                                telemetry: {
                                    values: topic.values
                                },
                                location: identifier.namespace + ":" + 'rs'
                            };
                        }
                    });
                }
                
            }

            var rsCollectionObjectProvider = {
                
            }

            var rsObjectProvider = {
                
            }

            var topicObjectProvider = {
                
            }

            /**
             * Composition Provider
             */
            var compositionProvider = {
                appliesTo: function (domainObject) {
                    return (domainObject.identifier.key === 'rsCollection' ||
                            domainObject.identifier.key == 'rs') &&
                        domainObject.type === 'folder';
                },
                load: function (domainObject) {
                    return getDictionary()
                        .then(function (dictionary) {
                            if(domainObject.identifier.key === 'rsCollection'){
                                return dictionary.Systems.map(function(s){
                                    return {
                                        namespace: s.name,
                                        key: 'rs'
                                    }
                                })
                            } else {
                                return dictionary.Systems.filter(function(s){
                                    return s.name === domainObject.identifier.namespace
                                })[0].topics.map(function(topic){
                                    return {
                                        namespace: domainObject.identifier.namespace,
                                        key: topic.name
                                    }
                                })
                            }
                        })
                }
            }

            var rsCollectionCompositionProvider = {
                
            }

            var rsCompositionProvider = {
                
            }
        


            /**
             * Telemetry Provider
             */
            var telemetryProvider = {}

            // install all providers into openmct object

            openmct.objects.addRoot({
                namespace: 'rosmct',
                key: 'rsCollection'
            })

            openmct.objects.addProvider('rsCollection',rsCollectionObjectProvier);
            openmct.objects.addProvider('rs', rsObjectProvider);
            openmct.objects.addProvider('topic', topicObjectProvider);

            openmct.composition.addProvider(rsCollectionCompositionProvider);
            openmct.composition.addProvider(rsCompositionProvider);

            openmct.types.addType('ros.telemetry', {
                name: 'Ros Telemetry Point',
                description: 'Ros telemetry provided by roslib/bridge',
                cssClass: 'icon-telemetry'
            })

            //openmct.telemetry.addProvider(telemetryProvider)

            

            

            

        };
    };
});
