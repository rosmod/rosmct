/**
 * Basic test of a realtime server.
 */
/* global require,process */

var ROSLIB = require('roslib')
var Q = require('q')
var fs = require('fs')
var RealtimeServer = require('./../src/servers/realtime-server.js')
var WebSocket = require('ws')

var port = process.env.PORT || 8085


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


    app.listen(port, function () {
        console.log('Realtime hosted at ws://localhost:' + port + '/realtime')
        console.log('Beginning realtime server test')

        //add ros system
        let ws = new WebSocket('ws://localhost:' + port + '/realtime/notify')

        ws.on('open', function(){
            ws.send(JSON.stringify({
                name: 'Test System',
                rosbridgeurl: testSys["Rosbridge URL"],
                rosbridgeport: testSys["Rosbridge Port"],
                status: 'OPEN'
            }))

            /*
            ws.send(JSON.stringify({
                name: 'External System',
                rosbridgeurl: '10.1.10.190',
                rosbridgeport: 9999,
                status: 'OPEN'
            }))*/
        })

        //run test after server has had time to connect to system
        setTimeout(function(){test(testSys)},750);
    });
}

function test(testSys){
    console.log('Setting up server telemetry connection')
    let ws = new WebSocket('ws://localhost:' + port + '/realtime')

    ws.on('open', function(){
        ws.send('dictionary')
        
    })

    ws.on('message', function(message){
        var msg = JSON.parse(message)
        console.log('Received Message: ', message)
        if(msg.type === 'dictionary'){
            console.log('Received Dictionary: ', JSON.stringify(msg.value,null,2))
            //console.log('Subscribing to /array')
            //ws.send('subscribe /array')
            console.log("Subscribing to 'Test System/twist'")
            ws.send('subscribe Test System/twist')
            
        } else if (msg.type === 'point'){
            console.log('Received Telemetry Point: ', JSON.stringify(msg.value, null, 2))
        } else{
            console.log('Received invalid message')
        }
        
    })
    
}

