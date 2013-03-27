/**
 * Picture server does convertion and all
 */

var gm = require('gm'),
    cli = require('cli-color'),
    util = require('./util/util'),
    db = require('./util/db'),
    mongo = require('mongodb'),
    fs = require('fs');

// Preset sizes that we should always convert to
var presets = [
    '152x157',
    '67x',
    '633x420',
    '340×227'
];

module.exports = {
    convert: function (req, res, next) {
        // Convert to all the presets and keep the original
        var files = []; // Keeps track of our converted files
        var img = req.files && req.files.img;
        
        if(!img) {
            return res.json({error: 'Missing picture'}, 400);
        }
        
        var jobLength = presets.length,
            image = gm(img.path),
            aborted = false;      // When true, the next major operation will abort the whole process. Means a critical error occuered in an async section of the code.
        
        function abort(err) {
            if(aborted) { // Already aborted
                return;
            }
            
            aborted = true;
            res.json({error: msg}, 500);
        }
        
        // Get image ratio
        image.size(function (err, dimensions) {
            if(err || !dimensions) {
                return res.json({error: 'Could not get image size'}, 500);
            }
            
            var ratio = dimensions.width/dimensions.height;
            
            presets.forEach(function (size) {
                if(aborted) {
                    return;
                }
                
                var fname = '/tmp/' + util.generateKey(32);

                var resize = size.split(/x|×/),
                    resizeX = parseInt(resize[0]),
                    resizeY = parseInt(resize[1]),
                    resizeRatio = resizeX/resizeY;
                
                // Check if the picture needs cropping
                if(resizeX && resizeY) {
                    if(Math.abs((resizeX / resizeY) - ratio) > ratio / 20) {
                        // Difference is significant
                        var crop = true;
                    }
                }
                
                if(!resizeX && !resizeY) {
                    // Both resized not set...
                    return abort('Something is wrong, Dimension ' + size + ' not undestood');
                }
                
                if(!resizeX) {
                    resizeX = resizeY * ratio;
                } else if(!resizeY) {
                    resizeY = resizeX / ratio;
                }
                
                var start = new Date();
                
                // Convert
                var im = gm(img.path);

                if(crop) {
                    // Find out how best to crop
                    var cropDimensions = [dimensions.width, dimensions.width / resizeRatio];
                    
                    if(cropDimensions[1] > dimensions.height) {
                        cropDimensions = [dimensions.height * resizeRatio, dimensions.height];
                    }
                    
                    im.crop(cropDimensions[0], cropDimensions[1], 0, 0);
                }
                
                im.resize(resizeX, resizeY);
                
                im.write(fname, function (err) {
                    if(aborted) {
                        return;
                    }
                    
                    if(err) {
                        // Error, abort
                        return abort('Unable to write to file: ' + err);
                    }
                    
                    files.push({size: size, file: fname});
                    var stop = new Date();
                    console.log(cli.cyan('DONE') + ' Size: %s. File: %s Time: %dms. Cropped: %s', size, fname, stop - start, crop?'Yes':'No');
                    checkComplete();
                });
            });
        });
        
        function checkComplete () {
            if(aborted) {
                return;
            }
            
            if(files.length < jobLength) {
                // Not complete yet
                return;
            }
            
            // Append the original file
            files.push({size: 'original', file: img.path});
            
            // Complete now... save everything to the database...
            db.mongoConnect({db: 'meeveep'}, function (err, db) {
                if(err || aborted) {
                    return abort('Conversion completed, but was unable to connect to DB');
                }
                
                var grid = new mongo.Grid(db, 'pictures'),
                    processed = [];
                
                files.forEach(function (file) {
                    fs.readFile(file.file, function (err, image) {
                        // Delete temporary file
                        fs.unlink(file.file, function () {
                            if(err) {
                                console.error('[' + cli.yellow('WARN') + '] Unable to delete temporary file ' + file.file);
                                return;
                            }
                            
                            console.log('[' + cli.green('INFO') + '] Deleted temporary file ' + file.file)
                        });
                        
                        if(err || aborted) {
                            return abort('Unable to save picture to GridFS because picture could not be read back from disk');
                        }
                        
                        var meta = {};
                        meta.dimensions = file.size;
                        meta.content_type = img.type;
                        meta.set = req.body.cardId;
                        meta.date = new Date();
                        meta.name = img.name;
                        
                        var fileInfo = {
                            metadata: meta,
                            filename: img.name,
                            dimensions: file.size,
                            content_type: img.type
                        };
                        
                        grid.put(image, fileInfo, function (err, fileInfo) {
                            if(err || aborted) {
                                abort('Unable to save picture to GridFS because of GridFS error');
                                return;
                            }
                            
                            processed.push(fileInfo);
                            
                            if(processed.length > jobLength) {
                                res.send({complete: true, files: processed});
                            }
                        });
                    });
                });
            });
        }
    }
};
