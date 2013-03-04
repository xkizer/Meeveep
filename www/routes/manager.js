/**
 * Management related routes
 */

var cli = require('cli-color'),
    stars = require('../controllers/stars.js'),
    step = require('../util/step.js'),
    manager = require('../controllers/manager.js'),
    i18n = require('../util/i18n'),
    util = require('../util/util'),
    products = require('../controllers/products'),
    fs = require('fs'),
    db = require('../util/db'),
    users = require('../controllers/user');

module.exports = {
    addStarForm: function (req, res, next) {
        var args = arguments;
        
        req.requireLogin(function (user) {
            if(args.length > 3) {
                var err = args[3];
            }
            
            if(!user.userData.managerId) {
                // Not a manager
                return next();
            }

            var chain = step.init(),
                renderer = require('../util/pageBuilder.js')();
            
            var view = {
                newsletter: true,
                page_title: 'txtCreateNewRecord',
                txt_choose_language: 'txtChooseLang',
                txt_star_name: 'txtNameOfStar',
                txt_star_email: 'txtEmailOfTheStar',
                txt_star_pw: 'txtPasswordForStar',
                txt_select_cat: 'txtSelectCategory',
                txt_auto_upld: 'txtAutographUpload',
                txt_own_foto: 'txtOwnPhoto',
                txt_select_file: 'txtSelectFile',
                txt_upld: {text: 'txtUpload', filter: 'toLower'},
                txt_submit: 'txtAddStar',
                sidebar_counter: ' ',
                body: {
                    id: 'dashboard-page'
                },
                post_scripts: [
                    {src: '/js/dashboard.js'}
                ],
                css_files: [
                    '/css/uniform.default.css'
                ]
            };

            if(err) {
                view.error = err;
            }
            
            // Get the categories
            var lang = req.getLanguage(),
                cats = [];
            
            chain.add(function (next) {
                stars.getCategories(function (err, categories) {
                    if(err) {
                        // Cannot get categories
                        return res.send('Server failuer', 500);
                    }
                    
                    var catTree = {};
                    
                    categories.forEach(function (cat) {
                        catTree[cat.id] = {
                            subcategories: cat.subcategories
                        };
                        
                        cats.push('starCategory{0}{1}'.format(cat.id[0].toUpper(), cat.id.substr(1)));
                    });

                    i18n.getBatch(cats, lang, function (err, cats) {
                        if(err) {
                            return res.send('Server error', 500);
                        }

                        view.categories = [];
                        view.categoryTree = JSON.stringify(catTree);

                        cats.forEach(function (cat, i) {
                            view.categories.push({code: categories[i].id, text: cat});
                        });

                        next();
                    });
                });
            });
            
            var langs = i18n.getAvailableLaguages();
            view.langs = langs;
            
            if(err) {
                view.error = err.message || err;
            }

            chain.exec(function () {
                renderer.render({page: 'main/manage/addStar', vars: view}, req, res, next);
            });
        });
    },
    
    addStar: function (req, res, next) {
        req.requireLogin(function (user) {
            
            if(arguments.length > 3) {
                var err = arguments[3];
            }
            
            if(!user.userData.managerId) {
                // Not a manager
                return next();
            }
            
            // TODO: Verify that the user has filled in the form well
            var data = req.body;
            data.username = data.email;
            var uploadId = data.uploadId;
            
            if(!data.terms) {
                return module.exports.addStarForm(req, res, next, 'You have to accept the terms');
            }
            
            // Create a user for the star
            users.createUser(data, function (err, userId) {
                if(err) {
                    console.log(err);
                    return module.exports.addStarForm(req, res, next, err);
                }
                
                // User created
                stars.createStar(userId, data, function (err, starId) {
                    if(err) {
                        return module.exports.addStarForm(req, res, next, err);
                    }
                    
                    // Convert all temprary files
                    db.mongoConnect({db: 'meeveep', collection: 'cards'}, function (err, collection) {
                        if(err) {
                            console.log(err);
                            return module.exports.addStarForm(req, res, next, err);
                        }
                        
                        collection.update({uploadId: uploadId, managerId: user.userData.managerId, confirmed: false},
                                    {$set: {starId: starId, confirmed: new Date()}}, {multi: true}, function (err) {
                                        if(err) {
                                            return module.exports.addStarForm(req, res, next, err);
                                        }
                                        
                                        // Done creating star
                                        res.redirect('/manage/dashboard');
                                    });
                    });
                });
            });
        });
    },
    
    addProduct: function (req, res, nxt) {
        var args = arguments;
        
        req.requireLogin(function (user) {
            if(args.length > 3) {
                var err = args[3];
            }
            
            if(args.length > 4) {
                var data = args[4];
            }
            
            if(!user.userData.managerId) {
                // Not a manager
                return next();
            }

            var chain = step.init(),
                renderer = require('../util/pageBuilder.js')();
            
            chain.add(function (next) {
                // Get the list of stars associated with this manager
                manager.getStars(user.userData.managerId, function (err, strs) {
                    if(err) {
                        // Failed...
                        return res.send('Internal error', 500);
                    }
                    
                    view.stars = [];
                    var length = strs.length;
                    
                    strs.forEach(function (starId) {
                        stars.getStar(starId, function (err, star) {
                            if(err) {
                                length--;
                                return (length === 0) && next();
                            }
                            
                            stars.getCard(star.cards[0], function (err, card) {
                                length--;
                                
                                if(err) {
                                    return (length === 0) && next();
                                }
                                
                                star.tiny = card.tiny;
                                view.stars.push(star);
                                (length === 0) && next();
                            });
                        });
                    });
                    
                    if(strs.length === 0) { // No stars
                        next();
                    }
                });
            });
            
            if(req.query.prd === '1' && req.query.cx) {
                // Potential nonce
                chain.add(function (next) {
                    // Verify nonce
                    util.resolveNonce(req.query.cx, function (err, nonce) {
                        if(!err && nonce && nonce.productCreated) {
                            // Product created
                            view.productCreated = nonce;
                        }
                        
                        next();
                    });
                });
            }
            
            chain.add(function (next) {
                view.stars.sort(function (a, b) {
                    return a.name > b.name ? 1 : -1;
                });
                
                var langs = i18n.getAvailableLaguages();
                view.langs = langs;
                next();
            });
            
            var view = {
                newsletter: true,
                txt_generate_autograph: 'txtGenerateCommercialAutograph',
                txt_select_star: 'txtSelectCeleb',
                txt_choose_lang: 'txtSelectLang',
                txt_auto_opts: 'txtAutographInclOpts',
                txt_user_image: 'txtUserImage',
                txt_audio: 'txtAudio',
                txt_video: 'txtVideo',
                txt_hd: 'txtHQ',
                txt_star_depiction: 'txtTermsStarDepiction',
                txt_more_details: 'txtClickForDetails',
                txt_avail_period: 'txtAvailabilityPeriod',
                txt_blank: {text: 'txtBlank', filter: 'toLower'},
                txt_infinite: {text: 'txtInfinite', filter: 'toLower'},
                txt_DD: 'txtDD',
                txt_MM: 'txtMM',
                txt_YYYY: 'txtYYYY',
                txt_price: 'txtPrice',
                txt_availability: 'txtAvailability',
                txt_pcs: 'txtPcs',
                txt_select: 'txtPleaseSelect',
                txt_accept_terms: 'txtAcceptCondTTL',
                txt_to_the_left: '',
                txt_receive_nlt: 'txtWishToRecNlt',
                txt_submit: 'txtMakeAvailable',
                txt_no_stars: 'txtNoStarsFound',
                
                sidebar_counter: ' ',
                body: {
                    id: 'create-page'
                },
                css_files: [
                    '/css/uniform.default.css',
                    '/css/jquery-ui.css'
                ],
                post_scripts: [
                    {src: '/js/star.js'}
                ]
            };
            
            if(err) {
                view.error = err;
            }
            
            if(data) {
                if(data.includes) {
                    if(!Array.isArray(data.includes)) {
                        data.includes = [data.includes];
                    }
                    
                    data.includes.forEach(function (i) {
                        data['includes_' + i] = true;
                    });
                }
                
                view.data = data;
            }

            chain.exec(function () {
                renderer.render({page: 'main/manage/addProduct', vars: view}, req, res, nxt);
            });
        });
    },
    
    doAddProduct: function (req, res, next) {
        // Check permissions
        req.requireLogin(function (user) {
            var data = req.body;
            
            if(!user.userData.managerId) {
                // Not a manager
                return module.exports.addProduct(req, res, next, 'Access denied', data);
            }

            // Terms
            if(data['terms-accepted'] !== 'yes') {
                return module.exports.addProduct(req, res, next, 'You need to accept the terms', data);
            }
                    
            // Check that the language is supported
            if(!i18n.langExists(data.lang)) {
                // Unsopported language
                return module.exports.addProduct(req, res, next, 'Please select a valid language', data);
            }

            // Check that at least one option was selected
            var includes = data.includes;

            if(!includes) {
                // No option selected, woe!
                return module.exports.addProduct(req, res, next, 'Please select at least one medium', data);
            }
                    
            // Check price is positive
            if(data.price <= 0) {
                return module.exports.addProduct(req, res, next, 'Please provide a valid price', data);
            }
            
            // Check that all parameters were filled in correctly
            // Check thatt the star selected exists, and is owned by the manager
            var starId = Number(data.star);
            
            stars.getStar(starId, function (err, star) {
                if(err || !star) {
                    // Not a star
                    return module.exports.addProduct(req, res, next, 'Please select a star', data);
                }
                
                // Check that the star is owned by the manager
                manager.getStars(user.userData.managerId, function (err, stars) {
                    if(err) {
                        return module.exports.addProduct(req, res, next, 'Server error', data);
                    }
                    
                    if(stars.indexOf(starId) < 0) {
                        // Star not found in manager's star list
                        return module.exports.addProduct(req, res, next, 'That star does not belong to you!', data);
                    }
                    
                    if(!Array.isArray(includes)) {
                        includes = [includes];
                        data.includes = includes;
                    }
                    
                    // Check the dates
                    var startDate = data['validity.from'],
                        endDate = data['validity.to'];
                    
                    if(startDate) {
                        startDate = startDate.split('/');
                        
                        if(startDate.length === 3) {
                            startDate = new Date(startDate[2], startDate[1], startDate[0], 0, 0, 0, 0);
                            data.startDate = startDate;
                        }
                    }
                    
                    if(endDate) {
                        endDate = endDate.split('/');
                        
                        if(endDate.length === 3) {
                            endDate = new Date(endDate[2], endDate[1], endDate[0], 23, 59, 59, 999);
                            data.endDate = endDate;
                        }
                    }
                    
                    delete data['validity.from'];
                    delete data['validity.to'];
                    
                    // Check the price
                    data.price = parseFloat(data.price);
                    
                    // Availability
                    data.available = data.pieces;
                    data.managerId = user.userData.managerId;
                    data.starId = starId;
                    
                    var newsletter = data.newsletter;
                    delete data.newsletter;
                    delete data.star;
                    delete data.pieces;
                    
                    // All set, create the product
                    products.createProduct(data, function (err, productId) {
                        if(err) {
                            return module.exports.addProduct(req, res, next, 'That star does not belong to you!', data);
                        }
                        
                        // Done...
                        util.createNonce({productCreated: true, productId: productId}, function (err, nonce) {
                            if(err) {
                                // Success, but nonce failed. We go to the dashboard and let the manager see for themselves
                                return res.redirect('/manage/dashboard');
                            }
                            
                            // Success
                            res.redirect('/product/add?cx={0}&prd=1'.format(nonce.key));
                        });
                    });
                    
                    // TODO: subscribe for newsletter
                    if(newsletter) {
                        // Do the nanzi-panzi stuff
                        // ...
                    }
                });
            });
        });
    },
    
    listProducts: function (req, res, next) {
        req.requireLogin(function (user) {
            if(!user.userData.managerId) {
                // Not a manager
                return res.send('Access denied', 403);
            }
            
            var chain = step.init();
            
            chain.add(function (next) {
                manager.getProducts(user.userData.managerId, function (err, products) {
                    if(err) {
                        return res.send('Server failure', 500);
                    }
                
                    // Resolve products
                    var length = products.length;
                    view.products = products;
                    
                    products.forEach(function (product) {
                        // Date conversion
                        if(product.startDate) {
                            product.validFrom = '%02d.%02d.%d'.printf(product.startDate.getDate(),
                                                        product.startDate.getMonth() + 1,
                                                        String(product.startDate.getFullYear()).substr(2));
                        } else {
                            product.validFrom = 'Infinity'; // TODO: translate
                        }
                        
                        if(product.endDate) {
                            product.validTo = '%02d.%02d.%d'.printf(product.endDate.getDate(),
                                                        product.endDate.getMonth() + 1,
                                                        String(product.endDate.getFullYear()).substr(2));
                        } else {
                            product.validTo = 'Infinity'; // TODO: translate
                        }
                        
                        stars.getStar(product.starId, function (err, star) {
                            length--;
                            
                            if(err) {
                                return (length === 0) && next();
                            }
                            
                            product.star = star;
                            (length === 0) && next();
                        });
                    });
                    
                    (products.length === 0) && next();
                });
            });
            
            var view = {
                newsletter: true,
                sidebar_counter: ' ',
                txt_add_element: 'txtAddNewElement',
                txt_manage_auto: 'txtManageAutographs',
                txt_live_auto: 'txtLiveAutographs',
                txt_comm_auto: 'txtCommercialAutographs',
                txt_valid_from: 'txtValidFrom',
                txt_incl_vat: 'txtInclVAT',
                txt_config: 'txtConfigure',
                txt_del: 'txtDelete',
                
                
                body: {
                    id: 'manage-page'
                },
                post_scripts: [
                    {src: '/js/dashboard.js'}
                ]
            };
            
            chain.exec(function () {
                var renderer = require('../util/pageBuilder.js')();
                renderer.render({page: 'main/manage/dashboard', vars: view}, req, res, next);
            });
        });
    },
    
    deleteProduct: function (req, res, next) {
        req.requireLogin(function (user) {
            if(!user.userData.managerId) {
                // Not a manager
                return res.send('Access denied', 403);
            }
            
            // Delete product
            manager.deleteProduct(user.userData.managerId, req.params.productId, function (err) {
                if(err) {
                    return res.json({error: err});
                }
                
                res.json({success: true});
            });
        });
    },
    
    tempUploadImage: function (req, res, next) {
        req.requireLogin(function (user) {
            if(!user.userData.managerId) {
                // Not a manager
                return res.json({err: 'Access denied'}, 403);
            }
        
            var files = req.files;
            var uploadId = req.body.uploadId;

            if(!files || !files.img || !uploadId) {
                return res.json({err: 'Bad request'}, 400);
            }
            
            var img = files.img;
            var filename = util.generateKey(24) + '.' + img.type.split('/')[1];
            
            // Copy to somewhere
            fs.readFile(img.path, function (err, data) {
                if(err) {
                    console.log(err);
                    return res.json({err: 'Server error'}, 500);
                }
                
                fs.writeFile(__dirname + '/../public/images/stars/' + filename, data, function (err) {
                    if(err) {
                        console.log(err);
                        return res.json({err: 'Server error'}, 500);
                    }
                    
                    // Write temporary data to the database
                    db.mongoConnect({db: 'meeveep', collection: 'cards'}, function (err, collection) {
                        if(err) {
                            console.log(err);
                            return res.json({err: 'Server error'}, 500);
                        }
                        
                        // Prepare data
                        var data = {
                            managerId: user.userData.managerId,
                            uploader: user.userData.userId,
                            uploaded: new Date(),
                            confirmed: false,
                            file: '/images/stars/' + filename,
                            uploadId: req.body.uploadId
                        };
                        
                        collection.insert(data, function (err) {
                            if(err) {
                                console.log(err);
                                return res.json({err: 'Server error'}, 500);
                            }
                            
                            // Succeeded...
                            res.json({success: true});
                        });
                    });
                });
            });
        });
    }
};
