/**
* Static web server for openmct clients
* @module static-server
*/
/* global require, module */
var express = require('express');

function StaticServer() {
    var router = express.Router();

    router.use('/', express.static(__dirname + '/../..'));

    return router
}

module.exports = StaticServer;
