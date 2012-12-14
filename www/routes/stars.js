


module.exports = {
    starInfo: function(req, res, next){
        var renderer = require('../util/pageBuilder.js')();
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
            
            console.log(require('cli-color').blue('STAR INFO'), star);
            view.star = star;
            renderer.render({page: 'main/star', vars: view}, req, res, next);
        });
    }
    
};
