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
                    var view = {
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
                        txtRecording: 'txtRecording',
                        serializeIncludes: function () {
                            return JSON.stringify(this.card.includes);
                        },

                        post_scripts: [
                            { src: '/js/book.js' },
                            { src: '/js/star.js' },
                            {src: '/socket.io/socket.io.js'},
                            {src: '/js/lib/recorder.js'}
                        ],
                        partials: {
                            tailer: 'main/autographs/sign-overlay',
                            sidebar: 'sidebar/video'
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
    updateMedia: function (req, res, next) {
        var medium = req.params.medium; // What we are to update

        req.requireLogin(function (currentUser) {
            var payload = req.body[medium],
                orderId = req.params.orderId;

            if(medium === 'signature') {
                payload = req.body;
                // Verify that we have a valid signature
                if (!(typeof payload === 'object' &&
                        payload.referenceFrame &&
                        payload.referenceFrame.length === 2 &&
                        payload.strokes.length >= 1
                    ))
                {
                    return res.json({error: 'Invalid signature'}, 401).end();
                }
            }

            // Valid signature. Verify the ownership of the card
            if(currentUser.starId) {
                orders.getOrder(orderId, function (err, order) {
                    if(err) {
                        return res.json(error, 500).end();
                    }

                    if(order.starId !== currentUser.starId) {
                        return res.json({error: 'Not your card'}, 403).end();
                    }

                    var obj = {};
                    obj[medium] = payload;

                    orders.updateCard (orderId, obj, function (err, ok) {
                        if(err) {
                            console.error(err);
                            return res.json(error, 500).end();
                        }

                        res.json({ok: true}).end();
                    });
                });
            } else {
                res.json({error: 'Unauthorised'}, 403).end();
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

    /**
     * Mark an order as rejected. A rejected order is not charged (assumed).
     */
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
                            console.error(err);
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
    },

    /**
     * Displays the "add card" page. This page is called both with GET and POST,
     * depending.
     */
    addCardPage: function (req, res, next) {
        // TODO: This might change to req.requirePrivilege if the page is available to
        // the admin instead of to the star.
        req.requireLogin(function (currentUser) {
            // TODO: if this page is available to the star instead of to the
            // admin, we have to do a check to satisfy we are dealing with the star
            var view = {
                txt_generate_comm: 'txtGenerateComm',
                txt_select_celeb_name: 'txtSelectCelebName',
                txt_select_lang: 'txtSelectLang',
                body: {
                    id: 'create-page'
                },
                post_scripts: [
                    { src: '/js/star.js' }
                ],
                css_files: [
                    '/css/uniform.default.css'
                ]
            };

            renderer.render({page: 'main/cards/add', vars: view}, req, res, next);
        });
    },

    addCard: function (req, res, next) {

    }
};
