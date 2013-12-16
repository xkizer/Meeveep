/**
 * Accoutn management. Registration, settings, password management, etc.
 */

var cli = require('cli-color'),
    users = require('../controllers/user'),
    util = require('../util/util'),
    step = require('../util/step'),
    auth = require('../controllers/auth');


module.exports = {
    /**
     * Display the "register account" page
     * @param {type} req
     * @param {type} res
     * @param {type} next
     * @returns {undefined}
     */
    register: function (req, res, next) {
        var renderer = require('../util/pageBuilder.js')();
        var errorMsg, err, defaults;
        
        if(arguments.length > 3) {
            err = arguments[3];
        }
    
        if(arguments.length > 4) {
            defaults = arguments[4];
            
            if(defaults.salutation) {
                defaults['salutation_' + String(defaults.salutation).toLowerCase()] = true;
            }
        }
        
        if(err) {
            if(err.message) {
                errorMsg = err.message;
            } else {
                errorMsg = String(err);
            }
        }
        

        var view = {
            form: {
                error_msg: errorMsg,
                defaults: defaults,
            },
            newsletter: true,
            page_title: 'txtRegistration',
            page_title_description: 'txtStarClose',
            txt_salutation: 'txtSalutation',
            txt_firstname: 'txtFirstname',
            txt_surname: 'txtSurname',
            txt_please_select: 'txtPleaseSelect',
            txt_terms_accept: 'txtAcceptCondTTL',
            txt_birthday: 'txtDateOfBirth',
            txt_yyyy: 'txtYYYY',
            txt_dd: 'txtDD',
            txt_mm: 'txtMM',
            txt_email_addr: 'txtEmailAddress',
            txt_password: 'txtPassword',
            txt_reg_now: 'txtRegisterNow',
            sidebar_counter: ' ',
            txt_mr: 'txtGreetingMr',
            txt_mrs: 'txtGreetingMrs',
            txt_miss: 'txtGreetingMiss',
            txt_as_manager: 'txtAsManager',
            txt_as_star: 'txtAsStar',
            txt_terms: 'txtTerms',
            
            css_files: [
                '/css/uniform.default.css'
            ],
            post_scripts: [
                {src: '/js/register.js'}
            ],
            body: {
                id: 'registration-page'
            },
            partials: {
                sidebar: 'sidebar/terms'
            }
        };
        
        if(req.query._t === 'mrg') {
            view.manager = true;
        } else if (req.query._t === 'str') {
            view.star = true;
        }
        
        renderer.render({page: 'main/account/register', vars: view}, req, res, next);
    },
    
    /**
     * Execute the registration of an account
     * @param {object} req
     * @param {object} res
     * @param {function} next
     */
    doRegister: function (req, res, next) {
        var data = req.body,
            me = module.exports;
        
        // Do validation
        var validators = {
            firstName:  /^[a-z][a-z\-'\s]*$/i,
            lastName:   /^[a-z][a-z\-'\s]*$/i,
            password:   /^.{6,32}$/,
            email:      /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i,
            terms:      'accept'
        };
        
        for(var validator in validators) {
            if(!validators.hasOwnProperty(validator)) {
                continue;
            }
            
            // If any validation fails, we go STRAIGHT to the next route. This
            // should be the normal register form router. We do not display the
            // errors to the user because any error MUST have been communicated
            // to the user when filling the form, so any errors must have been
            // caused by the user's attempt to by-pass our front-end error
            // checking algorithms, and we do not care about thieves!
            if(validators[validator] instanceof RegExp) { // Validation pattern
                if(!validators[validator].test(data[validator])) {
                    return next();
                }
            } else if('function' === typeof validators[validator]) { // Validation function
                if(!validators[validator](data[validator])) {
                    return next();
                }
            } else if('string' === typeof validators[validator]) { // Exact match
                if(data[validator] !== validators[validator]) {
                    return next();
                }
            }
        }
        
        data.username = data.email; // Email is also the username
        
        // Birthday...
        if(data.day && data.month && data.year) {
            var birthday = new Date();
            birthday.setDate(data.day);
            birthday.setMonth(data.month - 1);
            birthday.setYear(data.year);
            data.birthday = birthday;
        }
        
        delete data.day;
        delete data.month;
        delete data.year;
        
        // Security... make sure the data we have is the data we should have
        var dt = {};
        var fields = ['firstName', 'lastName', 'salutation', 'email', 'terms', 'password', 'birthday', 'username'];
        
        for(var i = 0; i < fields.length; i++) {
            var fieldName = fields[i];
            
            if(data.hasOwnProperty(fieldName)) {
                dt[fieldName] = data[fieldName];
            }
        }
        
        data = dt;
        
        // Check for account type
        if(req.query._t === 'mrg') {
            data.pendingManagerApproval = true;
            data.stars = [];
        }
        
        // If we are here, verification was successful
        users.createUser(data, function (err, userId) {
            if(err) {
                // Error in registration...
                return me.register(req, res, next, err, data);
            }
            
            // Account created, log user in
            auth.login(data.username, data.password, function (err, userInfo) {
                if(err) {
                    return me.register(req, res, next, err, data);
                }
                
                var session = require('../controllers/session.js');

                session.createSession(userInfo, {ip: req.socket.remoteAddress, userAgent: req.headers['user-agent']}, function (err, sessionId) {
                    if(err) {
                        return me.register(req, res, next, err, data);
                    }

                    // Session created... send session cookies
                    res.cookie('sid', sessionId);
                    
                    // Get nonce
                    var nonce = util.createNonce({userId: userId, created: true, firstName: data.firstName, email: data.email}, 360, function (err, nonce) {
                        res.redirect('/?regComplete=1&nonce=' + nonce.key + '&uid=' + userId);
                    });
                });
            });
        });
    },
    
    displayChangePassword: function (req, res, next) {

        var args = arguments;
        
        req.requireLogin(function () {
            var chain = step.init();
            
            if(req.query.pwc && req.query.xt && req.query.vc) {
                // We potentially have a changed password
                chain.add(function (next) {
                    // Verify that the nonce is valid
                    util.resolveNonce(req.query.xt, req.query.vc, function (err, data) {
                        if(err || !data) {
                            return next();
                        }

                        if(data.pwChanged === true) {
                            // Valid
                            view.pwChanged = true;
                        }

                        next();
                    });
                });
            }
            
            if(req.query.npr && req.query.v2) {
                // We potentially have a password reset
                chain.add(function (next) {
                    // Verify that the nonce is valid
                    var info = util.resolveNonce(req.query.v2, false, function (err, data) {
                        if(err || !data) {
                            return next();
                        }

                        if(data.newPWReset === true) {
                            // Valid
                            view.newPWReset = data;
                        }

                        next();
                    });
                });
            }

            var renderer = require('../util/pageBuilder.js')(),
                err;

            if(args.length > 3) {
                err = args[3];
            }

            var view = {
                error: err,
                txt_edit_not: 'txtEditNot',
                newsletter: true,
                page_title: 'txtChangePassword',
                page_title_description: 'txtStarClose',
                txt_need_help: 'txtNeedSomeHelp',
                txt_old_pw: 'txtOldPassword',
                txt_new_pw: 'txtNewPassword',
                txt_change_pw: 'txtChangePassword',
                sidebar_counter: ' ',
                body: {
                    id: 'login-page'
                },
                partials: {
                    sidebar: 'sidebar/live-autographs'
                },
                changepw_pg: true,
            };

            chain.exec(function () {
                renderer.render({page: 'main/auth/changepw', vars: view}, req, res, next);
            });
        });
    },
    
    changePassword: function (req, res, next) {
        req.requireLogin(function () {
            req.getUser(function (err, user) {
                if(err) {
                    return module.exports.displayChangePassword(req, res, next, err.message || err);
                }
                
                var oldPass = req.body.password,
                    newPass = req.body.newpassword;

                // Verify values
                user.changePassword(oldPass, newPass, function (err) {
                    if(err) {
                        return module.exports.displayChangePassword(req, res, next, err.message || err);
                    }
                    
                    // Done
                    util.createNonce({pwChanged: true}, function (err, nonce) {
                        if(err) {
                            // It succeeded, but we can't display a message.
                            // We redirect to the home page instead and hope the
                            // user will know it succeeded.
                            return res.redirect('/');
                        }
                        
                        res.redirect('/account/changepw?pwc=1&xt=' + nonce.key + '&vc=' + nonce.verifier);
                        
                        // Background: delete nonce if any
                        if(req.query.npr && req.query.v2) {
                            util.deleteNonce(req.query.v2, true, function () { /* empty */ });
                        }
                    });
                });
            });
        });
    },
    
    billingAddressForm: function (req, res, next) {
        var args = arguments;
        
        req.requireLogin(function (user) {
            user = user.userData;
            var renderer = require('../util/pageBuilder.js')();
            var errorMsg, err, defaults;

            if(args.length > 3) {
                err = args[3];
            }

            if(args.length > 4) {
                defaults = args[4];
            } else if(user.billing) {
                defaults = user.billing;
            }

            if(err) {
                if(err.message) {
                    errorMsg = err.message;
                } else {
                    errorMsg = String(err);
                }
            }
            
            if(!defaults) {
                defaults = {};
                
                if(user.firstName && user.lastName) {
                    defaults.name = '{0} {1}'.format(user.firstName, user.lastName)
                } else if (user.name) {
                    defaults.name = '{0}'.format(user.name);
                }
                
                defaults.email = user.email;
            }
            
            var view = {
                form: {
                    error_msg: errorMsg,
                    defaults: defaults,
                },

                newsletter: true,

                txt_billing_info: 'txtBillingInformation',
                page_title_description: 'txtStarClose',
                txt_name: 'txtName',
                txt_address: 'txtAddress',
                txt_email_address: 'txtEmailAddress',
                txt_phone_no: 'txtPhoneNo',
                txt_save_info: 'txtSaveInformation',
                txt_contd: 'txtContd',
                txt_city: 'txtCity',
                txt_state: 'txtState',
                txt_zip: 'txtZIP',
                
                'billing-page': true,
                

                css_files: [
                    '/css/uniform.default.css'
                ],
                body: {
                    id: 'billing-page'
                },
                txt_manage_autographs: 'txtManageAutographs',
                txt_manage_artists: 'txtManageArtists',
                txt_add_product: 'txtAddProduct',
                txt_sign_autographs: 'txtSignAutographs',
                txt_edit_billing: 'txtEditBillingAddress',
                
                post_scripts: [
                    {src: '/js/billing.js'}
                ],
                
                partials: {
                    sidebar: 'sidebar/manager'
                }
            };

            if(req.query._t === 'mrg') {
                view.manager = true;
            } else if (req.query._t === 'str') {
                view.star = true;
            }

            renderer.render({page: 'main/account/billing', vars: view}, req, res, next);
        });
    },
    
    editBillingInfo: function (req, res, next) {
        req.requireLogin(function (user) {
            // Verify data
            var data = req.body;
            
            if(!data.email) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide an email address', data);
            }
            
            if(!data.name) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a billing name', data);
            }
            
            if(!data.phone) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a valid phone number', data);
            }
            
            if(!data.address) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a valid address', data);
            }
            
            if(!data.city) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a valid city', data);
            }
            
            if(!data.state) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a valid state', data);
            }
            
            if(!data.zip) {
                return module.exports.billingAddressForm(req, res, next, 'Please provide a valid ZIP code', data);
            }
            
            // Save data
            user.updateBilling(data, function (err) {
                if(err) {
                    return module.exports.billingAddressForm(req, res, next, 'Server error: could not update information', data);
                }
                
                var done = 'string' === typeof req.query.done ? req.query.done : '/';
                res.redirect(done);
            });
        });
    }
};
