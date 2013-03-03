/**
 * Management related routes
 */

var cli = require('cli-color'),
    stars = require('../controllers/stars.js'),
    step = require('../util/step.js'),
    manager = require('../controllers/manager.js'),
    i18n = require('../util/i18n');

module.exports = {
    addStarForm: function (req, res, next) {
        req.requireLogin(function (user) {
            
            if(arguments.length > 3) {
                var err = arguments[3];
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
                sidebar_counter: ' ',
                body: {
                    id: 'dashboard-page'
                }
            };

            if(err) {
                view.error = err;
            }

            chain.exec(function () {
                renderer.render({page: 'main/manage/addStar', vars: view}, req, res, next);
            });
        });
    },
    
    addStar: function () {
        
    },
    
    addProduct: function (req, res, next) {
        req.requireLogin(function (user) {
            if(arguments.length > 3) {
                var err = arguments[3];
            }
            
            if(arguments.length > 4) {
                var data = arguments[4];
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
                            length--;
                            
                            if(err) {
                                console.log(err);
                                return length === 0 && next();
                            }
                            
                            stars.getCard(star.cards[0], function (err, card) {
                                if(err) {
                                    return length === 0 && next();
                                }
                                
                                star.tiny = card.tiny;
                                view.stars.push(star);
                                length === 0 && next();
                            });
                        });
                    });
                    
                    if(strs.length === 0) { // No stars
                        next();
                    }
                });
            });
            
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
                view.data = data;
            }

            chain.exec(function () {
                renderer.render({page: 'main/manage/addProduct', vars: view}, req, res, next);
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
            
            // Check that all parameters were filled in correctly
            // Check thatt the star selected exists, and is owned by the manager
            var starId = Number(data.starId);
            
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
                    
                    // Check that the language is supported
                    if(!i18n.langExists(data.lang)) {
                        // Unsopported language
                        return module.exports.addProduct(req, res, next, 'Please select a valid language', data);
                    }
                    
                    // Check that at least one option was selected
                    var includes = data.includes;
                    
                    console.log(includes);
                });
            });
        });
    }
};
