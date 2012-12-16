var renderer = require('../util/pageBuilder.js')();

module.exports = {
    starInfo: function(req, res, next){
        //res.render('index', { title: 'Express', sidebar_counter: 'Some content' });
        var view = {};
        
        require('../controllers/stars.js').getStar(req.params.starId, function (err, star) {
            if(err) {
                console.log(err);
                
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
        var cli = require('cli-color');
        var starId = req.params.starId;

        // User needs to be logged in first
        req.requireLogin(function (currentUser) {
            // Book...
            var star = require('../controllers/stars.js');
            
            // Get star info
            star.getStar(starId, function (err, star) {
                if(err) {
                    console.error(err);
                    res.send('Something went wrong', 500).end();
                    return;
                }
            
                if(!star) {
                    console.log('Star not found');
                    return res.send('Star not found', 404).end();
                }
                
                // Star found, render the star booking form
                var view = {
                    star: star,
                    user: currentUser.userData,
                    txt_for: 'txtFor',
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
                    
                };
                
                renderer.render({page: 'main/book', vars: view}, req, res, next);
            });
        });
    }
};
