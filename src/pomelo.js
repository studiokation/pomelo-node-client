var util = require("util");
var net = require("net");
var Message = require("./message.js");
var Package = require("./package.js");
var Protocol = require("./libs/protocol.js");
var Protobuf = require("./libs/protobuf.js");
var bytearray = require('bytearray');
var events = require("events");
var Request = require("./request.js");
var PackageConstants = {
  TYPE_HANDSHAKE: 1,
  TYPE_HANDSHAKE_ACK: 2,
  TYPE_HEARTBEAT: 3,
  TYPE_DATA: 4,
  TYPE_KICK: 5
};

var Pomelo = function() {
  var self = this;

  self.requests = {};
  self.info = {
    sys: {
      version: "0.0.1",
      type: "pomelo-node-tcp-client",
      pomelo_version: "0.7.x"
    }
  };
  self._handshake = null;
  self._socket = null;
  self._hb = 0;
  self._package = new Package();
  self._message = new Message(self);
  self._pkg = null;
  self._routesAndCallbacks = [];
  self._pomelo = null;
  self.heartbeat = 0;
  self.consoleLogs = true;
};

util.inherits(Pomelo, events.EventEmitter);

Pomelo.prototype.init = function(host, port, user, callback, timeout, cross) {
  var self = this;
  self.info.user = user;
  self._handshake = callback;

  if (timeout === null) {
    timeout = 8000;
  }
  if (cross === null) {
    cross = 3843;
  }

  if (self._socket === null) {
    self._socket = new net.Socket();
    self._socket.setNoDelay();
    self._socket.on("connect", self.onConnect.bind(self));
    self._socket.on("close", self.onClose.bind(self));
    self._socket.on("data", self.onData.bind(self));
    self._socket.on("error", self.onError.bind(self));
  }
  self._socket.connect( port, host, function() {
    if (self.consoleLogs) {
      console.log("connected!");
    }
  });
};

Pomelo.prototype.disconnect = function() {
  var self = this;
  if (self._socket && self._socket.connected) {
    self._socket.close();
  }
  if (_hb) {
    clearTimeout(_hb);
  }
};

Pomelo.prototype.request = function(route, msg, callback) {
  var self = this;

  if (!route || !route.length) {
    return;
  }

  if (callback === null) {
    self.notify(route, msg);
    return;
  }

  var req = new Request(route, callback);
  self.requests[req.id] = req;

  self.send(req.id, req.route, msg || {});
};

Pomelo.prototype.notify = function(route, msg) {
  var self = this;

  self.send(0, route, msg || {});
};

Pomelo.prototype.on = function(route, callback) {
  var self = this;

  self._routesAndCallbacks[route] = callback;
};

Pomelo.prototype.beat = function() {
  var self = this;

  clearTimeout(self._hb);
  _hb = 0;

  self.socketSend(self._package.encode(PackageConstants.TYPE_HEARTBEAT));
};

Pomelo.prototype.send = function(reqId, route, msg) {
  var self = this;
  var msgStr = JSON.stringify(msg);
  var buffer = new Buffer(msgStr.length);

  buffer = self._message.encode(reqId, route, msg);
  buffer = self._package.encode(PackageConstants.TYPE_DATA, buffer);

  self.socketSend(buffer);
};

Pomelo.prototype.onConnect = function() {
  var self = this;
  self.socketSend(self._package.encode(
    PackageConstants.TYPE_HANDSHAKE,
    Protocol.strencode(JSON.stringify(self.info))
  ));
};

Pomelo.prototype.socketSend = function(data) {
  var self = this;
  self._socket.write(data);
};

Pomelo.prototype.onClose = function() {
  var self = this;
  if (self.consoleLogs) {
    console.log("closed");
  }
};

Pomelo.prototype.onError = function(data) {
  var self = this;
  if (self.consoleLogs) {
    console.log(data);
  }
};

Pomelo.prototype.onData = function(data) {
  var self = this;

  do {
    // TODO: double check all this
    if (self._pkg) {
      self._pkg.body = new Buffer(self._pkg.length);
      self._pkg.body = data;
    }
    else {
      self._pkg = self._package.decode(data);
    }

    switch(self._pkg.type) {
      case self._package.TYPE_HANDSHAKE:
        var message = self._pkg.body.toString();
        var response = JSON.parse(message);
        if (response.code == 200) {
          if (response.sys) {
            Protobuf.init(response.sys.protos);
            self.heartbeat = response.sys.heartbeat;
          }
          self.socketSend(self._package.encode(self._package.TYPE_HANDSHAKE_ACK));
          self.emit("handshake");
        }
        if (self._handshake !== null) {
          self._handshake.call(self, response);
        }
        self._pkg = null;
        break;
      case self._package.TYPE_HANDSHAKE_ACK:
        self._pkg = null;
        break;
      case self._package.TYPE_HEARTBEAT:
        self._pkg = null;
        if (self.heartbeat) {
          _hb = setTimeout(self.beat.bind(self), self.heartbeat*1000);
        }
        break;
      case self._package.TYPE_DATA:
        var msg = self._message.decode(self._pkg.body);
        if (self.consoleLogs) {
          console.log("route: " + msg.route + " body: " + JSON.stringify(msg.body));
        }
        if (!msg.id) {
          self._routesAndCallbacks[msg.route](msg.body);
        }
        else {
          self.requests[msg.id].callback.call(self, msg.body);
          self.requests[msg.id] = null;
        }
        self._pkg = null;
        break;
      case self._package.TYPE_KICK:
        _pkg = null;
        break;
    }
  } while (self._pkg && self._pkg.length > 4);
};

Pomelo.prototype.getMessage = function() {
  var self = this;
  return self._message;
};

Pomelo.prototype.setMessage = function(msg) {
  var self = this;
  self_message = msg;
};

module.exports = Pomelo;

