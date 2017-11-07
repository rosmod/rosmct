/**
 * Basic implementation of a realtime server.
 */

var RosSystem = require('./ros-system');
var RealtimeServer = require('./realtime-server');
var StaticServer = require('./static-server');

var expressWs = require('express-ws');
var app = require('express')();
expressWs(app);

var url = 'localhost';
var rosbridgeport = '9090'; 

for (var i=2; i < process.argv.length; i++) {
    var arg = process.argv[i];

    if (arg == '--port') {
        i++;
        rosbridgeport = process.argv[i];
    }
    else if (arg == '--url') {
        i++;
        url = process.argv[i];
    }
}



var rossystem = new RosSystem(url, rosbridgeport);
var realtimeServer = new RealtimeServer(rossystem);
var staticServer = new StaticServer();

app.use('/realtime', realtimeServer);
app.use('/', staticServer);

var port = process.env.PORT || 8085

app.listen(port, function () {
    console.log('Open MCT hosted at http://localhost:' + port);
    console.log('Realtime hosted at ws://localhost:' + port + '/realtime');
});
