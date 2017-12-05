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
                    topic: function(topic) { /**< Calls listener callback for each topic value  upon receipt of topic telemetry*/
                        topic.value.map(function(val){
                            var key = topic.id + '.' + val.name
                            if(listener[key]){
                                var point = {
                                    timestamp: topic.timestamp,
                                    value: val,
                                    id: key
                                }
                                listener[key](point)
                            }
                        })
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
                // for topics
                // identifier.namespace = system name
                // identifier.key = topic name
                // for topic values
                // identifier.namespace = system name
                // identifier.key = topic name + '.' + value name

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

                        return getDictionary().then(function(dictionary){
                            if (identifier.key === 'rsCollection'){
                                return {
                                    identifier: identifier,
                                    name: dictionary.name,
                                    type: 'folder',
                                    location: 'ROOT'
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
                 * Factory that generates object and composiition
                 * providers for each system within rosmct @returns
                 * {Array} array of objects containing object provider
                 * and composition provider
                 */
                function systemProviderFactory(){
                    return getDictionary().then(function(dictionary){
                        return dictionary.Systems.map(function(sys){
                            let namespace = sys.name

                            
                            /**
                             * constructs objects in the 'system name' namespace
                             * @param {object} identifier
                             * @param {object} identifier.namespace
                             * @param {object} identifier.key
                             */
                            /*let systemObjectProvider = {
                             get: function(identifier){
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
                             type: 'folder',
                             location: namespace + ':ros.system' 
                             }
                             console.log('returning topic', t)
                             return t
                             }
                             }
                             }*/
                            
                            /**
                             * constructs objects in the 'system name' namespace
                             * @param {object} identifier
                             * @param {object} identifier.namespace
                             * @param {object} identifier.key
                             */
                            let systemObjectProvider = {
                                get: function(identifier){
                                    //console.log(identifier)
                                    var deferred = Q.defer()
                                    if(identifier.key === 'ros.system'){
                                        deferred.resolve({
                                            identifier: identifier,
                                            name: sys.name,
                                            type: 'folder',
                                            location: 'rosmct:rsCollection'
                                        })
                                    } else if(sys.topics.filter(function(topic){
                                        return identifier.key === topic.name
                                    }).length){
                                        var topic = sys.topics.filter(function(m){
                                            return m.name == identifier.key
                                        })[0]
                                        var t =  {
                                            identifier: identifier,
                                            name: topic.name,
                                            type: 'folder',
                                            location: namespace + ':ros.system' 
                                        }
                                        deferred.resolve(t)
                                    } else{ //must be a topic value at this point
                                        
                                        var topicName = ''
                                        var topicValue = sys.topics.map(function(topic){
                                            var val = topic.values.filter(function(value) {
                                                return identifier.key === topic.name + '.' + value.name
                                            })
                                            if(val.length){
                                                topicName = topic.name
                                                return val[0]
                                            }
                                        }).filter(function(v){
                                            return v != null 
                                        })
                                        topicValue = topicValue[0]
                                        var v = {
                                            identifier: identifier,
                                            name: topicValue.name,
                                            type: 'ros.topic.telemetry',
                                            parent: topicName,
                                            location: namespace + ':' + topicName,
                                            telemetry: {
                                                values: topicValue
                                            }
                                        }
                                        deferred.resolve(v)
                                    }
                                    return deferred.promise
                                }
                            }

                            /**
                             * composition provider for a ros system
                             * @param {object} domainObject
                             * @param {object} domainObject.identifier
                             * A composite key that provides a
                             * universally unique identifier for this
                             * object. The namespace and key are used
                             * to identify the object. The key must be
                             * unique within the namespace.
                             * @param {object} domainObject.name
                             * @param {object} domainObject.type All
                             * objects in Open MCT have a type. Types
                             * allow you to form an ontology of
                             * knowledge and provide an abstraction
                             * for grouping, visualizing, and
                             * interpreting data.
                             */
                            let systemCompositionProvider = {
                                appliesTo: function(domainObject){
                                    return domainObject.identifier.namespace === namespace &&
                                        domainObject.identifier.key === 'ros.system'
                                },
                                load: function(domainObject){
                                    var deferred = Q.defer()
                                    var children =  sys.topics.map(function(topic){
                                        return {
                                            namespace: namespace,
                                            key: topic.name
                                        }
                                    })
                                    deferred.resolve(children)
                                    return deferred.promise
                                }
                            }

                            /**
                             * composition provider for topic values
                             * @param {object} domainObject
                             * @param {object} domainObject.identifier
                             * A composite key that provides a
                             * universally unique identifier for this
                             * object. The namespace and key are used
                             * to identify the object. The key must be
                             * unique within the namespace.
                             * @param {object} domainObject.name
                             * @param {object} domainObject.type All
                             * objects in Open MCT have a type. Types
                             * allow you to form an ontology of
                             * knowledge and provide an abstraction
                             * for grouping, visualizing, and
                             * interpreting data.
                             */
                            let topicCompositionProvider = {
                                appliesTo: function(domainObject){
                                    return domainObject.identifier.namespace === namespace &&
                                        sys.topics.filter(function(topic) {
                                            return domainObject.identifier.key === topic.name
                                        }).length > 0
                                },
                                load: function(domainObject){
                                    var deferred = Q.defer()
                                    var topic = sys.topics.filter(function(topic){
                                        return domainObject.identifier.key === topic.name
                                    })[0]
                                    var children =  topic.values.map(function(val){
                                        return {
                                            namespace: namespace,
                                            key: topic.name + '.'+ val.name
                                        }
                                    })
                                    deferred.resolve(children)
                                    return deferred.promise
                                }
                            }

                            /**
                             * Telemetry Provider
                             */
                            let telemetryProvider = {
                                supportsSubscribe: function(domainObject){
                                    console.log('supportSubscribe called for: ', domainObject)
                                    console.log('supports? : ', domainObject.type === 'ros.topic.telemetry' && domainObject.identifier.namespace === namespace)
                                    return domainObject.type === 'ros.topic.telemetry' && domainObject.identifier.namespace === namespace
                                },
                                subscribe: function(domainObject, callback){
                                    console.log('Subscrbie called for: ', domainObject)
                                    var key = domainObject.identifier.namespace + '.' + domainObject.identifier.key
                                    var message = domainObject.identifier.namespace + '.' + domainObject.parent
                                    listener[key] = callback
                                    telemetrysocket.send('subscribe ' + message)
                                        function unsubscribe() {
                                        delete listener[key]
                                        telemetrysocket.send('unsubscribe ' + message)
                                    }
                                }
                            }

                            let providers = {
                                namespace: namespace,
                                objectProvider: systemObjectProvider,
                                systemCompositionProvider: systemCompositionProvider,
                                topicCompositionProvider: topicCompositionProvider,
                                telemetryProvider: telemetryProvider
                            }
                            return providers
                        })
                    })
                }
                



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
                        console.log('Providers', providers)
                        openmct.objects.addProvider(providers.namespace, providers.objectProvider)
                        openmct.composition.addProvider(providers.systemCompositionProvider)
                        openmct.composition.addProvider(providers.topicCompositionProvider)
                        openmct.telemetry.addProvider(providers.telemetryProvider)
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
