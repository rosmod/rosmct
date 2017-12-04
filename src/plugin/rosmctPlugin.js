/**
 * Plugin to interface with a realtime server that is connecte to a set of ros systems
 * Provides ability to subscribe to ros topics 
 */
/* global define */
(function(def){
    def([
        "ws",
        "q"

    ], function(
        WebSocket,
        Q
    ){
        function RosmctPlugin(){
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
                telemetrysocket.onmessage = function (event) {
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
                };

                /**
                 * Send dictionary request when websocket opens
                 */
                telemetrysocket.onopen = function() {
                    telemetrysocket.send('dictionary');
                };

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
                        console.log('provider promise!', dictionary)
                        return dictionary.Systems.map(function(sys){
                            console.log('System: ', sys)
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
                                            var t =  {
                                                identifier: identifier,
                                                name: topic.name,
                                                type: 'ros.topic.telemetry',
                                                location: namespace + ':ros.system' 
                                            }
                                            console.log('returning topic', t)
                                            return t
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
                                    var deferred = Q.defer()
                                    console.log('In ' + sys.name + ' comp provider load')
                                    
                                    var children =  sys.topics.map(function(topic){
                                        return {
                                            namespace: namespace,
                                            key: topic.name
                                        }
                                    })
                                    deferred.resolve(children)
                                    var c = deferred.promise.then(function(a){console.log(a)})
                                    return deferred.promise
                                }
                            }

                            let providers = {
                                namespace: namespace,
                                objectProvider: systemObjectProvider,
                                compositionProvider: systemCompositionProvider
                            }
                            return providers
                        })
                    })
                }
                
/*
                var testObjectProvider = {
                    get: function(identifier){
                        console.log('In External System obj provider get')
                        return getDictionary().then(function (dictionary){
                            if(identifier.key == 'ros.system'){
                                return {
                                    identifier: identifier,
                                    name: 'External System',
                                    type: 'folder',
                                    location: 'rosmct:rsCollection'
                                }
                            } else { //only other option for now is it is a topic
                                let topic = dictionary.Systems["External System"].topics.filter(function(m){
                                    return m.name == identifier.key
                                })[0]
                                return {
                                    identifier: identifier,
                                    name: topic.name,
                                    type: 'ros.topic.telemetry',
                                    location: 'External System:ros.system' 
                                }
                            }
                            
                            
                        })
                    }
                }

                var testCompositionProvider = {
                    appliesTo: function(domainObject){
                        console.log('In External Sytem comp provider appliesTo')
                        return domainObject.identifier.namespace === 'External System' &&
                            domainObject.type === 'folder'
                    },
                    load: function(domainObject){
                        return getDictionary().then(function(dictionary){
                            return dictionary.Systems["External System"].topics.map(function(topic){
                                return {
                                    namespace: "External System",
                                    identifier: topic.name
                                }
                            })
                            
                        })
                    }
                }
*/


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

                /*
                openmct.objects.addProvider('External System', testObjectProvider);
                openmct.composition.addProvider(testCompositionProvider);
                 */

                
                
                //add system providers
                systemProviderFactory().then(function(sys){
                    
                    sys.map(function(providers){
                        console.log('Providers',providers)
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

        return RosmctPlugin
    });


}(
    // wrapper to run code everywhere
    // based on http://bit.ly/c7U4h5
    typeof require === 'undefined'?
        //Browser (regular script tag)
        function(deps, factory){
            this.rosmctPlugin = factory.apply(null, [WebSocket, Q])
        } :
    ((typeof exports === 'undefined')?
     //AMD
     function(deps, factory){
         define('rosmctPlugin', deps, factory);
     } :
     //CommonJS
     function(deps, factory){
         module.exports = factory.apply(this, deps.map(require));
     }
    )
));
