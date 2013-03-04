var step = require('../util/step'),
    util = require('../util/util'),
    stars = require('../controllers/stars.js'),
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
        
        chain.add(function (next) {
            // Get the list of products
            products.getProducts({limit: 10}, function (err, products) {
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
                    
                    stars.getStar(product.starId, function (err, star) {
                        counter--;
                        
                        if(err || !star) {
                            return counter && next();
                        }
                        
                        view.products.push(product);
                        product.star = star;
                        return counter && next();
                    });
                    
                    product.image = '/images/stars/thumbs/' + product.starId + '.jpg'; // TODO: Rewrite this function to use a more standard/dynamic image URL generator
                });
                
                if(products.length === 0) {
                    next();
                }
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
            txt_found: {text: 'txtFound', filter: 'toUpperCase'}
        };

        chain.exec(function () {
            renderer.render({page: 'main/index', vars: view}, req, res, next);
        });
    }
};

