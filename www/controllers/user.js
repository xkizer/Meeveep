var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js');


module.exports = {
    getUser: function (userId, callback) {
        new User(userId, callback);
    },
    
    createUser: function () {
        return createUser.apply(this, [].slice.apply(arguments));
    },
    
    usernameExists: function () {
        return usernameExists.apply(this, [].slice.apply(arguments));
    }
};

// Cached users are saved here...
userCache = {};

function User (userId, callback) {
    console.log(24, userId);
    var me = this;
    
    if(userCache[userId]) {
        return callback(null, userCache[userId]);
    }
    
    db.mongoConnect({db: 'meeveep', collection: 'users'}, function (err, collection) {
        if(err) {
            return callback(err);
        }
        
        collection.findOne({userId: Number(userId)}, function (err, user) {
            if(err) {
                return callback(err);
            }
            
            if(!user) {
                return callback(error(0x4B01));
            }
            
            Object.defineProperty(me, "_data", {
                enumerable: false,
                value: user
            });
            
            callback(null, me);
            
            // Cache
            userCache[userId] = me;
            
            // Destroy cache after 30 mins
            (function () {
                delete userCache[userId];
            }).defer(1800000);
        });
    });
}

User.prototype = {
    get id () {
        return this._data.userId
    },
    
    get userData () {
        return {}.extend(this._data);
    }
};

/**
 * Creates a new user
 * @param userInfo An hash of the user information
 *      This information is not pre-verified. It is the responsibility of the calling function to verify user-supplied information.
 * @param callback The callback receives the ID of the newly created user
 */
function createUser (userInfo, callback) {
    // For some reason, we have to generate some random user ID, instead of relying on MongoDB's ObjectID (obvious privacy reasons)
    var userId = Math.round(Math.random() * 10000000000000000);
    var username = String(userInfo.username).toLowerCase();
    var password = util.hash(userInfo.password, username);
    
    var info = {
        userId: userId,
        username: username,
        password: password,
        created: new Date()
    };
    
    var fn = function (){};
    
    info.extendIfNotExists(userInfo);
    
    // Check if user exists...
    usernameExists(username, function (err, exists) {
        if(err) {
            return callback(err);
        }
        
        if(exists) {
            return callback(error(0x4B04));
        }
        
        // Create user
        db.mongoConnect({db: 'meeveep', collection: 'users'}, function (err, collection) {
            if(err) {
                return callback(error(0x4B08, err));
            }
            
            collection.insert(info, function (err) {
                if(err) {
                    return callback(error(0x4B09, err));
                }
                
                // Create user on redis
                db.redisConnect(function (err, client) {
                    if(err) {
                        // Error occured... delete information from mongo
                        collection.remove(info, fn);
                        return callback(error(0x4B0A, err));
                    }
                    
                    var dt = {
                        username: username,
                        password: password,
                        status: 'active',
                        userId: userId.toString()
                    };
                    
                    client.hmset('auth:user:' + username, dt, function (err) {
                        if(err) {
                            // Could not cache login information
                            collection.remove(info, fn);
                            return callback(error(0x4B0B, err));
                        }
                        
                        // Everything went fine...
                        callback(null, userId);                        
                    });
                });
            });
        });
    });
}

/**
 * Checks if username exists.
 * Usernames are checked by examining the redis cache for login information.
 * @param username The username to check for
 * @param callback The callback receives an error object and boolean
 */
function usernameExists(username, callback) {
    username = String(username);
    
    db.redisConnect(function (err, redis) {
        if(err) {
            return callback(error(0x4B03, err));
        }
        
        redis.hgetall('auth:user:' + username.toLowerCase(), function (err, info) {
            if(err) {
                // Could not check if user exists... let's be pessimistic
                return callback(error(0x4B03, err));
            }
            
            return callback(null, Boolean(info));
        });
    });
}


