/**
 * Media manipulation
 */

var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js');

module.exports = {
    createSession: createSession
};

function createSession (callback) {
    var sessionId = util.generateKey(32);
    
    db.redisConnect(function (client) {
        var session = {
            date: (new Date).getTime(),
            id: sessionId
        };
        
        client.hmset('media:session:' + sessionId, session);
    });
}
