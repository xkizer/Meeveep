/**
 * Utility functions
 */

// Error codes and messages
var getError = require('./error.js'),
    mongo = require('../util/db.js'),
    dbinfo = require('./dbinfo');

module.exports = {
    hash: function (password, salt) {
        var crypto  = require('crypto'),
            sha1    = crypto.createHash('sha256'),
            sha2    = crypto.createHash('sha256');
        
        sha1.update(password);
        sha2.update(sha1.digest('hex'));
        sha2.update(String(salt).toLowerCase());
        return sha2.digest('hex');
    },
    
    generateKey: function (keyLength) {
        var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890',
            key = '',
            index,
            i = 0;
        
        for(; i < keyLength; i++) {
            index = Math.floor(Math.random() * chars.length);
            key += chars[index];
        }
        
        return key;
    },
    
    commonCallback: function (req, res, next) {
        return function (err, data) {
            if(err) {
                res.json({
                    success: false,
                    error: {
                        message: getError(err),
                        code: err
                    }
                });
                
                return;
            }
            
            res.json({
                success: true,
                response: data
            });
        }
    },
    
    requireLogin: function (req, res, next, callback) {
        var session = req.session,
            userInfo = session.userInfo;
        
        if(!session.loggedIn || !userInfo) {
            // Please go log in
            var error = {
                success: false,
                error: {
                    message: getError(0x1811),
                    code: 0x1811
                }
            };
            
            res.json(error);
            return;
        }
        
        callback(userInfo);
    },

    /**
     * Shortcut helper function for connecting to mongo DB
     */
    mongoConnect: function (collection, callback) {
        mongo.mongoConnect(dbinfo.mongo.todo, function (err, db) {
            if(err) {
                return callback(err);
            }
            
            db.collection(collection, function (err, collection) {
                if(err) {
                    return callback(0x1810);
                }
                
                return callback(null, collection);
            });
        });
    }
}



