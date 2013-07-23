
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
    },
    
    search: function (req, res, next) {
        // Get the list of products
        var qry = {limit: 10, checkAvailable: true};

        if(typeof req.query.category === 'string') {
            qry.category = req.query.category;
        }

        if(typeof req.query.q === 'string' && req.query.q.trim()) {
            qry.search = req.query.q;
        }
        
        if(typeof req.query.limit === 'string') {
            var limit = parseInt(req.query.limit);
            
            qry.limit = Math.max(1, Math.min(limit, 200));
        }
        
            
        products.getProducts(qry, function (err, products) {
            if(err) {
                // Something bad
                return res.json({error: 'Failed to retrieve products list'}, 500);
            }

            var prods = [],
                counter = products.length;

            // Add images to the objects
            products.forEach(function (product) {
                var prod = {};
                prod.includes   = product.includes;
                prod.price      = '%.2f'.printf(product.price);
                prod.name       = product.star.name;
                prod.productId  = product.productId;

                stars.getStar(product.starId, function (err, star) {
                    if(err || !star) {
                        counter--;
                        return counter || next();
                    }

                    stars.getProfilePicture(product.starId, function (err, picture) {
                        counter--;

                        if(err || !star) {
                            return counter || next();
                        }

                        prod.thumbnail = picture;
                        prods.push(prod);
                        return counter || next();
                    });
                });
            });

            function next () {
                res.json(prods);
            }

            if(products.length === 0) {
                next();
            }
        });
    },
    
    getCards: function (req, res, next) {
        var productId = req.params.productId;
        
        // Get the card for the star associated with the product
        products.getProduct(productId, function (err, product) {
            if(err) {
                return res.json({error: 'Unable to get product details'});
            }
            
            stars.getStar(product.starId, function (err, star) {
                if(err) {
                    return res.json({error: 'Unable to get star associated with product'});
                }

                star.getCards(function (err, cards) {
                    if(err) {
                        return res.json({error: 'Unable to load cards'});
                    }
                    
                    var cds = [];
                    var copy = ['67x', '152x157', '340x227', '633x420', 'original', 'cardId', 'starId'];
                    
                    cards.forEach(function (card) {
                        var cd = {}, prop;
                        
                        for(var i = 0; i < copy.length; i++) {
                            prop = copy[i];
                            cd[prop] = card[prop];
                            console.log(prop);
                            
                            if('object' === typeof cd[prop] && cd[prop].path) {
                                cd[prop] = cd[prop].path;
                            }
                        }
                        
                        cds.push(cd);
                    });
                    
                    res.json(cds);
                });
            })
        });
    },
    
    placeOrder: function (req, res, next) {
        // The fourth step saves the autograph and redirects to home page
        // TODO: Verification
        var autograph = req.body,
            productId = autograph.productId,
            ctrlStar = stars,
            cardId = autograph.cardId || false;
        
        if(!cardId) {
            // Error, 401
            console.error('Card ID not supplied');
            return res.json({error: 'Where is the card ID?'}).end();;
        }
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star and product info
            products.getProduct(productId, function (err, product) {
                if(err) {
                    console.error(err);
                    res.json({error: 'Something went wrong'}).end();
                    return;
                }
                
                if(!product) {
                    console.error('Product not found');
                    return res.json({eror: 'Product not found'}, 404).end();
                }
                
                stars.getStar(product.starId, function (err, star) {
                    if(err) {
                        console.error(err);
                        res.json({error: 'Something went wrong'}, 500).end();
                        return;
                    }

                    if(!star) {
                        console.error('Star not found');
                        return res.json({error: 'Star not found'}, 404).end();
                    }
                    
                    // Verify the user has a valid card
                    ctrlStar.getCard(cardId, function (err, card) {
                        if(err) {
                            // Something went wrong...
                            console.error(err);
                            return res.json({error: 'Something went wrong'});
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
                                console.error(cli.red('something went wrong'), err);
                                return res.json({error: 'Something went wrong!'}, 500).end();
                            }
                            
                            res.json({success: true});
                        });
                    });
                });
            });
        });
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
                            user: currentUser.userData,
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


