module.exports = function (app) {
    /**
     * A user information is being requested. Load the user from the DB
     */
    app.param('userId', function (req, res, next, id) {
        require('../controllers/user.js').getUser(id, function (err, user) {
            if(err || !user) {
                // User could not be loaded
                res.send('Unable to load user information', 500);
                res.end();
                return;
            }
            
            // User found... replace req.params.user
            req.params.user = user;
            next();
        });
    });
    
    
    /**
     * A star information was requested.. load the star information
     */
    app.param('starId', function (req, res, next, id) {
        require('../controllers/stars.js').getStar(id, function (err, star) {
            if(err || !user) {
                // User could not be loaded
                res.send('Unable to load star information', 500);
                res.end();
                return;
            }
            
            // User found... replace req.params.user
            req.params.star = star;
            next();
        });
    });
}
