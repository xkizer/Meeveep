/**
 * The cards utility helps in resolving cards to their filenames
 */

var url         = require('url'),
    matchRegexp = /^\/cards\//,
    db          = require('./db'),
    mongo       = require('mongodb'),
    fs          = require('fs'),
    cli         = require('cli-color'),
    path        = require('path');

module.exports = {
    middleware: function (req, res, next) {
        var filePath = url.parse(req.originalUrl);
        
        if(!filePath.pathname.match(matchRegexp)) {
            // Not the pattern we expect
            return next();
        }
        
        // Look in the database
        db.mongoConnect({db: 'meeveep', collection: 'pictures'}, function (err, collection, db) {
            if(err) {
                return res.send('Server error', 500).end();
            }
            
            collection.findOne({path: filePath.pathname}, function (err, pic) {
                if(err) {
                    return res.send('Server error', 500).end();
                }
                
                if(!pic) {
                    return next();
                }
                
                // Picture found...
                var grid = new mongo.Grid(db, 'pictures');
                
                grid.get(mongo.ObjectID(pic.fileId), function (err, file) {
                    if(err) {
                        return res.send('Server error', 500).end();
                    }
                    
                    // Create the file
                    var paths = filePath.pathname.trim('/').split('/'),
                        current = path.normalize(__dirname + '/../public/'),
                        counter = 0;
                    
                    function createDir () {
                        if(counter === paths.length - 1) {
                            // This is the filename part
                            current += paths[counter];
                            
                            fs.writeFile(current, file, function (err) {
                                if(err) {
                                    console.log(err);
                                    return res.send('Server error', 500).end();
                                }
                                
                                res.setHeader('Content-Type', pic.type);
                                
                                res.sendfile(current, function () {
                                    console.log('[%s] %s', cli.blue('SENT'), current);
                                });
                            });
                        } else {
                            current += paths[counter] + '/';
                            
                            fs.exists(current, function (exists) {
                                if(exists) {
                                    console.log('[%s] %s', cli.green('EXISTS'), current);
                                    createDir();
                                } else {
                                    fs.mkdir(current, function (err) {
                                        if(err) {
                                            return res.send('Server error', 500).end();
                                        }
                                        
                                        console.log('[%s] %s', cli.cyan('CREATED'), current);
                                        createDir();
                                    });
                                }
                            });
                        }
                        
                        counter++;
                    }
                    
                    createDir();
                });
            });
        });
    }
};