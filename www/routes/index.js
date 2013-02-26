var step = require('../util/step'),
    util = require('../util/util');

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
            // Get the list of stars
            require('../controllers/stars.js').getStars({limit: 10}, function (err, stars) {
                if(err) {
                    // Something bad
                    return res.send('Server error', 500);
                }

                view.stars = stars;
                view.found = stars.length;

                // Add images to the objects
                stars.forEach(function (star) {
                    star.image = '/images/stars/thumbs/' + star.starId + '.jpg'; // TODO: Rewrite this function to use a more standard/dynamic image URL generator
                });

                renderer.render({page: 'main/index', vars: view}, req, res, next);
            });
        });
    }
};

