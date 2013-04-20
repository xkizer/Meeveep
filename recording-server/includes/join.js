/**
 * This file handles all file joining operations, including audio joining,
 * image joining (to form video) and audio-video combination.
 */

var fs = require('fs'),
    cp = require('child_process'),
    cli = require('cli-color');

module.exports = {
    /**
     * Joins all matching wav files in path. Matching files are files named
     * "{number}.wav". Files are joined head-to-head, and are sorted numerically.
     * @param {string} path The path where the files are located. The final file
     *      will be saved back into this directory as audio.wav (replacing any
     *      already-existing file).
     * @param {function} callback The callback receives an error object if an
     *      error occurs.
     * @todo Take care of the various streams and ensure the program does not 
     *  stall on the way. One way to do this is to set a timeout that closes all
     *  streams. On end, we make sure that the file audio.wav is present
     *  (signifies operation completed).
     */
    joinWAV: function (path, callback) {
        if(!path.match(/\/$/)) {
            path += '/';
        }
        
        fs.readdir(path, function (err, files) {
            if(err) {
                return callback(err);
            }
            
            var regexp = /^[0-9]{1,4}\.wav$/;
            
            var chunks = files.filter(function (file) {
                return regexp.test(file);
            }).sort(function (a, b) {
                return parseInt(a) - parseInt(b);
            });
            
            // Do we have any valid file?
            if(chunks.length < 1) {
                return callback('No valid wav file found');
            }
            
            // Read the WAV information of the first file (and assume every
            // other file has the same properties)
            var avconv = cp.spawn('avconv', ['-i', path + '0.wav', path + '0.wav']);
            var data = '';
            
            // avconv seems to be sending the data we want to stderr, this is weird
            avconv.stderr.on('data', function (error) {
                data += error.toString();
            });
            
            // Close process
            avconv.stdin.end('n');
            
            // Check if we have the data we are looking for
            setTimeout(function () {
                if(/Stream #0.0/.test(data)) {
                    // Get information we are looking for...
                    console.log(cli.cyan('Audio data'), data);
                    
                    // Extract data
                    var regexp = /Stream #0\.0: Audio: pcm_([a-zA-Z0-9]+), ([0-9]+) Hz, ([0-9]+) channels/;
                    var info = regexp.exec(data);
                    
                    if(info) {
                        // We have what we need...
                        var format = info[1],
                            frequency = info[2],
                            channels = info[3];
                    } else {
                        return callback('Could not find some data');
                    }
                } else {
                    return callback('Could not find data');
                }
                
                // Keeps track of the current file being walked
                var counter = 0;
                
                // Keeps count of the number of files that have been processed
                var processed = 0, pcm;
                
                // Convert all files to PCM
                var wav2pcm = function () {
                    var filename = chunks[counter++];
                    var file = path + filename;
                    
                    if(!filename) {
                        // Queue has finished... next step
                        console.log(cli.cyan('info'), 'WAV decompiling complete. Joining PCM files.');
                        counter = 0;
                
                        // Create container for decoded files
                        pcm = fs.createWriteStream(path + 'audio.pcm');
                        
                        // Start the next phase
                        return walk();
                    } else {
                        console.log(cli.cyan('Processing'), file);
                        var avconv = cp.spawn('avconv', ['-i', file, '-f', format, '-acodec', 'pcm_' + format, file + '.pcm']);
                        avconv.stdout.pipe(process.stdout);
                        avconv.stderr.pipe(process.stderr);
                        avconv.on('exit', function () {
                            // Terminated, probably means complete
                            wav2pcm();
                        });
                    }
                };
                
                // Go through all the files...
                var walk = function () {
                    var file = chunks[counter++];
                    
                    if(!file) {
                        // Queue has finished... move to the next step
                        // Convert file to WAV now
                        console.log(cli.yellow('Calling avconv'));
                        var options = [ '-f', format,
                                        '-ar', (frequency/1000) + 'k',
                                        '-ac', channels,
                                        '-i', path + 'audio.pcm',
                                        path + 'audio.wav'];
                        console.log(cli.yellow('avconv', options.join(' ')));
                        var avconv = cp.spawn('avconv', options);
                        avconv.stdout.pipe(process.stdout);
                        avconv.stderr.pipe(process.stderr);
                        avconv.on('exit', function () {
                            // We assume it completed
                            callback(null);
                            
                            // Delete temporary file
                            fs.unlink(path + 'audio.pcm');
                        });
                    } else {
                        // Read file content
                        fs.readFile(path + file + '.pcm', function (err, content) {
                            if(err) {
                                // Something went wrong
                                // TODO: handle this error
                                pcm.destroy();
                                return callback('Stalled');
                            }
                            
                            pcm.write(content);
                            console.log(cli.blue('Written:'), file);
                            walk();
                            
                            // Delete temporary file
                            fs.unlink(path + file + '.pcm');
                        });
                    }
                };
                
                // Start the madness
                wav2pcm();
            }, 2000);
        });
    },
    
    /**
     * So much like joinWAV, but joins JPEGS in the folder (JPEGs which match
     * the file names format) into an MPEG video. 
     * @param {string} path Path to directory where the files reside
     * @param {function} callback Callback receives an error object if error occurs
     */
    jpegsToMP4: function (path, callback) {
        // Normalize path
        if(!path.match(/\/$/)) {
            path += '/';
        }
        
        // Read the meta file to figure out the frame rate
        fs.readFile(path + 'meta.json', function (err, meta) {
            if(err) {
                return callback('Could not read meta information');
            }
            
            try {
                meta = JSON.parse(meta);
            } catch (e) {
                return callback('Error parsing meta data');
            }
            
            var rate = meta.rate;
            
            // Do the joining right away
            var options = [
                '-r', rate,
                '-qscale', '1',
                '-i', path + '%d.jpg',
                '-pix_fmt', 'yuv420p',
                '-vcodec', 'libx264',
                path + 'video.mp4'
            ];
            
            var avconv = cp.spawn('avconv', options);
            avconv.stdout.pipe(process.stdout);
            avconv.stderr.pipe(process.stderr);
            avconv.on('exit', function () {
                // We assume it completed
                callback(null);
            });
        });
    },
    
    /**
     * Convert the MP4 file to OGG
     * @param {string} path The working directory
     * @param {function} callback Callback receives an error object if error occurs
     */
    MP42OGG: function (path, callback) {
        // Normalize path
        if(!path.match(/\/$/)) {
            path += '/';
        }
        
        // Do the conversion right away
        var options = [
            '-i', path + 'audio-video.mp4',
            '-pix_fmt', 'yuv420p',
            path + 'audio-video.ogv'
        ];
        
        var avconv = cp.spawn('avconv', options);
        avconv.stdout.pipe(process.stdout);
        avconv.stderr.pipe(process.stderr);
        avconv.on('exit', function () {
            // We assume it completed
            callback(null);
        });
    },
    
    /**
     * Combine audio.wav and video.mp4 into audio-video.mp4
     * @param {string} path The path where it all happens
     * @param {function} callback The callback function receives an error object
     *  if operation fails
     */
    combine: function (path, callback) {
        // Normalize path
        if(!path.match(/\/$/)) {
            path += '/';
        }
        
        // Do the joining right away
        var options = [
            '-i', path + 'video.mp4',
            '-i', path + 'audio.wav',
            '-strict', 'experimental',
            '-vcodec', 'libx264',
            '-map', '0:0',
            '-map', '1:0',
            path + 'audio-video.mp4'
        ];
        
        var avconv = cp.spawn('avconv', options);
        avconv.stdout.pipe(process.stdout);
        avconv.stderr.pipe(process.stderr);
        avconv.on('exit', function () {
            // We assume it completed
            callback(null);
        });
    },
    
    /**
     * Express build. Builds everything at once.
     * @param {string} path Location of files
     * @param {function} callback Callback receives error object if any
     */
    express: function (dir, callback) {
        if(!dir.match(/\/$/)) {
            dir += '/';
        }
        
        // Trackers
        var videoComplete = false,
            audioComplete = false;

        // Join audio files
        module.exports.joinWAV(dir, function (err) {
            if(err) {
                // There is error with audio... probably no audio was recorded
                console.log(cli.red('Audio failed... ignoring audio'));
                //callback(err);
                
                // Ignore error and do without audio
                audioComplete = 'ignore';
            } else {
                console.log(cli.green('Audio joining'));
                audioComplete = true;

                if(videoComplete) {
                    doJoin();
                }
            }
        });

        // Join video frames simultaneously
        module.exports.jpegsToMP4(dir, function (err) {
            if(err) {
                callback(err);
            } else {
                console.log(cli.green('Video frames joining complete'));
                videoComplete = true;

                if(audioComplete) {
                    doJoin();
                }
            }
        });

        // Join both into one video file. This is called when both of the above
        // are complete.
        function doJoin() {
            if(audioComplete === 'ignore') {
                // Instruction to ignore audio...
                fs.readFile(dir + 'video.mp4', function (err, buffer) {
                    if(err) {
                        return callback(err);
                    }
                    
                    fs.writeFile(dir + 'audio-video.mp4', buffer, function (err) {
                        if(err) {
                            console.log(cli.red('Error:'), err);
                            return callback(err);
                        }

                        console.log(cli.red('Converting to OGG'), cli.cyan('Converting to OGG'));
                        
                        // Convert to OGG
                        module.exports.MP42OGG.defer(1000, null, dir, function (err) {
                            callback(); // Ignore error
                        });
                    });
                });
            }
            
            module.exports.combine(dir, function (err) {
                if(err) {
                    console.log(cli.red('Error:'), err);
                    callback(err);
                } else {
                    console.log(cli.green('MP4 encoding complete'));
                    console.log(cli.cyan('Converting to OGG'));

                    // Convert to OGG
                    module.exports.MP42OGG.defer(1000, null, dir, function (err) {
                        console.log(cli.green('Video encoding complete for directory'), cli.yellow(dir));
                        callback(); // Ignore error
                    });
                }
            });
        }  
    }
};
