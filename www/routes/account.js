/**
 * Accoutn management. Registration, settings, password management, etc.
 */

var cli = require('cli-color'),
    users = require('../controllers/user'),
    util = require('../util/util'),
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
            
            css_files: [
                '/css/uniform.default.css'
            ],
            post_scripts: [
                {src: '/js/register.js'}
            ],
            body: {
                id: 'registration-page'
            }
        };
        
        renderer.render({page: 'main/account/register', vars: view}, req, res, next);
    },
    
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
        
        delete data.day, data.month, data.year;
        
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
    }
};
