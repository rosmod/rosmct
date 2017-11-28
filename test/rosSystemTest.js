var ROSLIB = require('roslib')
var Q = require('q')
var fs = require('fs')
var RosSystem = require('./../src/ros/ros-system.js')



var testSys

function test(testSys){

    console.log("Beginning Test...")
    
    var rosSys = new RosSystem(testSys["Rosbridge URL"], testSys["Rosbridge Port"], {
        name: "Test System",
        key: "TestKey"
    })

    console.log(rosSys.getDictionary());
    
    rosSys.getDictionary().then(function(dict){
        console.log(JSON.stringify(dict))
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
    })

    ros.on('error', function(){
        console.log('Error connecting to rosbridge websocket at ' + testSys["Rosbridge URL"])
    })

    ros.on('close', function(){
        console.log('Closing test connection to rosbridge websocket server at ' + testSys["Rosbridge URL"])
        test(testSys)
    })
})
