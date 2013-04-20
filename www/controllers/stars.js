var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js'),
    users = require('./user'),
    cards = require('./cards'),
    cli = require('cli-color');

// Fields we are allowed to sort by
sortFields = ['price','name'];

module.exports = {
    getStars: getStars,
    getStar: getStar,
    getCard: getCard,
    getUnsignedAutographs: getUnsignedAutographs,
    toString: function () {
        return '[controller#Stars:controllers/stars.js]';
    },
    getCategories: getCategories,
    createStar: createStar,
    getProfilePicture: getProfilePicture,
    getDefaultCard: getDefaultCard,
    getLanguages: getLanguages
};


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
            return callback(error(0x9000, err));
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
                    return callback(error(0x9000, err));
                }

                callback(null, stars);
            });
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

/**
 * Gets all unsigned autographs that are for the specified star
 * @param {number} starId The ID of the star
 * @param {function} callback The callback function recieves an error object
 *      and a list of all unsigned autographs for the star
 */
function getUnsignedAutographs(starId, callback) {
    db.mongoConnect({db: 'meeveep', collection: 'orders'}, function (err, collection, db) {
        if(err) {
            return callback(error(0x9010, err));
        }
        
        collection.find({starId: starId, pending: true}, function (err, cursor) {
            if(err) {
                return callback(error(0x9011, err));
            }
            
            cursor.sort({date: 1}, function () {
                if(err) {
                    return callback(error(0x9011, err));
                }

                cursor.toArray(function (err, autographs) {
                    if(err) {
                        return callback(error(0x9012, err));
                    }

                    return callback(null, autographs);
                });
            });
        });
    });
}

/**
 * Get all supported categories, along with their subcategories
 * @param {function} callback The callback receives an error object and an
 *  array of categories
 */
function getCategories(callback) {
    db.mongoConnect({db: 'meeveep', collection: 'categories'}, function (err, collection) {
        if(err) {
            return callback(err);
        }
        
        collection.find({}, function (err, cursor) {
            if(err) {
                return callback(err);
            }
            
            cursor.toArray(function (err, cats) {
                if(err) {
                    return callback(err);
                }
                
                return callback(null, cats);
            });
        });
    });
}

/**
 * Creates a simple record making a user a star
 * @param {type} userId
 * @param {object} data A hash of the user's information
 * @param {type} callback
 * @returns {undefined}
 * @todo Refine method and related functions
 */
function createStar (userId, data, callback) {
    // Make sure we have a valid user
    userId = Number(userId);
    
    users.getUser(userId, function (err, user) {
        if(err) {
            return callback(err);
        }
        
        db.mongoConnect({db: 'meeveep', collection: 'stars'}, function (err, collection, meeveep) {
            if(err) {
                return callback(err);
            }

            var starId = Math.floor(Math.random() * 1E16);
            data.starId = starId;
            data.userId = userId;
            data.cards = [];
            
            if(data['profile-pic'])  {
                data.defaultCard = Number(data['profile-pic']);
            }

            delete data.password;
            delete data['profile-pic'];
            
            // Check for default card
            collection.insert(data, function (err) {
                if(err) {
                    return callback(err);
                }

                meeveep.collection('users', function (err, collection) {
                    collection.update({userId: userId}, {$set: {starId: starId}}, function (err) {
                        if(err) {
                            return callback(err);
                        }

                        callback(null, starId);

                        // Delete the user from cache
                        db.redisConnect(function (err, redis) {
                            if(err) {
                                return;
                            }
                            
                            redis.multi()
                                .del('auth:user:' + userId)
                                .del('auth:user:' + user.username)
                              .exec();
                        });
                    });
                });
            });
        });        
    });
}

function getDefaultCard (starId, callback) {
    getStar(starId, function (err, star) {
        if(err || !star) {
            return callback(err || 'Star not found');
        }
        
        // Check if we have a default picture
        if(star.defaultCard) {
            // Star has a default card set
            getCard(star.defaultCard, function (err, card) {
                if(err || !card) {
                    return getFirstCard();
                }
                
                // Card found
                return callback(null, card);
            });
        } else {
            getFirstCard();
        }
        
        function getFirstCard() {
            var cards = star.cards;
            
            if(cards && cards.length) {
                getCard(star.cards[0], function (err, card) {
                    if(err) {
                        return callback(err);
                    }

                    // Card found
                    return callback(null, card);
                });
            } else {
                return callback('Card not found'); // TODO: This should return a default card
            }
        }
    });
}

function getProfilePicture (starId, callback) {
    getDefaultCard(starId, function (err, card) {
        if(err) {
            return callback(err);
        }
        
        return callback(null, card['152x157'].path);
    });
}

/**
 * Get a list of all available languages that the star can register under
 * @param callback
 */
function getLanguages (callback) {
    db.mongoConnect({db: 'meeveep', collection: 'locales'}, function (err, collection) {
        if(err) {
            console.error(err);
            return callback(err);
        }
        
        collection.find({enabled: true}, function (err, cursor) {
            if(err) {
                console.error(err);
                return callback(err);
            }
            
            cursor.sort({name: 1}).toArray(function (err, langs) {
                if(err) {
                    console.error(err);
                }
                
                callback(err, langs);
            });
        });
    });
}