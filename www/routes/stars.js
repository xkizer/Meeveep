var renderer = require('../util/pageBuilder.js')();
var star = require('../controllers/stars.js');
var cli = require('cli-color');
var orders = require('../controllers/orders.js');
var products = require('../controllers/products.js');

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
    }
};
