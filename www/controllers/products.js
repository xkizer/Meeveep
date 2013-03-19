
var db = require('../util/db'),
    cli = require('cli-color'),
    util = require('../util/util'),
    stars = require('./stars');

var sortFields = ['price','name'];

module.exports = {
    getProducts: getProducts,
    createProduct: createProduct,
    getProduct: getProduct
};

/**
 * Get a list of products matching provided filter
 * @param {object} filter The filter to match
 * @param {function} callback The callback receives an error object and an
 * object describing the search outcome
 */
function getProducts (filter, callback) {
    if(arguments.length < 2) {
        callback = filter;
        filter = {};
    }
    
    db.mongoConnect({db: 'meeveep', collection: 'products'}, function (err, collection) {
        if(err) {
            return callback(err);
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
        
        if(filter.search && typeof filter.search === 'string') {
            var names = filter.search.split(/\s+/);
            qry['star.name'] = new RegExp('(' + names.join('|') + ')', 'i');
        }
        
        if(filter.category) {
            qry['star.category'] = String(filter.category);
        }
        
        if(filter.subcategory) {
            qry['star.subcategory'] = String(filter.subcategory);
        }
        
        // Mandatory search conditions
        var now = new Date();
        
        if(filter.checkAvailable) {
            qry.extend({
                $and: [
                    {
                        $or: [
                            {endDate: { '$gte': now }},
                            {endDate: null}
                        ]
                    },

                    {
                        $or: [
                            {startDate: null},
                            {startDate: { '$lte': now }}
                        ]
                    },
                    {
                        status: 'valid'
                    },
                    {
                        available: {$gt: 0}
                    }
                ]
            });
        }
        
        // There will be some other filters, such as expertise, nationality, gender, etc
        collection.find(qry, fields, function (err, cursor) {
            if(err) {
                return callback(err);
            }

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
                    return callback(err);
                }

                callback(null, stars);
            });
        });
    });
}

/**
 * Get a particular product
 * @param {string} productId The ID of the product
 * @param {function} callback The callback receives an error object and the product if found
 */
function getProduct(productId, callback) {
    var verify = false;
    
    if(arguments.length === 3) {
        // Third argument, maybe a request to verify
        callback = arguments[2];
        verify = arguments[1];
    }
    
    db.mongoConnect({db: 'meeveep', collection: 'products'}, function (err, collection) {
        if(err) {
            return callback(err);
        }
        
        var qry = {productId: productId, status: 'valid'},
            now = new Date();
        
        if(verify) {
            qry.extend({
                $and: [
                    {
                        $or: [
                            {endDate: { '$gte': now }},
                            {endDate: null}
                        ]
                    },

                    {
                        $or: [
                            {startDate: null},
                            {startDate: { '$lte': now }}
                        ]
                    },
                    {
                        status: 'valid'
                    },
                    {
                        available: {$gt: 0}
                    }
                ]
            });
        }
        
        collection.findOne(qry, function (err, product) {
            if(err) {
                return callback(err);
            }
            
            if(!product) {
                return callback('Product not found');
            }
            
            callback(null, product);
        });
    });
}

/**
 * Create a new product
 * @param {object} data A hash of the product properties
 * @param {function} callback Callback receives an error object and the ID of
 * the new product
 */
function createProduct (data, callback) {
    // Verify data has some basics
    if(!data.includes || !data.price || !data.available || !data.starId || !data.managerId) {
        return callback('Incomplete product data');
    }

    var productId = util.generateKey(24);
    data = {}.extend(data);
    data.productId = productId;
    data.created = new Date();
    data.sold = 0;
    data.available = parseInt(data.available);
    data.status = 'valid';
    
    // Attach the star information
    stars.getStar(data.starId, function (err, star) {
        if(err) {
            return callback(err);
        }
        
        data.star = star;

        db.mongoConnect({db: 'meeveep', collection: 'products'}, function (err, collection) {
            if(err) {
                return callback(err);
            }

            collection.insert(data, function (err) {
                if(err) {
                    return callback(err);
                }

                return callback(null, productId);
            });
        });
    });
}
