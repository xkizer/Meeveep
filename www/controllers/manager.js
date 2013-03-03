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
    }
};
