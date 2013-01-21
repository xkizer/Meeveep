var port = process.env.PORT || 9304;
var io = require('socket.io').listen(9304);
var cli = require('cli-color');
var util = require('./util/util');
var fs = require('fs');
var deflate = require('./util/inflate');

var connections = 0;

io.sockets.on('connection', function (socket) {
    connections++;
        console.log(cli.green('Connections'), connections);

    socket.on('disconnect', function () {
        connections--;
        console.log(cli.green('Connections'), connections);
    });

    socket.identified = false; // This client has not be identified

    // When the client identifies itself
    socket.on('identify', function (identity) {
        // TODO: implement a check to make sure we have a desired client before marking as identified
        if(socket.identified) {
            // Something terrible happened
            return socket.emit('error', {code: 0xA290, message: 'Already identified'});
        }

        socket.identified = true;
        socket.identity = identity;
        socket.streaming = false;

        console.log(cli.cyan('identified client'), identity);

        // Create a directory for the stream
        // TODO: This should be done at authentication step
        var dirname = '/tmp/stream-' + util.generateKey(34) + '/';
        socket.dirname = dirname;

        // Create the working directory
        fs.mkdir(dirname, function (err) {
            if(err) {
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
                socket.streaming = params.stream;

                // Serialize the streaming params and save to the directory
                fs.writeFile(dirname + 'meta.json', JSON.stringify(params), 'utf8', function (err) {
                    if(err) {
                        // At this message, the client should resend frame or something
                        socket.emit('error', {code: 0xA2BF, message: 'Could not write meta data.'});
                    }
                });
            });
        });
    });
});

console.log('Socket IO running on port %d', port);

