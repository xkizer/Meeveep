var session = require('./session.js'),
    cli = require('cli-color');

/**
 * Default renderer options
 */
var defaultOptions = {
    title: {
        suffix: ' | Meeveep'
    },
    
    lang: 'en-us'
};

/**
 * Default variables that are expected for each page
 */
var standardVariables = {
    title:              'txtDefaultTitle',
    header_slogan:      'txtHeaderSlogan',
    star_alarm:         'txtStarAlarm',
    how_it_works:       'txtHowMeeveepWorks',
    login_intro:        'txtLoginIntro',
    txtLogin:           'txtLogin',
    login_email:        'txtEmailAddress',
    login_password:     'txtPassword',
    login_submit:       'txtSubmit',
    login_no_account:   'txtNoAccount',
    login_register:     'txtRegister',
    nltTitle:           'txtKeepPosted',
    nltIntroText:       'txtNewsletterIntro',
    subscribe:          'txtSubscribe',
    enter_email_here:   'txtEnterEmail',
    footer_info_about:  'txtInfoAbout',
    management_clubs:   'txtManagementClubs',
    footer_pave_way:    'txtFooterPaveWay',
    register_here:      'txtRegisterHere',
    celerities:         'txtCelebrities',
    celeb_closeness:    'txtCelebCloseness',
    footer_trust:       'txtYouCanTrustUs',
    footer_trust_text:  'txtFtTrustText',
    meeveep_secure:     'txtMeeveepSecure',
    meeveep_secure_txt: 'txtFtMeeveepSecureTxt',
    txtHelp:            {text:'txtHelp',filter:'toLowerCase'},
    txtPrivacy:         {text:'txtPrivacy',filter:'toLowerCase'},
    txtContact:         {text:'txtContact',filter:'toLowerCase'},
    txtLegal:           {text:'txtLegal',filter:'toLowerCase'},
    txtTerms:           {text:'txtTerms',filter:'toLowerCase'},
    txtService:         'txtService',
    
}

function mergeInto(from, to) {
    for(var i in from) { 
        if(from.hasOwnProperty(i)) {
            var val = from[i];
            
            if('[object Object]' === String(val) && !(val instanceof Array)) {
                // Object
                to[i] = ((to[i] instanceof Object) ? to[i] : {}) || {};
                
                mergeInto(from[i], to[i]);
                continue;
            }
            
            to[i] = from[i];
        }
    }
    
    return to;
}

function render (opts, req, res, next) {
    // The template variables
    var vars = opts.vars;
    var lang = opts.lang;
    var i18n = require('./i18n.js');
    
    i18n.getLangFile(lang, function (err, langFile) {
        if(err) {
            throw err;
        }
        
        // Merge vars into the standard variables
        vars = mergeInto(standardVariables, mergeInto(vars, {}));
        
        vars.loggedIn = req.isLoggedIn();
        
        if(vars.loggedIn) {
            req.getUser(function (err, user) {
                if(err) {
                    return res.send('Internal Server Error', 500);
                }
                
                vars.extendIfNotExists(user, 'user_');
                renderPage();
            });
        } else {
            renderPage();
        }
        
        function renderPage () {
            // Go over the whole variables and convert them to languages
            if(langFile) {
                var variable,
                    txt;
                
                for(var i in vars) {
                    variable = vars[i];
                    
                    /*
                    if(variable instanceof Array) {
                        // The variable has some replacement variables
                        txtId = variable.shift();
                        txt = langFile[txtId]; // The text with possible placeholders
                        txt = txt.format.apply(txt, variable);
                    } else */
                    if (variable instanceof Object) {
                        // The variable is formal
                        txt = variable.literal || langFile[variable.text] || variable.text;
                        
                        if('string' !== typeof txt) {
                            vars[i] = variable;
                            continue;
                        }
                        
                        if(variable.variables instanceof Array) {
                            // An array of variables provided
                            txt = txt.format.apply(txt, variable.variables);
                        }
                        
                        if(variable.filter) {
                            var filter = variable.filter;
                            
                            if(!(filter instanceof Array)) {
                                filter = [filter];
                            }
                            
                            filter.forEach(function (filter) {
                                if(typeof filter === 'string' && 'function' === typeof txt[filter]) {
                                    // A method of the string
                                    txt = txt[filter]();
                                } else if('function' === typeof filter) {
                                    // An absolute function
                                    txt = filter(txt);
                                }
                            });
                        }
                    } else {
                        txt = langFile[variable];
                    }
                    
                    if('undefined' !== typeof txt) {
                        // Replace varaible if and only if it was found in the language file. Some content might be
                        // pre-translated and will return "undefined"
                        vars[i] = txt;
                    }
                }
            }
            
            // Page title
            vars.title = (opts.title.prefix || '') + (vars.title || '') + (opts.title.suffix || '');
            
            var layout = opts.layout || 'layout';
            res.render(opts.page, vars);
        }
    })
}

module.exports = function (options) {
    options = mergeInto(options, mergeInto(defaultOptions, {}));
    
    var obj =  {
        options: options,
        
        /**
         * Set the options for the current renderer
         */
        setOptions: function (opts) {
            mergeInto(opts, options);
        },
        
        /**
         * Render page
         */
        render: function (opts, req, res, next) {
            render (mergeInto(opts, mergeInto(options, {})), req, res, next);
        }
    };
    
    return obj;
}



