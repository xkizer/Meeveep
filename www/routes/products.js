
var db = require('../util/db'),
    cli = require('cli-color'),
    util = require('../util/util'),
    stars = require('../controllers/stars'),
    products = require('../controllers/products'),
    orders = require('../controllers/orders.js');

var renderer = require('../util/pageBuilder.js')();


module.exports = {
    order: function (req, res, next) {
        var step = req.params.step;
                
        var bookFn = productOrdering[step];
        
        if(bookFn) {
            return bookFn(req, res, next);
        }
        
        // Let express handle the 404
        next();
    }
};


/**
 * The steps of the star booking process.
 * Each numerical property of the object represents a step. Each non-numerical
 * property represents a helper function.
 */
var productOrdering = {
    1: function (req, res, next) {
        var productId = req.params.productId;
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star info
            products.getProduct(productId, true, function (err, product) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
                
                if(!product) {
                    console.error('Product not found');
                    return res.send('Product not found', 404).end();
                }
                
                stars.getStar(product.starId, function (err, star) {
                    if(err) {
                        console.error(err);
                        res.send('Something went wrong', 500).end();
                        return;
                    }
                    
                    star.getCards(function (err, cards) {
                        // Star found, render the star booking form
                        var view = {
                            star: star,
                            txt_of: {text: 'txtOf', filter: 'toLowerCase'},
                            user: currentUser.userData,
                            txt_summary: 'txtSummary',
                            post_scripts: [{
                                src: '/js/book.js'
                            }],
                            cards: cards,
                            txt_message_to: 'txtMsgTo',
                            txt_pencil_color: 'txtPencilColor',
                            txt_autograph_includes: 'txtAutographIncludes',
                            audio: 'txtAudio',
                            video: 'txtVideo',
                            hq_video: 'txtHQVideo',
                            txt_card: 'txtCard',
                            sidebar_title: 'txtAutographCardOptions',
                            body: {
                                id: 'preview-page'
                            },
                            partials: {
                                sidebar: 'sidebar/book'
                            }
                        };

                        renderer.render({page: 'main/star/book-1', vars: view}, req, res, next);
                    });
                });
            });
        });
    },

    2: function (req, res, next) {
        var productId = req.params.productId,
            ctrlStar = stars,
            cardId = req.query.cardId || false;
        
        if(!cardId) {
            // Error, 401
            console.error('Card ID not supplied');
            return res.send('Where is the card ID?', 401);
        }
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star info
            products.getProduct(productId, true, function (err, product) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
            
                if(!product) {
                    console.error('Product not found');
                    return res.send('Product not found', 404).end();
                }
                
                stars.getStar(product.starId, function (err, star) {
                    if(err) {
                        // Something went wrong...
                        console.error(err);
                        return res.send(500, 'Something went wrong');
                    }
                    
                    // Verify the user has a valid card
                    ctrlStar.getCard(cardId, function (err, card) {
                        if(err) {
                            // Something went wrong...
                            console.error(err);
                            return res.send(500, 'Something went wrong');
                        }

                        var colors = ['red','orange','yellow','green','cyan','blue','purple','pink','black','white'];
                        var penColors = [];
                        var colorSelected = false;

                        colors.forEach(function (e) {
                            var t = {color: e};

                            if(req.query['pen-color'] === e) {
                                t.selectedColor = colorSelected = true;
                            }

                            penColors.push(t);
                        });

                        if(!colorSelected) {
                            // No color selected, default to black
                            penColors[penColors.length - 2].selectedColor = true;
                        }

                        // Star found, render the star booking form
                        var view = {
                            star: star,
                            pen_colors: penColors,
                            user: currentUser.userData,
                            txt_for: 'txtFor',
                            txt_of: {text: 'txtOf', filter: 'toLowerCase'},
                            txt_step: 'txtStep',
                            txt_summary: 'txtSummary',
                            autograph: req.query,
                            txt_message_to: 'txtMsgTo',
                            txt_pencil_color: 'txtPencilColor',
                            txt_autograph_includes: 'txtAutographIncludes',
                            audio: 'txtAudio',
                            video: 'txtVideo',
                            hq_video: 'txtHQVideo',
                            sidebar_title: 'txtAddComment',
                            card: card,
                            txt_card_for: 'txtCardFor',
                            txt_what_should_msg_include: 'txtWhatShouldMsgIncl',
                            txt_side_intro: {text: 'txtBook2SideIntro', variables: [star.name]},
                            body: {
                                id: 'preview-page'
                            },
                            post_scripts: [{
                                src: '/js/book.js'
                            }],
                            partials: {
                                sidebar: 'sidebar/book-2'
                            }
                        };

                        renderer.render({page: 'main/star/book-2', vars: view}, req, res, next);
                    });
                });
            });
        });
    },

    3: function (req, res, next) {
        var productId = req.params.productId,
            ctrlStar = stars,
            cardId = req.query.cardId || false;
        
        if(!cardId) {
            // Error, 401
            console.error('Card ID not supplied');
            return res.send('Where is the card ID?', 401);
        }
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star and product info
            products.getProduct(productId, function (err, product) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
                
                if(!product) {
                    console.error('Product not found');
                    return res.send('Product not found', 404).end();
                }
                
                stars.getStar(product.starId, function (err, star) {
                    if(err) {
                        console.error(err);
                        res.send('Something went wrong', 500).end();
                        return;
                    }

                    if(!star) {
                        console.error('Star not found');
                        return res.send('Star not found', 404).end();
                    }

                    // Verify the user has a valid card
                    ctrlStar.getCard(cardId, function (err, card) {
                        if(err) {
                            // Something went wrong...
                            console.error(err);
                            return res.send(500, 'Something went wrong');
                        }

                        // Star found, render the star booking confirmation page
                        var view = {
                            star: star,
                            user: currentUser,
                            txt_for: 'txtFor',
                            txt_of: {text: 'txtOf', filter: 'toLowerCase'},
                            txt_step: 'txtStep',
                            txt_summary: 'txtSummary',
                            autograph: req.query,
                            txt_message_to: 'txtMsgTo',
                            txt_payment_method: 'txtPaymentMethod',
                            txt_pencil_color: 'txtPencilColor',
                            txt_autograph_includes: 'txtAutographIncludes',
                            txt_via_paypal: 'txtCCWithPaypal',
                            audio: 'txtAudio',
                            video: 'txtVideo',
                            hq_video: 'txtHQ',
                            txt_terms: 'txtTerms',
                            sidebar_title: 'txtYourOrder',
                            card: card,
                            txt_card_for: 'txtCardFor',
                            txt_accept_cond_left: 'txtAcceptCondTTL',
                            txt_receive_newsletter: 'txtWishToRecNlt',
                            txt_total_price: 'txtTotalPrice',
                            price: '%.2f'.printf(product.price),
                            txt_what_should_msg_include: 'txtWhatShouldMsgIncl',
                            txt_billing_address: 'txtBillingAddress',
                            txt_incl_vat: 'txtInclVAT',
                            txt_edit: {text: 'txtEdit', filter: 'toLowerCase'},
                            txt_place_order: 'txtPlaceOrder',
                            txt_next_step_wait: 'txtOrderWaitWarning',
                            txt_side_intro: {text: 'txtBook2SideIntro', variables: [star.name]},
                            css_files: [{
                                href: '/css/uniform.default.css'
                            }],
                            post_scripts: [{
                                src: '/js/book.js'
                            }],
                            partials: {
                                sidebar: 'sidebar/book-3',
                                terms: 'trans/en-us/terms'
                            }
                        };
                        
                        product.includes.forEach(function (incl) {
                            view['includes_' + incl] = true;
                        });

                        renderer.render({page: 'main/star/book-3', vars: view}, req, res, next);
                    });
                });
            });
        });
    },
    
    4: function (req, res, next) {
        // The fourth step saves the autograph and redirects to home page
        // TODO: Verification
        var autograph = req.query,
            productId = req.params.productId,
            ctrlStar = stars,
            cardId = req.query.cardId || false;
        
        if(!cardId) {
            // Error, 401
            console.error('Card ID not supplied');
            return res.send('Where is the card ID?', 401);
        }
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star and product info
            products.getProduct(productId, function (err, product) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
                
                if(!product) {
                    console.error('Product not found');
                    return res.send('Product not found', 404).end();
                }
                
                stars.getStar(product.starId, function (err, star) {
                    if(err) {
                        console.error(err);
                        res.send('Something went wrong', 500).end();
                        return;
                    }

                    if(!star) {
                        console.error('Star not found');
                        return res.send('Star not found', 404).end();
                    }
                    
                    // Verify the user has a valid card
                    ctrlStar.getCard(cardId, function (err, card) {
                        if(err) {
                            // Something went wrong...
                            console.error(err);
                            return res.send(500, 'Something went wrong');
                        }

                        // Everything okay, save
                        autograph.extend({
                            star: star,
                            user: currentUser,
                            date: new Date(),
                            card: card,
                            product: product
                        });
                        
                        orders.placeOrder(autograph, function (err, orderNumber) {
                            if(err) {
                                console.log(err);
                                console.error(cli.red('something went wrong'), err);
                                return res.send(500, 'Something went wrong!').end();
                            }
                            
                            util.createNonce({orderId: orderNumber, orderComplete: true}, function (err, nonce) {
                                res.redirect('/?oc=1&ptx=' + nonce.key);
                            });
                        });
                    });
                });
            });
        });
    }
};


