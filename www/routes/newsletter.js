/**
 * Newsletter subscription management routing
 */

var nlt = require('../controllers/newsletter');

module.exports = {
    subscribe: function (req, res, next) {
        var email = req.body.email;
        
        if(!email || !/^[a-z\-_\.A-Z0-9\[\]\+\$~]+@[a-z\-_\.A-Z0-9\[\]\+\$~]+$/.test(email)) {
            return res.json({error: 'Invalid email provided'}).end();
        }
        
        // Subscribe
        nlt.subscribe(email, function (err, subId) {
            if(err) {
                return res.json({error: err});
            }
            
            return res.json({success: true, subscriptionId: subId});
        });
    }
};
