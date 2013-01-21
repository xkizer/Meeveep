/*
 * Media manipulation/recording/streaming
 */

var media = require('../controllers/media.js');
var stars = require('../controllers/stars.js');
var cli = require('cli-color');
var error = require('../util/error.js');
var orders = require('../controllers/orders.js');

module.exports = {
    createSession: function (req, res, next) {
        // Sessions are created on the cache server and written to disk only
        // when the recording has began
        req.getUser(function (err, user) {
            console.log(cli.yellow('Displaying user', user));
            // Check if user is a star
            if(!user || !user.starId) {
                console.log(user)
                res.json({"e": "Unauthorised"});
                return res.json({error: 'Unauthorised'}, 403).end();
            }

            media.createSession(user, function (err, session) {
                if(err) {
                    return res.json({error: 'Server fault'}, 500).end();
                }

                return res.json(session);
            });
        });
    },

    verifySession: function (req, res, next) {
        // Attempt to retrieve the session
        media.getSession(req.params.sessionId, function (err, session) {
            if(err) {
                return res.json({error: err}, 500).end();
            }

            res.json(session).end();
        });
    },
    
    notifyComplete: function (req, res, next) {
        var body = req.body;
        
        media.notifyComplete(body, function (err) {
            if(err) {
                return res.json({error: err}, 500);
            }
            
            res.json({success: true});
        });
    }
};
