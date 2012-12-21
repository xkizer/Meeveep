var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js');

// Fields we are allowed to sort by
sortFields = ['price','name'];


module.exports = {
    getStars: getStars,
    getStar: getStar,
    placeOrder: placeOrder,
    getCard: getCard,
    toString: function () {
        return '[controller#Stars:controllers/stars.js]';
    }
}


/**
 * Search the star database for stars
 * @param filter A hash of search parameters
 * @param callback The callback receives an error object and an object describing the search outcome
 */
function getStars (filter, callback) {
    if(arguments.length < 2) {
        callback = filter;
        filter = {};
    }
    
    db.mongoConnect({db: 'meeveep', collection: 'stars'}, function (err, collection) {
        if(err) {
            return callback(error(0x9000));
        }
        
        // Inspect the filter...
        var qry = {},
            sort = {},
            skip = false,
            limit = false,
            opt = {};
        
        // filter.sort sorts by key
        // filter.dir tells the sort direction
        if(filter.sort) {
            if(sortFields.indexOf(filter.sort) >= 0) {
                var dir = 1;
                
                if(filter.dir) {
                    filter.dir = Number(filter.dir);
                    
                    if(filter.dir === -1 || filter.dir === 1) {
                        dir = filter.dir;
                    }
                }
                
                sort[filter.sort] = dir;
            }
        }
        
        // filter.skip tells us the number of fields to skip
        if(filter.skip && Number(filter.skip)) {
            skip = Number(filter.skip);
        }
        
        // filter.limit tells us the max number of results to get
        if(filter.limit && Number(filter.limit)) {
            limit = Number(filter.limit);
        }
        
        // filter.query is the search string
        if(filter.query) {
            qry.search = String(filter.query);
        }
        
        if(filter.price) {
            var price = filter.price;
            
            if(price instanceof Array && price.length === 2) {
                // A range
                qry.price = {$gte: Number(price[0]), $lte: Number(price[1])};
            } else if (Number(price)) {
                // A single value... this is very unlikely, but we include it, just in case.
                qry.price = Number(price);
            } else if (price instanceof Object) {
                // A hash
                if(price.low) {
                    qry.price = {$gte: Number(price.low)};
                }
                
                if(price.high) {
                    qry.price = qry.price || {};
                    qry.price.$lte = Number(price.high);
                }
            }
        }
        
        var fields = {search: false};
        
        if(filter.fields && filter.fields instanceof Array) {
            fields = {};
            
            // Get specific fields
            fields.forEach(function (f) {
                fields[f] = 1;
            });
        }
        
        // There will be some other filters, such as expertise, nationality, gender, etc
        var cursor = collection.find(qry, fields);
        
        sort && cursor.sort(sort);
        limit && cursor.limit(limit);
        skip && cursor.skip(skip);
        
        /*
         The star objects should contain the following information:
            name    => star's name
            price   => autograph cost
            sale    => whether or not there is a discount
            search  => a serialization of all searchable string parameters, for easy case-insensitive searching. this does not need to be returned
            starId  => the unique ID of the star. we do not use _id for identification
         */
        
        // Done
        cursor.toArray(function (err, stars) {
            if(err) {
                return callback(error(0x9000));
            }
            
            callback(null, stars);
        });
    });
}

/**
 * Get the star idenified by starId
 * @param starId The starId (not mongoDB's ObjectID)
 * @param callback Callback receives the obvious error object and star object
 */
function getStar (starId, callback) {
    db.mongoConnect({db: 'meeveep', collection: 'stars'}, function (err, collection) {
        if(err) {
            return callback(error(0x9001));
        }
        
        collection.findOne({starId: Number(starId)}, function (err, star) {
            if(err) {
                return callback(error(0x9001));
            }
            
            if(!star) {
                
                return callback(error(0x9002));
            }
            
            return callback(null, star.extend(starProto));
        });
    });
}

/**
 * Retrieve a card from the database
 * @param {string|number} cardId The ID of the card
 * @param {Function} callback Callback receives an error object and the card information
 */
function getCard (cardId, callback) {
    db.mongoConnect({db: 'meeveep', collection: 'cards'}, function (err, collection) {
        if(err) {
            console.error('Error connecting to database');
            return callback(error(0x9106, err));
        }
    
        collection.findOne({cardId: Number(cardId)}, function (err, card) {
            if(err) {
                console.error('error querying card');
                return callback(error(0x9105, err));
            }
        
            if(!card) {
                // Card not found
                return callback(error(0x9104));
            }
        
            return callback(null, card);
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
    
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection) {
        if(err) {
            // Something went wrong...
            // TODO: Handle errors correctly
            return callback(err);
        }
    
        collection.insert(orderInfo, function (err) {
            if(err) {
                // Something went wrong...
                // TODO: Handle errors correctly
                return callback(err);
            }
            
            callback(null, orderId);
        });
    });
}

var starProto = {
    getCards: function (callback) {
        var star = this;
        
        if(!star.cards) {
            return callback(null, []);
        }
        
        // Get a list of all cards associated with the star
        db.mongoConnect({db: 'meeveep', collection: 'cards'}, function (err, collection) {
            // Query the star's cards
            collection.find({cardId: {$in: star.cards}}, function (err, cursor) {
                cursor.toArray(callback);
            });
        });
    }
};

