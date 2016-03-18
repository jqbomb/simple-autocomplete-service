var redis = require('./redis.js')(),
  utils = require('./utils.js'),
  async = require('async'),
  stub = "SAS_";


var query = function(key, str, callback) {
  str = utils.filter(str);
  redis.zrank(stub+key, str, function(err, data) {
    if (err || data == null) {
      return callback(true, null);
    }
    redis.zrange(stub+key, data, data + 75, function(err, data) {
      if (err) {
        return callback(true, null);
      }
      var retval = [];
      for(var i in data) { 
        var match = data[i].match(/(.*)\*(.*)/)
        if (match) {
          if(match[1].indexOf(str) !=0) {
            break;
          }
          retval.push(match[2])
        }
      }
      callback(null, retval);
    })
  });
};

var list = function(callback) {
  redis.keys(stub+"*", function(err, data) {
    if (err || data == null) {
      return callback(true, null);
    }
    for(var i in data) {
      data[i] = data[i].substr(stub.length);
    }
    callback(null, data);
  })
};

var importFile = function(path, name, callback) {
  var stringcount=0,
    keycount=0;
    var key = stub + name;
  var q = async.queue(function(str, done) {
    var lcstring = utils.filter(str);
    var multi = redis.multi();
    var top = Math.max(lcstring.length-1,15);
    for(var i = lcstring.length-1; i>=1; i--) {
      var bit = lcstring.substr(0, lcstring.length - i);
      console.log(bit);
      keycount++;
      multi.zadd(key, 0, bit)
    }
    multi.zadd(key, 0, lcstring+"*"+str);
    multi.exec(done);
    stringcount++;
  },1)
  
  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(path)
  });

  lineReader.on('line', function (line) {
    q.push(line);
  });

  q.drain = function() {
    callback(null, {stringcount: stringcount, keycount:keycount});
  }
};

var deleteIndex = function(name, callback) {
  redis.del(stub + name, function(err, data) {
    console.log(err, data);
    callback(err,data);
  })
}

module.exports = {
  query: query,
  list: list,
  importFile: importFile,
  deleteIndex: deleteIndex
}