var auth    = require('../controllers/auth.js'),
    user    = require('../controllers/user.js'),
    util    = require('../util/util'),
    step = require('../util/step'),
    cli     = require('cli-color');
        
module.exports = {
    login: function (req, res, next) {
        var post    = req.body;
        var accept  = req.headers.accept || '';
        
        auth.login(post.username, post.password, function (err, details) {
            if(err) {
                if(accept.indexOf('application/json') >= 0) {
                    return res.json({error: err.message || err});
                } else {
                    // Render the login page with error
                    var renderer = require('../util/pageBuilder.js')();

                    var view = {
                        newsletter: true,
                        page_title: 'txtLogin',
                        page_title_description: 'txtStarClose',
                        forgot_pw: 'txtForgotPassword',
                        not_regd: 'txtNotRegistered',
                        login: 'txtLogin',
                        email: 'txtEmail',
                        passwd: 'txtPassword',
                        sidebar_counter: ' ',
                        body: {
                            id: 'login-page'
                        },
                        error: err
                    };

                    renderer.render({page: 'main/auth/login', vars: view}, req, res, next);
                    return;
                }
            }
            
            var session = require('../controllers/session.js');
            
            session.createSession(details, {ip: req.socket.remoteAddress, userAgent: req.headers['user-agent']}, function (err, sessionId) {
                if(err) {
                    if(accept.indexOf('application/json') >= 0) {
                        return res.json({error: err.message || err});
                    } else {
                        // Render the login page with error
                        var renderer = require('../util/pageBuilder.js')();
                        
                        var view = {
                            newsletter: true,
                            page_title: 'txtLogin',
                            page_title_description: 'txtStarClose',
                            forgot_pw: 'txtForgotPassword',
                            not_regd: 'txtNotRegistered',
                            login: 'txtLogin',
                            email: 'txtEmail',
                            passwd: 'txtPassword',
                            sidebar_counter: ' ',
                            body: {
                                id: 'login-page'
                            },
                            error: err
                        };
                        
                        renderer.render({page: 'main/auth/login', vars: view}, req, res, next);
                        return;
                    }
                }
                
                // Session created... send session cookies
                res.cookie('sid', sessionId);
                
                if(accept.indexOf('application/json') >= 0) {
                    // Respond with JSON
                    res.json({
                        success: true,
                        token: sessionId
                    });
                } else {
                    // Check for a redirect URL
                    var redirect = req.query.next || '/';
                    res.redirect(redirect);
                }
            });
        });
    },
    
    displayLogin: function (req, res, next) {
        var chain = step.init();
        
        if(req.query.pwr && req.query.v) {
            // We have a registration complete
            chain.add(function (next) {
                // Verify that the registration nonce is valid
                var info = util.resolveNonce(req.query.v, function (err, data) {
                    if(err || !data) {
                        return next();
                    }
                    
                    if(data.pwResetMailSent === true && data.email) {
                        // Valid
                        view.pwReset = data;
                    }
                    
                    next();
                });
            });
        }

        var renderer = require('../util/pageBuilder.js')();
        
        var view = {
            newsletter: true,
            page_title: 'txtLogin',
            page_title_description: 'txtStarClose',
            forgot_pw: 'txtForgotPassword',
            not_regd: 'txtNotRegistered',
            login: 'txtLogin',
            email: 'txtEmail',
            passwd: 'txtPassword',
            sidebar_counter: ' ',
            body: {
                id: 'login-page'
            }
        };
        
        chain.exec(function () {
            renderer.render({page: 'main/auth/login', vars: view}, req, res, next);
        });
    },
    
    forgotPassword: function (req, res, next) {
        var renderer = require('../util/pageBuilder.js')(),
            err;
        
        if(arguments.length > 3) {
            err = arguments[3];
        }
        
        var view = {
            error: err,
            newsletter: true,
            page_title: 'txtForgotPassword',
            page_title_description: 'txtStarClose',
            txt_need_help: 'txtNeedSomeHelp',
            txt_not_regd: 'txtNotRegistered',
            txt_req_pw: 'txtRequestNewPassword',
            txt_email: 'txtEmail',
            sidebar_counter: ' ',
            body: {
                id: 'login-page'
            }
        };
        
        renderer.render({page: 'main/auth/forgotpw', vars: view}, req, res, next);
    },
    
    retrievePassword: function (req, res, next) {
        // Check for account with that email
        user.findByEmail(req.body.email, function (err, user) {
            if(err) {
                return module.exports.forgotPassword(req, res, next, err.message || err);
            }
            
            var email = user.userData.email;
            
            // Set up password reset link
            util.createNonce({email: email, pwReset: true}, 21600, function (err, nonce) {
                if(err) {
                    return module.exports.forgotPassword(req, res, next, err.message || err);
                }
                
                var renderer = require('../util/pageBuilder.js')();
                var host = (req.connection.encrypted ? 'https' : 'http') + '://' +
                        req.header('host');
                
                var view = {
                    layout: 'email',
                    name: user.userData.firstName,
                    host: host,
                    nonce: nonce,
                    email: email
                };

                // Render the HTML email template
                renderer.render({page: 'mails/auth/forgotpw.html', vars: view}, req, res, next, function (err, html) {
                    if(err) {
                        return module.exports.forgotPassword(req, res, next, err.message || err);
                    }
                    
                    // Render the text email template
                    view.layout = 'email.txt';
                    renderer.render({page: 'mails/auth/forgotpw', vars: view}, req, res, next, function (err, text) {
                        if(err) {
                            return module.exports.forgotPassword(req, res, next, err.message || err);
                        }
                        
                        var mailer = require('../util/mailer')();
                        
                        mailer.send('passwordRecovery', {
                            to: email,
                            subject: 'Password recovery link', // TODO: use the translator
                            text: text,
                            html: html
                        }, function (err, status) {
                            if(err) {
                                return module.exports.forgotPassword(req, res, next, err.message || err);
                            }
                            
                            // Get nonce
                            var nonce = util.createNonce({pwResetMailSent: true, email: email}, 360, function (err, nonce) {
                                res.redirect('/auth/login?pwr=1&v=' + nonce.key);
                            });
                        });
                    });
                });
            });
        });
    },
    
    resetPassword: function (req, res, next) {
        var nonce = req.params.nonce,
            verifier = req.param.verifier;
        
        util.resolveNonce(nonce, verifier, function (err, data) {
            if(err || !data || !data.pwReset || !data.email) {
                // Something is wrong
                return next();
            }
            
            // Find the user
            user.findByEmail(data.email, function (err, user) {
                if(err) {
                    return res.end('Server error', 500);
                }
                
                var newPass = util.generateKey(12);
                
                // User found...
                user.resetPassword(newPass, function (err) {
                    if(err) {
                        return res.end('Server error', 500);
                    }
                    
                    // Password reset, login the user automatically and tell the
                    // user their new password on the home page
                    util.createNonce({newPWReset: true, password: newPass}, 360, function (err, nonce) {
                        if(err) {
                            // BIG FAIL, we can't tell the user their password!
                            // Not really, we can, but not in a stylish way
                            return res.send('New password: ' + newPass, 500);
                        }
                        
                        auth.login(user.userData.username, newPass, function (err, userInfo) {
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
                                res.redirect('/account/changepw?npr=1&v2=' + nonce.key);
                            });
                        });
                    });
                });
            });
        });
    },
    
    logout: function (req, res, next) {
        req.logout(function (err) {
            if(err) {
                res.send('Could not log out', 500);
                res.end();
            } else {
                res.redirect('/');
            }
        });
    }
};