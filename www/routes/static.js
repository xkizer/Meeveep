/**
 * Routing for static pages
 */

module.exports = {
    service: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtService',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'service-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    contact: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtContact',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'contact-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    legal: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtLegal',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'legal-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    faq: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtFAQ',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'faq-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    privacy: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtPrivacyPolicy',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'privacy-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    terms: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtTerms',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'terms-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    },
    
    security: function (req, res, next) {
        var view = {
            newsletter: true,
            page_title: 'txtCreateNewRecord',
            side_title: 'txtSecurity',
            txt_how_can_we_help: {text: 'txtHowCanWeHelp', filter: 'toUpper'},
            
            txt_contact: 'txtContact',
            txt_legal: 'txtLegal',
            txt_faq: 'txtFAQ',
            txt_privacy: 'txtPrivacyPolicy',
            txt_security: 'txtSecurity',
            txt_terms: 'txtTerms',
            
            'security-page': true,
            
            body: {
                id: 'service-page'
            },

            partials: {
                sidebar: 'sidebar/static'
            }
        };
        
        var renderer = require('../util/pageBuilder.js')();
        renderer.render({page: 'main/static/service', vars: view}, req, res, next);
    }
};
