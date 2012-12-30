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

function User (userId, callback) {
    var me = this;
    
    // Check in the redis store if user is cached
    db.redisConnect(function (err, client) {
        if(err) {
            // Error connecting, falback to mongo
            return getFromMongo();
        }
        
        client.hgetall('auth:user:' + String(userId).toLowerCase(), function (err, user) {
            if(err || !user) {
                return getFromMongo(); // Could not do cache thing, resort to mongo
            }
            
            // User was found
            // Unserialize
            for(var i in user) {
                try {
                    user[i] = JSON.parse(user[i]);
                } catch(e) {
                    // Retain value
                }
            }
            
            return createUserObject(user);
        });
    });

    /**
     * Helper function to create user objects
     * @param {object} user User object returned from DB/cache query
     * @returns {undefined}
     */
    function createUserObject(user) {
        Object.defineProperty(me, "_data", {
            enumerable: false,
            value: user
        });

        callback(null, me);
    }
    
    /**
     * Helper function to get user information from mongo
     * @returns {undefined}
     */
    function getFromMongo () {
        db.mongoConnect({db: 'meeveep', collection: 'users'}, function (err, collection) {
            if(err) {
                return callback(err);
            }

            collection.findOne({$or: [{userId: Number(userId)}, {username: String(userId).toLowerCase()}]}, function (err, user) {
                if(err) {
                    return callback(error(0x4B02, err));
                }

                if(!user) {
                    return callback(error(0x4B01));
                }
                
                createUserObject(user);
                
                // Cache
                db.redisConnect(function (err, client) {
                    if(err) {
                        // Could not connect. skip caching
                        return;
                    }
                
                    //console.log(client);
                    
                    // Delete from cache after 4 hours. This helps avoid users
                    // being forgotten perpetually in the cache.
                    // It also frees up space for other information to be stored in the cache
                    var ttl = 60 * 60 * 4;
                    
                    // Serialize
                    var username = user.username.toLowerCase(),
                        userId = user.userId;
                        
                    for(var i in user) {
                        if(typeof user[i] !== 'string') {
                            user[i] = JSON.stringify(user[i]);
                        }
                    }
                    
                    var emptyFn = function () {
                        console.log(arguments);
                    };
                    
                    client.multi()
                        .hmset('auth:user:' + username, user, emptyFn)
                        .hmset('auth:user:' + userId, user, emptyFn)
                        .expire('auth:user:' + username, ttl)
                        .expire('auth:user:' + userId, ttl)
                        .exec(emptyFn);
                });
            });
        });
    }
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

/**
 * Get information about a user, based on the username
 * @param {string} username
 * @param {type} callback
 * @returns {undefined}
 */
function findByUserName(username, callback) {
    
}
