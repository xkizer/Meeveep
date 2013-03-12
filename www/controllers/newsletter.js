/**
 * Newlstter management
 */

var util = require('../util/util'),
    db = require('../util/db');

 module.exports = {
     subscribe: function (email, callback) {
         var subscriptionId = util.generateKey(34);
         email = String(email);
         
         this.isSubscribed(email, function (err, subscribed) {
            if(err) {
                return callback(err);
            }

            if(subscribed) {
                // Already subscribed
                return callback(email + ' is already subscribed');
            }
             
            db.mongoConnect({db: 'meeveep', collection: 'newsletter'}, function (err, collection) {
                if(err) {
                    return callback(err);
                }

                collection.insert({
                    subscriptionId: subscriptionId,
                    email: String(email),
                    subscriptionDate: new Date()
                }, function (err) {
                   if(err) {
                       return callback(err);
                   }

                   return callback(null, subscriptionId);
                });
            });
         });
     },
     
     isSubscribed: function (email, callback) {
         db.mongoConnect({db: 'meeveep', collection: 'newsletter'}, function (err, collection) {
             if(err) {
                 return callback(err);
             }
             
             collection.findOne({email: String(email)}, function (err, subscription) {
                 if(err) {
                     return callback(err);
                 }
                 
                 if(subscription) {
                     return callback(null, true);
                 }
             });
         });
     },
     
     getSubscription: function (subId, callback) {
         db.mongoConnect({db: 'meeveep', collection: 'newsletter'}, function (err, collection) {
             if(err) {
                 return callback(err);
             }
             
             collection.findOne({$or: [{email: String(subId)}, {subscriptionId: String(subId)}]}, function (err, subscription) {
                 if(err) {
                     return callback(err);
                 }
                 
                 if(subscription) {
                     return callback(null, subscription);
                 } else {
                    return callback('Subscription not found');
                 }
             });
         });
     }
 };