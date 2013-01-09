/**
 * Autograph cards controller. Some of the card manipulation functions
 * are located in the stars controller.
 */

var db = require('../util/db.js'),
    error = require('../util/error.js'),
    util = require('../util/util.js');

module.exports = {
//    createCard: createCard,
    updateCard: updateCard,
    
};

// A blacklist of fields that cannot be updated
var unupdatable = ['starId','cardId','_id','created','updated'];

function updateCard (cardId, information, callback) {
    // Make a list of things to update
    var update = {updated: new Date};
    
    information.forEach();
}
