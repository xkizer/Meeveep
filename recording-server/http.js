var express = require('express'),
    http = require('http'),
    fs = require('fs'),
    cli = require('cli-color'),
    db = require('./util/db');

var app = express();

// Download a video
app.get('/watch/:videoId', function (req, res) {
    // TODO: Check the video permissions and make sure the user has permission to watch video
    // The request should include a token for verifying the user's permission
    
    db.redisConnect(function (err, client) {
        if(err) {
            // TODO: log this failure
            console.error('Failer to load resource:', cli.red('Redis failure'));
            return res.send('Server failure', 500).end();
        }
        
        var videoId = req.params.videoId;
        
        client.hgetall('video:build:complete:' + videoId, function (err, data) {
            if(err) {
                console.error('Failer to load resource:', cli.red('Redis failure'));
                return res.send('Server failure', 500).end();
            }
            
            if(!data) {
                // TODO: log the error
                console.error(cli.red('Video file not found:'), file);
                return res.send('Video not found', 404).end();
            }
            
            var ext = (req.query.type || '').toLowerCase();
            
            switch(ext) {
                case 'mp4':
                case 'mpeg':
                default:
                    ext = 'mp4';
                    break;
                
                case 'ogg':
                case 'ogv':
                    ext = 'ogv';
                    break;
            }
            
            var dir = data.path,
                file = dir + 'audio-video.{0}'.format(ext);
            
            res.sendfile(file);
            console.log(cli.yellow('Served video file'), cli.cyan(videoId));

            // TODO: log the hit
        });
    });
});

// Download a video poster
app.get('/poster/:videoId', function (req, res) {
    var videoId = req.params.videoId;
    
    db.redisConnect(function (err, client) {
        if(err) {
            // TODO: log this failure
            console.error('Failer to load resource:', cli.red('Redis failure'));
            return res.send('Server failure', 500).end();
        }
        
        client.hgetall('video:build:complete:' + videoId, function (err, data) {
            if(err) {
                console.error('Failer to load resource:', cli.red('Redis failure'));
                return res.send('Server failure', 500).end();
            }
            
            if(!data) {
                // TODO: log the error
                console.error(cli.red('Video poster not found:'), file);
                return res.send('Video poster not found', 404).end();
            }
            
            var dir = data.path;
            
            // Get a list of the frames
            fs.readdir(dir, function (err, files) {
                if(err) {
                    console.error(cli.red('Video poster not found:'), file);
                    return res.send('Video poster not found', 404).end();
                }
                
                var regExp = /^[0-9]{1,5}.jpg$/;
                
                files = files.filter(function (e) {
                    return regExp.test(e);
                }).sort(function (a, b) {
                   return parseInt(a) - parseInt(b);
                });
                
                var file = files[Math.floor(files.length * 0.1)];
                res.sendfile(dir + file);
                console.log(cli.yellow('Served video poster'), cli.cyan(videoId));

                // TODO: log the hit
            });
        });
    });
});


http.createServer(app).listen(SERVER.HTTP_PORT);
console.log('HTTP server running on port %d', SERVER.HTTP_PORT);
