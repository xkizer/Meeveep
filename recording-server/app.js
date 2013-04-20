var port = process.env.PORT || 9304;
var io = require('socket.io').listen(9304);
var cli = require('cli-color');
var util = require('./util/util');
var fs = require('fs');
var deflate = require('./util/inflate');
var db = require('./util/db');
var http = require('http');
var joiner = require('./includes/join');

require('./util/extend');

var SERVER_ID = 'V42KBoJY0sJnfYzHn8VJulOmEjVoX6ptpYTLNGOPArkfKPHC';
var SERVER_ADDR = process.env.MAIN_SERVER || 'meeveep.dev';
var SERVER_PORT = 9304; // Port for the recording server
var HTTP_PORT = 9305; // Port for HTTP (used for streaming videos)
var RECORDING_DIR = '/data/recordings/'; // The directory we are to store recordings (could be /dev/sdh/ or anything)

global.SERVER = {
    ID: SERVER_ID,
    ADDR: SERVER_ADDR,
    PORT: SERVER_PORT,
    HTTP_PORT: HTTP_PORT,
    DIR: RECORDING_DIR
};

var connections = 0;

var mainServer = {
    host: process.env.MAIN_SERVER || 'meeveep.dev',
    port: process.env.MAIN_SERVER_PORT || 3000
};

// TODO: rewrite this whole procedure to add support for a whole lot of things,
// like resume on reconnect, etc.

