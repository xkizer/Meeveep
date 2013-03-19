var step = require('../util/step'),
    util = require('../util/util'),
    stars = require('../controllers/stars.js'),
    i18n = require('../util/i18n'),
    products = require('../controllers/products.js');

module.exports = {
    index: function(req, res, next){
        var renderer = require('../util/pageBuilder.js')();
        //res.render('index', { title: 'Express', sidebar_counter: 'Some content' });
        var chain = step.init();
        
        if(req.query.regComplete && req.query.nonce) {
            // We have a registration complete
            chain.add(function (next) {
                // Verify that the registration nonce is valid
                var info = util.resolveNonce(req.query.nonce, function (err, data) {
                    if(err || !data) {
                        return next();
                    }
                    
                    if(data.created === true && data.userId == req.query.uid) {
                        // Valid
                        view.userRegistered = data;
                    }
                    
                    next();
                });
            });
        }
        
        if(req.query.oc && req.query.ptx) {
            // We have an order complete
            chain.add(function (next) {
                // Verify that the registration nonce is valid
                var info = util.resolveNonce(req.query.nonce, function (err, data) {
                    if(err || !data) {
                        return next();
                    }
                    
                    if(data.orderComplete === true && data.orderId) {
                        // Valid
                        view.orderComplete = data.orderId;
                    }
                    
                    next();
                });
            });
        }
        
        chain.add(function (next) {
            // Get the list of products
            var qry = {limit: 10, checkAvailable: true};
            
            if(typeof req.query.category === 'string') {
                qry.category = req.query.category;
            }
            
            if(typeof req.query.q === 'string' && req.query.q.trim()) {
                qry.search = req.query.q;
            }
            
            products.getProducts(qry, function (err, products) {
                if(err) {
                    // Something bad
                    return res.send('Server error', 500);
                }

                view.products = [];
                view.found = products.length;
                var counter = products.length;
                
                // Add images to the objects
                products.forEach(function (product) {
                    product.includes.forEach(function (medium) {
                        product['includes_' + medium] = true;
                    });
                    
                    product.price = '%.2f'.printf(product.price);
                    
                    stars.getStar(product.starId, function (err, star) {
                        counter--;
                        
                        if(err || !star) {
                            return counter || next();
                        }
                        
                        view.products.push(product);
                        product.star = star;
                        return counter || next();
                    });
                    
                    product.image = '/images/stars/thumbs/' + product.starId + '.jpg'; // TODO: Rewrite this function to use a more standard/dynamic image URL generator
                });
                
                if(products.length === 0) {
                    next();
                }
            });
        });
        
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

                    if(req.query.category) {
                        view.categories.forEach(function (cat) {
                            if(cat.code === req.query.category) {
                                cat.selected = true;
                            }
                        });
                    }

                    next();
                });
            });
        });
        
        var view = {
            title: 'Express',
            newsletter: true,
            /*sidebar_counter:    ['txtNumAvailable', 12],*/
            page_title: 'txtPersonalAutographs',
            page_title_description: 'txtPersonalAutographDescription',
            placeholder_search: {text: 'txtSearch', filter: 'toLowerCase'},
            search_music: {text: 'txtMusic', filter: 'toLowerCase'},
            next_step: 'txtNextStep',
            currency: '€',
            txt_video: 'txtVideo',
            txt_audio: 'txtAudio',
            more_information: 'txtMoreInformation',
            txt_information: 'txtInformation',
            txt_found: {text: 'txtFound', filter: 'toUpperCase'},
            
            post_scripts: [
                {src: '/js/home.js'}
            ]
        };

        chain.exec(function () {
            renderer.render({page: 'main/index', vars: view}, req, res, next);
        });
    }
};

