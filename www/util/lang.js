/**
 * The language utility provides support for multiple languages in the front-end
 */
var i18n = require('./i18n');
const DEFAULT_lANGUAGE = 'en-us'; // Default language
var qMatch = /^q=(1|0?\.[0-9]+)$/;
var cli = require('cli-color');

module.exports = {
    middleware: function (req, res, next) {
        var q = 0;
        var lang;
        
        // Check if the session has a language set
        if(req.session && req.session.lang) {
            req.lang = req.session.lang; // No check requried here because it is assumed that the check was performed while setting the preference
            return next();
        }
        
        // Check in the cookies
        if(req.cookies.lang) {
            lang = req.cookies.lang;
            
            if(i18n.langExists(lang)) {
                req.lang = lang;
                return next();
            }
        }
        
        // Check in the browser
        var acceptLangs = req.headers['accept-language'];
        lang = null;
        
        if(acceptLangs) {
            acceptLangs = acceptLangs.split(',');
            
            for(var i = 0; i < acceptLangs.length; i++) {
                var lng = acceptLangs[i].split(';');
                
                if(lng) {
                    lng[0] = lng[0].toLowerCase();
                    
                    // Check the quality
                    if(lng.length > 1) {
                        var t = qMatch.exec(lng[1]);
                        t[1] = parseFloat(t[1]);
                        
                        if(t && t[1] > q) {
                            // The q is set, and is greater than all the previous q's
                            // Check if this is a language we support
                            if(i18n.langExists(lng[0])) {
                                lang = lng[0];
                                q = t[1];
                                // Keep looking...
                            }
                        }
                    } else {
                        // This is a q=1, highest quality
                        if(i18n.langExists(lng[0])) {
                            req.lang = lng[0];
                            return next();
                        }
                    }
                }
            }
            
            if(lang) {
                req.lang = lang;
                return next();
            }
        }
        
        // Nowhere else to check, use default language
        req.lang = DEFAULT_lANGUAGE;
        next();
    }
};
