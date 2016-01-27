/*
 * File: test/logstash-amqp-test.js
 * Description: Test script for the logstash-amqp library
 */

var bunyan = require('bunyan'),
  bunyanamqp = require("../lib/bunyan-amqp"),
  chai = require('chai'),
  expect = require('chai').expect,
  assert = require('assert');

describe('bunyan-logstash-amqp', function () {
  it('should create a bunyan stream', function (done) {
    var s = bunyanamqp.createStream();
    expect(s).to.be.an.instanceof(bunyanamqp.AmqStream);
    expect(s).to.respondTo('write');
    done();
  });

});
