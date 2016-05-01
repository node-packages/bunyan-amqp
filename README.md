# AMQP stream for Bunyan

[![Build Status](https://travis-ci.org/ferronrsmith/bunyan-amqp.svg)](https://travis-ci.org/ferronrsmith/bunyan-amqp)


AMQP stream for the Bunyan logger

# Installation

    $ npm install bunyan-amqp


## Usage

```javascript
"use strict";

var bunyan = require('bunyan');

var amq_stream = bunyanamqp.createStream({
    login : 'admin',
    password : 'UbpdMksr0ons',
    exchange : {
        routingKey : 'logs'
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
```

## Configuration

A raw bunyan stream can be created using the module  ``createStream(options)``method.

The ``options`` object accepts the following fields:


| Parameter | Type | Default | Description |
| ------------- |:-------------:| -----:|-----:|
| host 				    | string 		| `localhost` 		| AMQP host |
| port 				    | number 		| `5672` 			| AMQP port |
| vhost 				| string 		| `/`				| AMQP virtual host |
| login 				| string 		| `guest` 			| AMQP username |
| password			    | string 		| `guest` 			| AMQP password |
| sslEnable 			| boolean 	    | `false` 			| Enable AMQP SSL |
| sslKey 				| string 		| `''` 			    | AMQP SSL private key file path |
| sslCert 				| string 		| `''` 			    | AMQP SSL certificate file path |
| sslCA 				| string 		| `''` 			    | AMQP SSL CA file path |
| sslRejectUnauthorized	| boolean 	    | `true` 			| Verify AMQP SSL certificate against CA |
| exchange 			    | object 		| `undefined` 		| AMQP exchange options |
| level 				| string 		| `info` 			| Message level |
| server 				| string 		| `os.hostname()` 	| Message source server |
| application 			| string 		| `process.title` 	| Message source application |
| pid 				    | string 		| `process.pid`	    | Message pid |
| tags 				    | string array	| `["bunyan"]`		| Message tags |
| type 				    | string 		| `undefined` 		| Message type |
| bufferSize 			| number 		| `100` 			| Outstanding message buffer size |
| messageFormatter 	    | function 	    | `undefined` 		| Optional message formatting function |

The **exchange** object accepts the following fields:

| Parameter | Type | Default | Description |
| ------------- |:-------------:| -----:|-----:|
| name 		    | string 	| `undefined` 		| AMQP exchange name |
| routingKey 	| string 	| `message.level` 	| AMQP message routing key |
| properties 	| object 	| `{}` 			    | [AMQP exchange options](https://github.com/postwait/node-amqp/blob/master/README.md#connectionexchangename-options-opencallback) |


### Events

The stream will emit ``open``, ``close`` and ``error`` events from the underlying AMQP connection.


## Credits

This module is heavily based on [bunyan-logstash-amqp](https://github.com/brandonhamilton/bunyan-logstash-amqp).
