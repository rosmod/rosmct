var ROSLIB = require('roslib')
var Q = require('q')
var fs = require('fs')
var RosSystem = require('./../src/ros/ros-system.js')



var testSys

function test(testSys){

    console.log("Beginning Test...")
    console.log("Connecting to rosbridge");
    
    var rosSys = new RosSystem(testSys["Rosbridge URL"], testSys["Rosbridge Port"], {
        name: "Test System",
        key: "TestKey"
    })


    rosSys.getDictionary()
        .then(function(dict){
            console.log("Dictionary Retrieved")
//            console.log(JSON.stringify(dict, null, 2))
            console.log('Number of topics in dictionary: ', dict.topics.length)
            console.log('Number of topic subscribers in rosSys: ', rosSys.subscribers.length)
            var unlisten = rosSys.listen(function(point){
                //console.log('Received telemetry point of type: ', point.id)
                console.log('Received telemetry point: ', point)
                console.log('Unlistening...')
                unlisten()
                console.log('RosSys listeners:', rosSys.listeners.length)
                rosSys.disconnectRos()
            })
            console.log('RosSys listeneres:', rosSys.listeners.length)
        })


}

//check that the test system is present and can be connected with roslib
fs.readFile('test/testSystem.json', 'utf8', function(err, data){
    if(err) throw err
    testSys = JSON.parse(data)

    var ros = new ROSLIB.Ros({
        url: "ws://" + testSys["Rosbridge URL"] + ":" + testSys["Rosbridge Port"]
    })

    ros.on('connection', function(){
        console.log('Test connection successful to rosbridge server at ' + testSys["Rosbridge URL"])
        ros.close()
        test(testSys)
    })

    ros.on('error', function(){
        console.log('Test connection failed.\nError connecting to rosbridge websocket at ' + testSys["Rosbridge URL"])
    })

    ros.on('close', function(){
        //nothing
    })
})
