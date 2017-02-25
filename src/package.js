var util = require("util");
var bytearray = require('bytearray');

var Package = function() {
  var self = this;

  self.TYPE_HANDSHAKE = 1;
  self.TYPE_HANDSHAKE_ACK = 2;
  self.TYPE_HEARTBEAT = 3;
  self.TYPE_DATA = 4;
  self.TYPE_KICK = 5;
};

Package.prototype.encode = function(type, body) {
  var self = this;

  var length = body ? body.length : 0;
  var buffer = new Buffer(4+length);
  var b = new Buffer(4);

  buffer.fill(0x00);
  bytearray.writeByte(buffer, type & 0xff);
  bytearray.writeByte(buffer, (length>>16) & 0xff);
  bytearray.writeByte(buffer, (length>>8) & 0xff);
  bytearray.writeByte(buffer, (length>>8) & 0xff);
  b.writeUInt32BE(length,0);

  for (var i = 0;i < length; i++) {
    buffer[(i + 4)] = body[i];
  }

  buffer[3] = b[3];

  if (length > 255) {
    buffer[2] = b[2];
  }

  return buffer;
};

Package.prototype.decode = function(buffer) {
  var self = this;
  var body;
  var type = bytearray.readUnsignedByte(buffer,0);
  var len = (bytearray.readUnsignedByte(buffer) << 16 |
             bytearray.readUnsignedByte(buffer) << 8 |
             bytearray.readUnsignedByte(buffer)) >>> 0;

  if (bytearray.getBytesAvailable(buffer) >= len) {
    body = new Buffer(len);
    if (len) {
      for (var i = 4;i < len + 4; i++) {
        bytearray.writeUnsignedByte(body, buffer[i]);
      }

    }
  }

  return {
    type: type,
    body: body,
    length: len
  };
};

module.exports = Package;

