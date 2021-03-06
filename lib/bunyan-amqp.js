/*
 * bunyan-amqp.js: Bunyan streaming to AMQP
 * inspired by https://github.com/brandonhamilton/bunyan-logstash-amqp
 *
 */

'use strict';

var bunyan = require('bunyan'),
  amqp = require('amqp'),
  os = require('os'),
  CBuffer = require('CBuffer'),
  _ = require('lodash'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter;

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function createAmqStream (options) {
  return new AmqStream(options);
}

function AmqStream (options) {
  EventEmitter.call(this);
  options = options || {};

  this.name = 'bunyan';
  this.host = options.host || 'localhost';
  this.port = options.port || 5672;
  this.vhost = options.vhost || '/';
  this.login = options.login || 'guest';
  this.password = options.password || 'guest';
  this.level = options.level || 'info';
  this.server = options.server || os.hostname();
  this.application = options.application || process.title;
  this.pid = options.pid || process.pid;
  this.tags = options.tags || ['bunyan'];
  this.type = options.type;
  this.cbufferSize = options.bufferSize || 100;
  this.sslEnable = options.sslEnable || false;
  this.sslKey = options.sslKey || '';
  this.sslCert = options.sslCert || '';
  this.sslCA = options.sslCA || '';
  this.sslRejectUnauthorized = options.sslRejectUnauthorized || true;
  this.messageFormatter = options.messageFormatter;
  this.heartbeat = options.heartbeat || 30; // shouldn't exceed 60s
  this.heartbeatForceReconnect = options.heartbeatForceReconnect || true;
  this.deliveryMode = options.deliveryMode || 2;

  this.exchange = (typeof options.exchange === 'object') ? options.exchange : { name: options.exchange };

  if (!this.exchange.properties) {
    this.exchange.properties = {};
  }

  this.log_buffer = new CBuffer(this.cbufferSize);
  this.connected = false;

  var self = this;

  var connection_options = {
    host: this.host,
    port: this.port,
    vhost: this.vhost,
    login: this.login,
    password: this.password,
    heartbeat: this.heartbeat,
    heartbeatForceReconnect: this.heartbeatForceReconnect
  };

  if (this.sslEnable) {
    connection_options['ssl'] = {
      enabled: true,
      keyFile: this.sslKey,
      certFile: this.sslCert,
      caFile: this.sslCA,
      rejectUnauthorized: this.sslRejectUnauthorized.sslKey
    };
  }
  this.connection = amqp.createConnection(connection_options);
  this.connection.on('error', function (error) {
    self.emit('error', error);
  });
  this.connection.on('heartbeat', function () {
    self.emit('heartbeat');
  });

  this.connection.on('ready', function () {
    self.connection.exchange(self.exchange.name, self.exchange.properties, function (exchange) {
      self._exchange = exchange;
      self.connected = true;
      self.emit('connect');
      self.flush();
    });
  });

  this.connection.on('close', function (e) {
    if (e) {
      self._exchange = null;
      self.connected = false;
      self.emit('close');
    } else {
      self.connection.reconnect();
    }
  });
}

util.inherits(AmqStream, EventEmitter);

AmqStream.prototype.flush = function () {
  var self = this;

  var message = self.log_buffer.pop();
  while (message) {
    self.sendLog(message.message);
    message = self.log_buffer.pop();
  }

  self.log_buffer.empty();
};

AmqStream.prototype.write = function (entry) {
  var level, rec, msg;

  if (typeof(entry) === 'string') {
    entry = JSON.parse(entry);
  }

  rec = _.cloneDeep(entry);

  level = rec.level;

  if (levels.hasOwnProperty(level)) {
    level = levels[level];
  }

  msg = {
    '@timestamp': rec.time.toISOString(),
    'message': rec.msg,
    'tags': this.tags,
    'source': this.server + '/' + this.application,
    'level': level
  };

  if (typeof(this.type) === 'string') {
    msg['type'] = this.type;
  }

  delete rec.time;
  delete rec.msg;
  delete rec.v;
  delete rec.level;

  rec.pid = this.pid;

  if (this.messageFormatter) {
    msg = this.messageFormatter(_.extend({}, msg, rec));
    if (_.isUndefined(msg) || _.isNull(msg)) {
      return;
    }
  } else {
    msg = _.extend(msg, rec);
  }

  var routingKey = msg.routingKey;
  delete msg.routingKey;

  this.send(routingKey || this.exchange.routingKey || level, JSON.stringify(msg), bunyan.safeCycles());
};

AmqStream.prototype.flush = function () {
  var message = this.log_buffer.pop();
  while (message) {
    this.sendLog(message.routingKey, message.message);
    message = this.log_buffer.pop();
  }
  this.log_buffer.empty();
};

AmqStream.prototype.sendLog = function (routingKey, message) {
  var self = this;
  if (self._exchange) {
    self._exchange.publish(routingKey, message, { deliveryMode: self.deliveryMode }, function (hasError, err) {
      if (hasError) {
        self.emit('ack error', err);
      } else {
        self.emit('ack', message);
      }
    });
  } else {
    self.log_buffer.push({ routingKey: routingKey, message: message });
  }
};

AmqStream.prototype.send = function (routingKey, message) {
  if (!this.connected) {
    this.log_buffer.push({ routingKey: routingKey, message: message });
  } else {
    this.sendLog(routingKey, message);
  }
};

module.exports = {
  createStream: createAmqStream,
  AmqStream: AmqStream
};
