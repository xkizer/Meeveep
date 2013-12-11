/**
 * Management accounts manipulations, etc
 */

var cli = require('cli-color'),
    util = require('../util/util'),
    db = require('../util/db');

module.exports = {
    /**
     * Gets the list of stars attached to a manager's account
     * @param {number} managerId TheID of the manager
     * @param {function} callback Callback receives an error object and an array of starIds
     */
    getStars: function (managerId, callback) {
        db.mongoConnect({db: 'meeveep', collection: 'managers'}, function (err, collection) {
            if(err) {
                console.log(err);
                return callback(err);
            }
            
            collection.findOne({managerId: Number(managerId)}, {stars: true}, function (err, manager) {
                if(err) {
                    return callback(err);
                }
                
                callback(null, manager.stars || []);
            });
        });
    },
    
    /**
     * Get a list of products belonging to the specified manager
     * @param {number} managerId The ID of the manager
     * @param {function} callback Callback function receives an error object and
     * the list of products
     */
    getProducts: function (managerId, callback) {
        db.mongoConnect({db: 'meeveep', collection: 'products'}, function (err, collection) {
            if(err) {
                console.log(err);
                return callback(err);
            }
        
            collection.find({managerId: Number(managerId), status: 'valid', /*$or: [{endDate: null}, {endDate: {$gte: new Date()}}]*/}, function (err, stuff) {
                if(err) {
                    console.log(err);
                    return callback(err);
                }
                
                stuff.toArray(function (err, products) {
                    if(err) {
                        console.log(err);
                        return callback(err);
                    }
                    
                    return callback(err, products);
                });
            });
        });
    },
    
    deleteProduct: function (managerId, productId, callback) {
        db.mongoConnect({db: 'meeveep', collection: 'products'}, function (err, collection) {
            if(err) {
                console.log(err);
                return callback(err);
            }
        
            collection.update({managerId: Number(managerId), status: 'valid', productId: String(productId)}, {$set: {status: 'deleted', deleted: new Date(), by: Number(managerId)}}, function (err, stuff) {
                if(err) {
                    console.log(err);
                    return callback(err);
                }
                
                return callback(null);
            });
        });
    },
    
    deleteStar: function (managerId, starId, callback) {
        starId = Number(starId);
        
        module.exports.getStars(managerId, function (err, stars) {
            if(err) {
                return callback(err);
            }
            
            if(stars.indexOf(starId) >= 0) {
                // Star belongs to us
                db.mongoConnect({db: 'meeveep', collection: 'managers'}, function (err, collection, mongo) {
                    if(err) {
                        return callback(err);
                    }
                    
                    // Delete star from manager's account
                    collection.update({managerId: managerId}, { $pull: { stars: starId }, $addToSet: {formerStars: starId} }, function (err) {
                        if(err) {
                            return callback(err);
                        }
                        
                        require('./stars').getStar(starId, function (err, star) {
                            if(err) {
                                // Yawaa
                                return callback(err);
                            }
                            
                            require('./user').getUser(star.userId, function (err, user) {
                                if(err) {
                                    return callback(err);
                                }
                            
                                // Mark star as deleted
                                mongo.collection('stars', function (err, collection) {
                                    if(err) {
                                        // Yawaa
                                        return callback(err);
                                    }

                                    collection.update({starId: starId}, {$set: {status: 'Deleted', deleted: new Date()}}, function (err) {
                                        if(err) {
                                            return callback(err);
                                        }

                                        // Delete the star user...
                                        mongo.collection('users', function (err, collection) {
                                            if(err) {
                                                return callback(err);
                                            }
                                            
                                            var deleteId = util.generateKey(12) + '_';
                                            user = user.userData;
                                            console.log(user);
                                            
                                            // Mark user as deleted, change email and username
                                            console.log(cli.bgGreen('Query'), {userId: user.userId});
                                            collection.update({userId: user.userId}, {$set: {status: 'Deleted', why: 'StarGone', deleted: new Date(), username: deleteId + user.username, password: '', email: deleteId + user.email, deleteId: deleteId}}, function (err) {
                                                if(err) {
                                                    return callback(err);
                                                }
                                                
                                                // Successfully deleted user...
                                                // Delete all unsigned autographs
                                                mongo.collection('orders', function (err, collection) {
                                                    if(err) {
                                                        return callback(err);
                                                    }
                                                    
                                                    collection.update({starId: starId, pending: true}, {$set: {status: 'Deleted', deleted: new Date(), why: 'StarGone', pending: false}}, {multi: true}, function () {
                                                        if(err) {
                                                            return callback(err);
                                                        }
                                                        
                                                        // Delete all products relating to star
                                                        mongo.collection('products', function (err, collection) {
                                                            if(err) {
                                                                return callback(err);
                                                            }
                                                            
                                                            collection.update({starId: starId}, {$set: {deleted: new Date, why: 'StarGone', status: 'Deleted'}}, {multi: 1}, function (err) {
                                                                if(err) {
                                                                    return callback(err);
                                                                }
                                                                
                                                                // Delete user from cache
                                                                var fn = function () {console.log(arguments);};
                                                                
                                                                db.redisConnect(function (err, client) {
                                                                    if(!err) {
                                                                        client.multi()
                                                                            .del('auth:user:' + user.username)
                                                                            .del('auth:user:' + user.userId)
                                                                          .exec(fn);
                                                                    }
                                                                });
                                                                
                                                                // We are done deleting star
                                                                console.log(cli.green('STAR DELETED'));
                                                                console.log(cli.bgYellow('Username'), user.username);
                                                                console.log(cli.bgYellow('User ID'), user.userId);
                                                                return callback(null);
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            } else {
                return callback("Star not found in manager's account");
            }
        });
    }
};
