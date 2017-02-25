var reqId = 0;

var Request = function(route, callback){
  var self = this;
  self.id = ++reqId;
  self.route = route;
  self.callback = callback;
};

module.exports = Request;

