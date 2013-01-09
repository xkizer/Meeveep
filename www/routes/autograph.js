/* 
 * Autograph signing, manipulation and viewing routes
 */

var renderer = require('../util/pageBuilder.js')();
var stars = require('../controllers/stars.js');
var cli = require('cli-color');
var error = require('../util/error.js');
var orders = require('../controllers/orders.js');

module.exports = {
    /**
     * Page that allows the star to sign autographs
     */
    unsigned: function (req, res, next) {
        // Check if user is logged in...
        req.requireLogin(function (currentUser) {
            var userInfo = currentUser;
            
            if(!userInfo.starId) {
                // The user is not a star
                var err = error(0x9343);
                return next(); // Let the 404 be handled by express
            }
            
            // User is a star. Get star info.
            var starId = userInfo.starId;
            
            stars.getStar(starId, function (err, star) {
                // Get the autographs that are waiting for the star
                stars.getUnsignedAutographs(starId, function (err, autographs) {
                    if(err) {
                        return res.send(err.message, 500).end();
                    }
                    
                    // Normalize cards
                    autographs.forEach(function (card) {
                        if(card.signature) {
                            card.signature = JSON.stringify(card.signature);
                        }
                    });
                    
                    // Render the page based on fetched information
                    view = {
                        star: star,
                        cards: autographs,
                        txtFor: 'txtFor',
                        txtCard: 'txtCard',
                        txtOf: {text: 'txtOf', filter: 'toLower'},
                        txtAddCard: 'txtAddCard',
                        txtRecordVideo: 'txtRecordVideo',
                        txtRecordVideoDescr: 'txtRecordVideoDescr',
                        txtRecordAudio: 'txtRecordAudio',
                        txtRecordAudioDescr: 'txtRecordAudioDescr',
                        txtAddSignature: 'txtAddSignature',
                        txtAddSignatureDescr: 'txtAddSignatureDescr',
                        
                        post_scripts: [
                            { src: '/js/book.js' },
                            { src: '/js/star.js' }
                        ],
                        partials: {
                            tailer: 'main/autographs/sign-overlay'
                        }
                    };
                    
                    renderer.render({page: 'main/autographs/unsigned', vars: view}, req, res, next);
                });
            });
        });
    },
    
    /**
     * Updates an order card
     */
    updateSignature: function (req, res, next) {
        req.requireLogin(function (currentUser) {
            var signature = req.body,
                orderId = req.params.orderId;
            
            // Verify that we have a valid signature
            if (typeof signature === 'object' &&
                    signature.referenceFrame &&
                    signature.referenceFrame.length === 2 &&
                    signature.strokes.length >= 1
                )
            {
                // Valid signature. Verify the ownership of the card
                if(currentUser.starId) {
                    orders.getOrder(orderId, function (err, order) {
                        if(err) {
                            return res.json(error, 500).end();
                        }
                        
                        if(order.starId !== currentUser.starId) {
                            return res.json({error: 'Not your card'}, 403).end();
                        }
                        
                        orders.updateCard (orderId, {signature: signature}, function (err, ok) {
                            if(err) {
                                return res.json(error, 500).end();
                            }
                            
                            res.json({ok: true}).end();
                        });
                    });
                } else {
                    res.json({error: 'Unauthorised'}, 403).end();
                }
            } else {
                res.json({error: 'Invalid signature'}, 401).end();
            }
        });
    },
    
    /**
     * Accept an order (mark as "complete"). Happens when the star signs the card
     * and clicks "accept".
     */
    acceptOrder: function (req, res, next) {
        req.requireLogin(function (currentUser) {
            var orderId = req.params.orderId;

            // Verify the ownership of the card
            if(currentUser.starId) {
                orders.getOrder(orderId, function (err, order) {
                    if(err) {
                        return res.json(error, 500).end();
                    }

                    if(order.starId !== currentUser.starId) {
                        return res.json({error: 'Not your card'}, 403).end();
                    }
                
                    // TODO: verify that all required components of the card has
                    // been included.
                    
                    // TODO: Charge the user here before marking the card
                    
                    // Update card
                    orders.updateCard (orderId, {pending: false, status: 'Signed'}, function (err, ok) {
                        if(err) {
                            return res.json(error, 500).end();
                        }

                        res.json({ok: true}).end();
                        
                        // TODO: notify the user that the card has been accepted
                        // and do some other background stuff
                        
                    });
                });
            } else {
                res.json({error: 'Unauthorised'}, 403).end();
            }
        });
    },
    
    rejectOrder: function (req, res, next) {
        req.requireLogin(function (currentUser) {
            var orderId = req.params.orderId;

            // Verify the ownership of the card
            if(currentUser.starId) {
                orders.getOrder(orderId, function (err, order) {
                    if(err) {
                        return res.json(err, 500).end();
                    }

                    if(order.starId !== currentUser.starId) {
                        return res.json({error: 'Not your card'}, 403).end();
                    }
                
                    // Update card
                    orders.updateCard (orderId, {pending: false, status: 'Rejected'}, function (err, ok) {
                        if(err) {
                            console.log(err);
                            return res.json(error, 500).end();
                        }

                        res.json({ok: true}).end();
                        
                        // TODO: notify the user that the card has been rejected
                        // and do some other background stuff
                        
                    });
                });
            } else {
                res.json({error: 'Unauthorised'}, 403).end();
            }
        });
    }
};
