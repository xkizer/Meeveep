/* 
 * Media manipulation/recording/streaming
 */

var media = require('../controllers/media.js');
var stars = require('../controllers/stars.js');
var cli = require('cli-color');
var error = require('../util/error.js');
var orders = require('../controllers/orders.js');

module.exports = {
    createSession: function (req, res, next) {
        // Sessions are created on the cache server and written to disk only
        // when the recording has began
        
    }
};
