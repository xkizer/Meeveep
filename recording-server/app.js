var port = process.env.PORT || 9304;
var io = require('socket.io').listen(9304);
var cli = require('cli-color');
var util = require('./util/util');
var fs = require('fs');

io.sockets.on('connection', function (socket) {
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
        
        var lastFrame = -1;
        var totalData = 0;
        
        console.log(cli.cyan('identified client'), identity);
        
        // Create a directory for the stream
        // TODO: This should be done at authentication step
        var dirname = '/tmp/stream-' + util.generateKey(34) + '/';
        socket.dirname = dirname;
        
        fs.mkdir(dirname, function (err) {
            if(err) {
                return socket.emit('error', {code: A222, message: 'Error creating directory. Cannot continue.'});
            }
            
            // Ready to receive file
            socket.emit('ready');
        
            // Start listening to message events
            socket.on('frame', function (message) {
                if(!socket.streaming) {
                    console.log(cli.red('frame rejected'), 'server not streaming...');
                    socket.emit('error', {code: 0xA24B, message: 'Please identify'});
                    return;
                }
                
                var frame = message.frame,
                    expectedFrame = lastFrame + 1;
                
                // Check we have the frame we are expecting
                if(frame !== expectedFrame) {
                    return socket.emit('error', {code: 0xA233, message: 'Expected frame ' + expectedFrame +
                                ' but received frame ' + frame});
                }

                lastFrame = expectedFrame;
                var data = message.data;
                
                // Create file for frame
                fs.writeFile(dirname + expectedFrame + '.jpg', data, 'base64', function (err) {
                    if(err) {
                        // At this message, the client should resend frame
                        socket.emit('error', {code: 0xA209, message: 'Could not write frame ' + frame, frame: frame});
                    }
                });
                
                totalData += data.length;
                console.log(cli.blue('received frame ' + message.frame, 'Size:', data.length, 'rate:', ((data.length * 25) >> 10) + 'KBps' ), 'total', (totalData >> 20) + 'MB');
            });

            // Start streaming
            socket.on('start-stream', function (stream) {
                socket.streaming = stream;
            });
        });
    });
});

console.log('Socket IO running on port %d', port);

