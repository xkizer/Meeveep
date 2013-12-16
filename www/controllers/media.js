/**
 * Media manipulation
 */

var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js'),
    cli = require('cli-color');

module.exports = {
    createSession: createSession,
    getSession: getSession,
    notifyComplete: notifyComplete
};

/**
 * Create a media recording session.
 * Recording sessions are used by recording servers to verify media streaming,
 * and ensure security. It also helps to keep track of recording sessions, to
 * enable clients resume an interrupted recording session.
 * @param {function} callback The callback function receives information about
 *  the created recording session.
 */
function createSession (userInfo, callback) {
    var sessionId = util.generateKey(34);

    db.redisConnect(function (err, client) {
        if(err) {
            return callback(error(0xAF02, err));
        }

        var session = {
            date: (new Date).getTime(),
            id: sessionId,
            // The server parameter tells the client the recording server to use.
            // It is not a security issue, but a performance issue. Therefore,
            // the recording server does not need to check this param before
            // accepting connections (clients will normally follow this advice
            // unless something messed up with something).
            // The server parameter will ultimately be generated using a very
            // sophisticated algorithm to know which server has been less busy,
            // and will be less busy in the next few minutes.

			//server: 'meeveep.kizer.com.ng:9304',
			server: '192.168.1.98:9304',

            // We attach the session to the user ID of the provided user. This
            // user is the owner of the stream
            userId: userInfo.userId
        };

        var ttl = 60 * 60 * 2;  // We allow the sessions to last two hours. Based
                                // on the feedback we get, we might increase or
                                // reduce this number when we go live

        client.multi()
            .hmset('media:session:' + sessionId, session)
            .expire('media:session:' + sessionId, ttl)
            .exec(function (err) {
                if(err) {
                    return callback(error(0xAF01, err));
                }

                // Session created....
                return callback(null, session);
        });
    });
}

/**
 * Get a recording session
 * @param {string} sessionId The ID of the session
 * @param {function} callback The callback receieves an error object if an error
 *  occurs. The second parameter is the session object (null if session was not found)
 */
function getSession (sessionId, callback) {
    db.redisConnect(function (err, client) {
        if(err) {
            return callback(error(0xAF03, err));
        }

        client.hgetall('media:session:' + sessionId, function (err, session) {
            if(err) {
                return callback(error(0xAF04, err));
            }

            return callback(null, session);
        });
    });
}

function notifyComplete (data, callback) {
    console.log(cli.yellow('Notify Complete'), data);
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection) {
        var sessionId = data.sessionId,
            medium = data.type,
            qry = {};
        
        qry[medium] = sessionId;
        
        // Find the particular order that has the video
        // Note the video: sessionId below? By now the user's browser SHOULD have
        // sent in an update request. If not, this will ultimately fail.
        collection.findOne(qry, function (err, card) {
            if(err) {
                return callback(err);
            }
            
            if(!card) {
                return callback({msg: 'Browser did not respond'});
            }
            
            var update = {};
            
            update[medium + 'Server'] = data.server;
            update[medium + 'URL'] = data.playback;
            
            if('video' === medium) {
                update.videoPoster = data.poster;
            }
            
            collection.update({orderId: card.orderId}, {$set: update}, function (err) {
                if(err) {
                    return callback(err);
                }
                
                callback();
            });
        });
    });
}