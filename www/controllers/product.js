/**
 * Product management
 */

var cli = require('cli-color'),
    db = require('../util/db'),
    util = require('../util/util');



module.exports = {
    /**
     * Create a new product
     * @param {object} data A hash of the product properties
     * @param {function} callback Callback receives an error object and the ID of
     * the new product
     */
    createProduct: function (data, callback) {
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
    }
};

