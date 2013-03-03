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
        
            collection.find({managerId: Number(managerId), status: 'valid', $or: [{endDate: null}, {endDate: {$gte: new Date()}}]}, function (err, stuff) {
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
        
            collection.update({managerId: Number(managerId), status: 'valid', productId: String(productId)}, {$set: {status: 'deleted', deleted: new Date()}}, function (err, stuff) {
                if(err) {
                    console.log(err);
                    return callback(err);
                }
                
                return callback(null);
            });
        });
    }
};
