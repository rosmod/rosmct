/**
 * Basic test of a realtime server.
 */
/* global require,process */

var ROSLIB = require('roslib')
var Q = require('q')
var fs = require('fs')
var RealtimeServer = require('./../src/servers/realtime-server.js')

//check that the test system is present and can be connected with roslib
fs.readFile('test/testSystem.json', 'utf8', function(err, data){
    if(err) throw err
    var testSys = JSON.parse(data)

    var ros = new ROSLIB.Ros({
        url: "ws://" + testSys["Rosbridge URL"] + ":" + testSys["Rosbridge Port"]
    })

    ros.on('connection', function(){
        console.log('Test connection successful to rosbridge server at ' + testSys["Rosbridge URL"])
        ros.close()
        initServer(testSys)
    })

    ros.on('error', function(){
        console.log('Test connection failed.\nError connecting to rosbridge websocket at ' + testSys["Rosbridge URL"])
    })

    ros.on('close', function(){
        //nothing
    })
})

function initServer(testSys){

    var expressWs = require('express-ws');
    var app = require('express')();
    expressWs(app);

    var realtimeServer = new RealtimeServer();

    app.use('/realtime', realtimeServer);

    var port = process.env.PORT || 8085

    app.listen(port, function () {
        console.log('Realtime hosted at ws://localhost:' + port + '/realtime')
        console.log('Beginning realtime server test')
        test(testSys)
    });
}

function test(testSys){
    
}