io.sockets.on('connection', function (socket) {
    connections++;
    console.log(cli.cyan('Connections'), connections);

    socket.on('disconnect', function () {
        connections--;
        console.log(cli.cyan('Connections'), connections);
    });

    // This tells the client that we are ready for identification. However,
    // this is not necessary. The client can identify immediately after connecting
    // without waiting for this event.
    socket.emit('identify');

    socket.identified = false; // This client has not be identified

    // When the client identifies itself
    socket.on('identify', function (identity) {
        // TODO: implement a check to make sure we have a desired client before marking as identified
        if(socket.identified) {
            // Something [not so] terrible happened
            return socket.emit('warn', {code: 0xA290, message: 'Already identified. Ignoring identification request.'});
        }

        // Check client identity
        // We check the client identity by asking the server. In the future,
        // there should be a central server for client identification. This will
        // enable this streaming server to be used for more than one application.
        var options = {
            hostname: mainServer.host,
            port: mainServer.port,
            path: '/media/identify/' + identity
        };

        var req = http.request(options, function (res) {
            if(res.statusCode !== 200) {
                console.error(cli.red('HTTP ERROR'), res.statusCode);
                return;
            }

            var data = '';

            res.on('data', function (chunk) {
                data += chunk;
            }).on('end', function () {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = null;
                }

                console.log(cli.cyan('IDENTITY'), data, identity);
                if(!data || data.id !== identity) {
                    return socket.emit('fatal', {code: 0xA278, message: 'Identity is not valid. Please restart procedure.'});
                }

                console.log(cli.cyan('identified client'), identity);

                // Create a directory for the stream
                // TODO: This should be done at authentication step
                var dirname = RECORDING_DIR + 'stream-' + util.generateKey(34) + '/';
                socket.dirname = dirname;

                // Create the working directory
                fs.mkdir(dirname, function (err) {
                    if(err) {
                        console.log(err);
                        return socket.emit('error', {code: 0xA222, message: 'Error creating directory. Cannot continue.'});
                    }

                    // Create the audio file
                    /*var audioStream = fs.createWriteStream(dirname + 'audio.wav',
                                                                { flags: 'w',
                                                                  encoding: 'base64',
                                                                  mode: 0666 });*/

                    var counter = 0;

                    socket.on('disconnect', function () {
                        console.log('Flushing remaining data to disk...');
                        // TODO: round off
                    });

                    if(err) {
                        return socket.emit('error', {code: 0xA20B, message: 'Error creating audio file. Cannot continue.'});
                    }

                    // Ready to receive file
                    socket.emit('ready');
                    var now = new Date;

                    // Start listening to message events
                    socket.on('frame', function (message) {
                        var feedbackId = message.feedbackId;
                        
                        if(feedbackId) {
                            // Feedback required (Feedback does not mean that the operation succeeded, but just an acknowledgement that data has reached here
                            socket.emit('feedback', feedbackId);
                        }
                        
                        if(!socket.streaming) {
                            console.log(cli.red('frame rejected'), 'server not streaming...');
                            socket.emit('error', {code: 0xA24B, message: 'Not streaming'});
                            return;
                        }

                        var elapsed = (new Date - now) / 1000;
                        console.log(/*message.raw.length, */message.data.length, 'Elapsed', elapsed/*, ('Raw speed'), ((message.raw.length / elapsed) >> 10) + 'KBps'*/, ('Optimized speed'), ((message.data.length / elapsed) >> 10) + 'KBps'/*, 'Percentage', (message.raw.length - message.data.length) / message.raw.length*/);
                        now = new Date();

                        // Decode payload
                        var payload = new Buffer(message.data, 'base64').toString('binary');

                        // Decompress
                        var inflated = deflate.inflate(payload);

                        // JSON
                        var data = JSON.parse(inflated);

                        // Keep track of errors
                        var hasError = false;

                        // Create file for picture frame
                        fs.writeFile(dirname + (counter++) + '.wav', data.audio, 'base64', function (err) {
                            if(err) {
                                // At this message, the client should resend frame
                                socket.emit('error', {code: 0xA2B9, message: 'Could not write audio frame.'});
                                hasError = true;
                            }
                        });

                        if(hasError) {
                            return;
                        }

                        // Picture frames...
                        var images = data.images;

                        // Save 'em
                        images.forEach(function (image) {
                            if(hasError) {
                                return;
                            }

                            fs.writeFile(dirname + image.frame + '.jpg', image.data, 'base64', function (err) {
                                if(err) {
                                    // At this message, the client should resend frame or something
                                    socket.emit('error', {code: 0xA2BA, message: 'Could not write video frame.'});
                                    hasError = true;
                                }
                            });
                        });

                        // Done
                    });

                    // Start streaming
                    socket.on('start-stream', function (params) {
                        if(socket.ended) {
                            return socket.emit('error', {code: 0xA2FE, message: 'Session already ended.'});
                        }

                        socket.streaming = params.stream;
                        socket.meta = params;

                        // Serialize the streaming params and save to the directory
                        fs.writeFile(dirname + 'meta.json', JSON.stringify(params), 'utf8', function (err) {
                            if(err) {
                                // At this message, the client should resend frame or something
                                socket.emit('error', {code: 0xA2BF, message: 'Could not write meta data.'});
                            }
                        });
                    });

                    // When the recording is complete
                    socket.on('end', function () {
                        socket.ended = true;
                        socket.streaming = false;
                        
                        // Check which function to invoke
                        var doJoin = socket.meta.media.indexOf('video') >= 0 ? joiner.express : joiner.joinWAV,
                            medium = socket.meta.media.indexOf('video') >= 0 ? 'video' : 'audio';
                        
                        
                        // Build the video
                        doJoin(dirname, function (err) {
                            if(err) {
                                // Something bad happened... we log it but preserve the directory
                                // We will have to try again some other time, or maybe manually
                                
                                db.redisConnect(function (err, client) {
                                    if(err) {
                                        // Really bad... try one more option
                                        fs.writeFile(dirname + '.error', JSON.stringify({identity: identity, date: (new Date).getTime()}), 'utf8', function (err) {
                                            if(err) ;
                                            // Out of options
                                        });
                                        
                                        return;
                                    }
                                    
                                    client.hmset('{0}:build:err:{1}'.format(medium, identity), {
                                        path: dirname,
                                        identity: identity
                                    }, function (err) {
                                        if(err) {
                                            fs.writeFile(dirname + '.error', JSON.stringify({identity: identity, date: (new Date).getTime()}), 'utf8', function (err) {
                                                if(err) ;
                                                // Out of options
                                            });

                                            return;
                                        }
                                    });
                                });
                                
                                return;
                            }
                            
                            // Complete... save information about the video and send to the main server
                            db.redisConnect(function (err, client) {
                                client.hmset('{0}:build:complete:{1}'.format(medium, identity), {
                                    path: dirname,
                                    identity: identity
                                }, function (err) {
                                    if(err) {
                                        fs.writeFile(dirname + '.error', JSON.stringify({identity: identity, date: (new Date).getTime(), done: true}), 'utf8', function (err) {
                                            if(err) ;
                                            // Out of options
                                        });

                                        return;
                                    }
                                    
                                    // Saved, tell the server
                                    var options = {
                                        method: 'post',
                                        hostname: mainServer.host,
                                        port: mainServer.port,
                                        path: '/media/notify/complete',
                                        headers: {
                                            'Content-type': 'application/json'
                                        }
                                    };
                                    
                                    var req = http.request(options, function (res) {
                                        if(res.statusCode !== 200) {
                                            console.error('It failed!');
                                            //return;
                                        }
                                        
                                        var data = '';
                                        
                                        res.on('data', function (chunk) {
                                            data += chunk;
                                        });
                                        
                                        res.on('end', function () {
                                            console.log(cli.green('Server notified'));
                                            console.log(data);
                                            
                                            if(medium === 'video') {
                                                // Notify the client if it's still connected
                                                socket.emit('media-ready', {videoURL: 'http://%s:%d/watch/%s'.printf(SERVER_ADDR, HTTP_PORT, identity),
                                                    posterURL: 'http://%s:%d/poster/%s'.printf(SERVER_ADDR, HTTP_PORT, identity)});
                                            } else {
                                                // Notify the client if it's still connected
                                                socket.emit('media-ready', {audioURL: 'http://%s:%d/listen/%s'.printf(SERVER_ADDR, HTTP_PORT, identity)});
                                            }
                                        });
                                    });
                                    
                                    var payload = {
                                        server: SERVER_ID,
                                        sessionId: identity,
                                        type: medium
                                    };
                                    
                                    if(medium === 'video') {
                                        payload.playback = 'http://%s:%d/watch/%s'.printf(SERVER_ADDR, HTTP_PORT, identity);
                                        payload.poster = 'http://%s:%d/poster/%s'.printf(SERVER_ADDR, HTTP_PORT, identity);
                                    } else {
                                        payload.playback = 'http://%s:%d/listen/%s'.printf(SERVER_ADDR, HTTP_PORT, identity);
                                    }
                                    
                                    req.write(JSON.stringify(payload));
                                    
                                    req.end();
                                });
                            });
                        });
                    });
                });
            });
        });

        req.on('error', function () {
            console.log(arguments);
            socket.emit('fatal', {code: 0xA20C, message: 'Could not verify identity. Please restart procedure.'});
        });

        req.end();

        socket.identified = true;
        socket.identity = identity;
        socket.streaming = false;
    });
});

console.log('Socket IO running on port %d', port);

require('./http.js');

