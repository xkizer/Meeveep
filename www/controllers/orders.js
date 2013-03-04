/**
 * Controller for orders. Some functions are located in the stars controller.
 * TODO: import the functions that are located at the stars controller.
 */

var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js'),
    cli = require('cli-color');

module.exports = {
    getOrder: getOrder,
    updateCard: updateCard,
    placeOrder: placeOrder,
    
};

/**
 * Get an order from the database
 * @param {string} orderId The ID of the order
 * @param {function} callback Callback receives an error object and the order
 */
function getOrder (orderId, callback) {
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection) {
        if(err) {
            return callback(error(0x9A01, err));
        }
        
        collection.findOne({orderId: String(orderId)}, function (err, order) {
            if(err) {
                return callback(error(0x9A03, err));
            }
            
            if(!order) {
                return callback(error(0x9A02));
            }
            
            return callback(null, order);
        });
    });
}


/**
 * Update a particular autograph request. This function should not be confused
 * with cards.updateCard in the cards controller. This method updates a particular
 * autograph request.
 * @param {string} orderId The ID of the card to update
 * @param {object} data A hash of the fields to update
 * @param {function} callback Callback receieves an error object and a boolean
 */
function updateCard (orderId, data, callback) {
    var unupdatable = ['starId','cardId','_id','date','updated','orderId','star','card','user','userId'];
    var update = {updated: new Date};
    var regExp = /^\s*\$/;
    
    for(var i in data) {
        if(data.hasOwnProperty(i) && unupdatable.indexOf(i) < 0 && !i.match(regExp)) {
            update[i] = data[i];
        }
    }
    
    // Update
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection) {
        if(err) {
            return callback(error(0x9A13, err));
        }
        
        collection.update({orderId: String(orderId)}, {$set: update}, function (err, done) {
            if(err) {
                return callback(error(0x9A14, err));
            }
            
            callback(null, true);
        });
    });
}

/**
 * Place an order
 * @param orderInfo The information about the order
 * @param callback The callback function
 * @todo This method currently implements no verification. Implement basic
 * verification.
 */
function placeOrder (orderInfo, callback) {
    orderInfo.userId = orderInfo.user.userId; // Indexing purpose
    orderInfo.starId = orderInfo.star.starId; // Indexing purpose
    orderInfo.pending = true;
    var orderId = util.generateKey(28);
    orderInfo.orderId = orderId;
    
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection, db) {
        // Verify the product exists and quantities remain
        db.collection('products', function (err, prods) {
            if(err) {
                // Something went wrong...
                return callback(error(0x9A15, err));
            }
            
            prods.findOne({prodictId: orderInfo.product.productId}, function () {
                
            });

            collection.insert(orderInfo, function (err) {
                if(err) {
                    console.log(cli.green('ORDER INFO'), orderInfo);
                    // Something went wrong...
                    return callback(error(0x9A16, err));
                }

                callback(null, orderId);
            });
        });
    });
}

