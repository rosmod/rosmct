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

            // for root
            // identifier.namespace = 'rosmct'
            // identifier.key = 'rsCollection'
            // for system
            // identifier.namespace = system name
            // identifier.key = 'ros.system'
            // for topic
            // identifier.namespace = system name
            // identifier.key = topic name

            /**
             * rosmct Object Provider
             */
            var rosmctObjectProvider = {

                /**
                 * constructs objects in the rosmct namespace
                 * @param {object} identifier
                 * @param {object} identifier.namespace
                 * @param {object} identifier.key
                 */
                get: function(identifier){
                    console.log('Identifier: ', identifier);

                    return getDictionary().then(function(dictionary){
                        if (identifier.key === 'rsCollection'){
                            return {
                                identifier: identifier,
                                name: dictionary.name,
                                type: 'folder',
                                location: 'Root'
                            }
                        } else {
                            return {
                                identifier: identifier,
                                name: 'Unknown',
                                type: 'folder',
                                location: 'Root'
                            }
                        }
                    })
                }
            }

            /**
             * rosmct Composition Provider
             */
            var rosmctCompositionProvider = {
                appliesTo: function (domainObject) {
                    return domainObject.identifier.namespace == 'rosmct'  &&
                                      domainObject.type === 'folder'
                },
                load: function (domainObject) {
                    return getDictionary()
                        .then(function (dictionary) {
                            return dictionary.Systems.map(function(sys){
                                return {
                                    namespace: sys.name,
                                    key: 'ros.system'
                                }
                            })
                        })
                }
            }


            /**
             * Factory that generates object and composiition providers for each system within rosmct
             * @returns {Array} array of objects containing object provider and composition provider
             */
            function systemProviderFactory(){
                return getDictionary().then(function(dictionary){
                    dictionary.Systems.map(function(sys){
                        let namespace = sys.name
                        
                        let systemObjectProvider = {
                            /**
                             * constructs objects in the 'system name' namespace
                             * @param {object} identifier
                             * @param {object} identifier.namespace
                             * @param {object} identifier.key
                             */
                            get: function(identifier){
                                return getDictionary().then(function (dictionary){
                                    if(identifier.key == 'ros.system'){
                                        return {
                                            identifier: identifier,
                                            name: sys.name,
                                            type: 'folder',
                                            location: 'rosmct:rsCollection'
                                        }
                                    } else { //only other option for now is it is a topic
                                        let topic = sys.topics.filter(function(m){
                                            return m.name == identifier.key
                                        })[0]
                                        return {
                                            identifier: identifier,
                                            name: topic.name,
                                            type: 'ros.topic.telemetry',
                                            location: namespace + ':ros.system' 
                                        }
                                    }
                                    
                                    
                                })

                            }
                        }

                        /**
                         * composition provider for a ros system
                         */
                        let systemCompositionProvider = {
                            appliesTo: function(domainObject){
                                return domainObject.identifier.namespace === namespace &&
                                    domainObject.type === 'folder'
                            },
                            load: function(domainObject){
                                return sys.topics.map(function(topic){
                                    return {
                                        namespace: namespace,
                                        identifier: topic.name
                                    }
                                })
                            }
                        }

                        return {
                            namespace: namespace,
                            objectProvider: systemObjectProvider,
                            compositionProvider: systemCompositionProvider
                        }
                    })
                })
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

            //add rosmct proviers
            openmct.objects.addProvider('rosmct', rosmctObjectProvider);
            openmct.composition.addProvider(rosmctCompositionProvider);

            //add system providers
            systemProviderFactory().then(function(systems){
                systems.map(function(providers){
                    openmct.objects.addProvider(providers.namespace, providers.objectProvider)
                    openmct.composition.addProvider(providers.compositionProvider)
                })
            })

            openmct.types.addType('ros.topic.telemetry', {
                name: 'Ros Topic Telemetry Point',
                description: 'Ros topic telemetry provided by roslib/bridge',
                cssClass: 'icon-telemetry'
            })

            //openmct.telemetry.addProvider(telemetryProvider)

            

            

            

        };
    };
});
