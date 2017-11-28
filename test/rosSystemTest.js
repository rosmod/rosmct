var ROSLIB = require('roslib')
var Q = require('q')
var fs = require('fs')

var testSys

fs.readFile('test/testSystem.json', 'utf8', function(err, data){
    if(err) throw err;
    testSys = JSON.parse(data);
    console.log(testSys)
    console.log(testSys["Rosbridge URL"])

    var ros = new ROSLIB.Ros({
        url: testSys["Rosbridge URL"]
    })

    console.log('tst')
    ros.on('connection', function(){
        console.log('Connected to rosbridge server at ' + testSys["Rosbridge URL"])
    })

    ros.on('error', function(){
        console.log('Error connecting to rosbridge websocket at ' + testSys["Rosbridge URL"])
    })

    ros.on('close', function(){
        console.log('Connection to rosbridge websocket server at ' + testSys["Rosbridge URL"] + ' closed')
    })
})
