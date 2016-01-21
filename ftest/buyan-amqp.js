/*
 * File: test/logstash-amqp-test.js
 * Description: Test script for the logstash-amqp library
 */

var bunyan = require('bunyan'),
    bunyanamqp = require("../lib/bunyan-amqp");

var amq_stream = bunyanamqp.createStream({
    login : 'admin',
    password : 'UbpdMksr0ons',
    exchange : {
        name : 'amq-bunyan',
        routingKey : 'logs',
        properties : {
            durable : true,
            autoDelete : false
        }
    }
}).on('connect', function () {
    console.log("Connected to amqp");
}).on('close', function (e) {
    console.log("Closed connection to amqp");
}).on('error', console.log);


var log = bunyan.createLogger({
    name : 'example',
    streams : [{
        level : 'debug',
        stream : process.stdout
    }, {
        level : 'debug',
        type : 'raw',
        stream : amq_stream
    }]
});

log.info("this is just a test");
log.debug("this is a sample debug statement");