var session = require('../controllers/session.js'),
    db = require('./db.js');

/**
 * Save the current session to the database: a helper function
 * This function is called at the end of every request
 */
function saveSession() {
    var req = this;
    
    if(req.session) {
        // Check necessary to ensure that session had not been ended
        var sessInfo = req.session;
        
        if(!sessInfo) {
            return;
        }
        
        db.redisConnect(function (err, client) {
            if(!err) {
                session.updateSession (req.sessionId, sessInfo, console.log)
            }
        });
    }
}

/**
 * Check if someone is logged in. Currently examines the session to know if it will find a userId
 * @return bool
 */
function isLoggedIn () {
    var req = this;
    return Boolean(req.session && req.session.userId);
}

/**
 * Get the user that is currently logged in. If no user is logged in, returns nothing
 * @param callback Callback receives an error object and a user object, if a user is logged in.
 */
function getUser(callback) {
    var req = this;
    
    if(!req.isLoggedIn()) {
        // No logged in...
        return callback(null, null);
    }
    
    var user = require('../controllers/user.js');
    user.getUser(req.session.userId, function (err, user) {
        if(err) {
            return callback(err);
        }
        
        return callback(null, user.userData);
    });
}

/**
 * End the current session
 */
function endSession(callback) {
    var req = this;
    
    if(!req.sessionId) {
        // Not really on any session
        return callback(null);
    }
    
    session.endSession(req.sessionId, callback);
}

module.exports = {
    middleware: function (req, res, next) {
        req.isLoggedIn = isLoggedIn;
        req.getUser = getUser;
        req.logout  = req.endSession = endSession;
        
        var sessionId = req.cookies && req.cookies.sid;
        
        if(!sessionId) {
            // No session cookie
            return next();
        }
        
        session.getSession(sessionId,
            {
                ip: req.socket.remoteAddress,
                renew: true,
                userAgent: req.headers['user-agent']
            },
            function (err, userInfo) {
                if(err) {
                    // No session or session error
                    // Ignore for now
                    // TODO: examine the error and decide whether to ignore or throw an HTTP 500
                    return next();
                }
                
                // Session found...
                userInfo.active = Boolean(parseInt(userInfo.active));
                userInfo.userId = parseInt(userInfo.userId);
                req.session = userInfo;
                req.sessionId = sessionId;
                
                res.on("finish", saveSession.callback(req))
                next();
            }
        );
    }
}


