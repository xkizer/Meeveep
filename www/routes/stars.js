var renderer = require('../util/pageBuilder.js')();
var star = require('../controllers/stars.js');
var cli = require('cli-color');

module.exports = {
    starInfo: function(req, res, next){
        //res.render('index', { title: 'Express', sidebar_counter: 'Some content' });
        var view = {};
        
        star.getStar(req.params.starId, function (err, star) {
            if(err) {
                console.error(err);
                
                if(err.code === 0x9002) {
                    // Star information was not found... throw 404
                    return res.send('Star info not found', 400).end();
                }
                
                res.send('Error retriving star info', 500).end();
                return;
            }
            
            view.star = star;
            renderer.render({page: 'main/star', vars: view}, req, res, next);
        });
    },
    
    book: function (req, res, next) {
        var step = req.params.step;
                
        var bookFn = starBooking[step];
        
        if(bookFn) {
            return bookFn(req, res, next);
        }
        
        // Let express handle the 404
        next();
    }
};

/**
 * The steps of the star booking process.
 * Each numerical property of the object represents a step. Each non-numerical
 * property represents a helper function.
 */
var starBooking = {
    1: function (req, res, next) {
        var starId = req.params.starId;
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star info
            star.getStar(starId, function (err, star) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
            
                if(!star) {
                    console.error('Star not found');
                    return res.send('Star not found', 404).end();
                }
                
                star.getCards(function (err, cards) {
                    // Star found, render the star booking form
                    var view = {
                        star: star,
                        user: currentUser.userData,
                        txt_summary: 'txtSummary',
                        post_scripts: {
                            src: '/js/book.js'
                        },
                        cards: cards,
                        txt_message_to: 'txtMsgTo',
                        txt_pencil_color: 'txtPencilColor',
                        txt_autograph_includes: 'txtAutographIncludes',
                        audio: 'txtAudio',
                        video: 'txtVideo',
                        hq_video: 'txtHQVideo',
                        txt_card: 'txtCard',
                        sidebar_title: 'txtAutographCardOptions',
                        body: {
                            id: 'preview-page'
                        },
                        partials: {
                            sidebar: 'sidebar/book'
                        }
                    };

                    renderer.render({page: 'main/star/book-1', vars: view}, req, res, next);
                });
            });
        });
    },

    2: function (req, res, next) {
        var starId = req.params.starId,
            ctrlStar = star,
            cardId = req.query.cardId || false;
        
        if(!cardId) {
            // Error, 401
            console.error('Card ID not supplied')
            return res.send('Where is the card ID?', 401);
        }
        
        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Get star info
            star.getStar(starId, function (err, star) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
            
                if(!star) {
                    console.error('Star not found');
                    return res.send('Star not found', 404).end();
                }
                
                // Verify the user has a valid card
                ctrlStar.getCard(cardId, function (err, card) {
                    if(err) {
                        // Something went wrong...
                        console.error(err);
                        return res.send(500, 'Something went wrong');
                    }
                    
                    // Star found, render the star booking form
                    var view = {
                        star: star,
                        user: currentUser.userData,
                        txt_for: 'txtFor',
                        txt_of: {text: 'txtOf', filter: String.prototype.toLowerCase},
                        txt_step: 'txtStep',
                        txt_summary: 'txtSummary',
                        autograph: {
                            for: 'Jennifer-Jaqueline Schmitz',
                            messageToStar: 'Some stupid message',
                            penColor: 'black'
                        },
                        txt_message_to: 'txtMsgTo',
                        txt_pencil_color: 'txtPencilColor',
                        txt_autograph_includes: 'txtAutographIncludes',
                        audio: 'txtAudio',
                        video: 'txtVideo',
                        hq_video: 'txtHQVideo',
                        sidebar_title: 'txtAddComment',
                        card: card,
                        partials: {
                            sidebar: 'sidebar/book-2'
                        }
                    };

                    renderer.render({page: 'main/star/book-2', vars: view}, req, res, next);
                });
            });
        });
    },

    3: function (req, res, next) {
        
    }
};
