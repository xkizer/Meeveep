

var fs = require('fs'),
util = require('util'),
Stream = require('stream').Stream;
 
/**
* Create a bandwidth limited stream
*
* This is a read+writeable stream that can limit how fast it
* is written onto by emitting pause and resume events to
* maintain a specified bandwidth limit, that limit can
* furthermore be changed during the transfer.
*/
function LimitStream() {
    this.readable = true;
    this.writable = true;

    this.limit = null;
    this.sentBytes = this.tmpSentBytes = 0;
    this.startTime = this.tmpStartTime = new Date();
}

util.inherits(LimitStream, Stream);
 
/**
* Sets a bandwidth limit in KiB/s
*
* Change or sets the bandwidth limit, this also resets
* the temporary variables tmpSentBytes and tmpStartTime.
* There extra temporary values because we want to be able
* to access the global transfer traffic and duration.
* You can change the bandwidth during the transfer.
*
* @param limit the bandwidth (in KiB/s)
*/
LimitStream.prototype.setLimit = function (limit) {
    this.limit = (limit * 1024) / 1000.0; // converts to bytes per ms
    this.tmpSentBytes = 0;
    this.tmpStartTime = new Date();
};
 
LimitStream.prototype.write = function (data) {
    var self = this;

    this.sentBytes += data.length;
    this.tmpSentBytes += data.length;

    console.log('emit data');
    this.emit('data', data);

    if (self.limit) {
        var elapsedTime = new Date() - this.tmpStartTime,
        assumedTime = this.tmpSentBytes / this.limit,
        lag = assumedTime - elapsedTime;

        if (lag > 0) {
            console.log('emit pause, will resume in: ' + lag + 'ms');
            this.emit('pause');
            
            setTimeout(function () {
                console.log('emit resume');
                self.emit('resume');
            }, lag);
        }
    }
};
 
LimitStream.prototype.end = function () {
    console.log('emit end');
    this.emit('end');
};
 
LimitStream.prototype.error = function (err) {
    console.log('emit error: ' + err);
    this.emit('error', err);
};
 
LimitStream.prototype.close = function () {
    console.log('emit close');
    this.emit('close');
};
 
LimitStream.prototype.destroy = function () {
    console.log('emit destroy');
    this.emit('destroy');
};


/*
var readStream = fs.createReadStream('/tmp/test');
var limitStream = new LimitStream();
limitStream.setLimit(120); // in KiB/s
 
// pipe readable stream (fs read) into the writable+readable limit stream
readStream.pipe(limitStream);
 
limitStream.on('pause', function () {
    readStream.pause();
});
 
limitStream.on('resume', function () {
    readStream.resume();
});
*/


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , stars = require('./routes/stars.js')
  , autographs = require('./routes/autograph.js')
  , media = require('./routes/media.js')
  , http = require('http')
  , path = require('path')
  , cons = require('consolidate')
  , session = require('./util/session.js')
  , io = require('socket.io');

// Extend objects
require('./util/extend.js');

var app = express();

// assign the swig engine to .mustache files
//app.engine('html', cons.mustache);
app.set('layout', 'layout');
app.set('partials', {head: "head", sidebar: 'sidebar', newsletter: 'sidebar/newsletter'});
app.engine('html', require('hogan-express'));
app.set('json spaces', null);


app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.use(express.favicon());
  app.use(express.cookieParser({secret: 'sdfg'}));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(session.middleware);
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Params processor
// require('./util/params.js')(app); // I doubt the need for this. Every router should process its own params


app.get('/', routes.index);
app.post('/auth/login', routes.login);
app.get('/auth/logout', routes.logout);
app.get('/star/:starId([0-9]+)', stars.starInfo);
app.get('/star/:starId([0-9]+)/book', function (req, res) { res.redirect(301, (req.url + '/step-1').itrim('/')); });
app.get('/star/:starId([0-9]+)/book/step-:step([1-9])', stars.book);
app.get('/autographs/unsigned', autographs.unsigned);

app.post('/card/:orderId/update/:medium(signature|video|audio)', autographs.updateMedia);

app.post('/card/:orderId/accept', autographs.acceptOrder);
app.get('/card/:orderId/reject', autographs.rejectOrder);

// Create recording session
app.get('/media/createSession', media.createSession);

// Session verification
app.get('/media/identify/:sessionId', media.verifySession);

// Meant for the recording server. Notifies us that the video is complete
app.post('/media/notify/complete', media.notifyComplete);

// Add an autograph card.
app.get('/cards/add', autographs.addCardPage);
app.post('/cards/add', autographs.addCard);
app.post('/cards/add', autographs.addCardPage);

app.post('/', function () {
    console.log('Posted something');
});
/*
app.post('/upload', function (req) {
    console.log(req);
});
*/








// <<<<<<<<<<<<<<<<<
var server = http.createServer(function (sock) {
    var limitStream = new LimitStream();
    limitStream.setLimit(50); // in KiB/s

    // pipe readable stream (fs read) into the writable+readable limit stream
    sock.connection.pipe(limitStream);

    limitStream.on('pause', function () {
        sock.connection.pause();
    });

    limitStream.on('resume', function () {
        sock.connection.resume();
    });
    
    limitStream.pause = limitStream.resume = function () {
        
    };
    
    sock.socket.connection = limitStream;
    
    app.apply(this, arguments);
});

server.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port " + app.get('port'));
});
// >>>>>>>>>>>>>>>>

io = io.listen(server);

/*
// Take advantage of multi-core systems

var cluster = require('cluster');
var numCPUs = require('os').cpus().length;
var cli = require('cli-color');

if (cluster.isMaster) {
    console.log(cli.yellow('CPU_COUNT', numCPUs));
    console.log(cli.cyan('Forking ', numCPUs, 'child processes'));

    // Fork workers.
    var clusters = [];

    for (var i = 0; i < numCPUs; i++) {
        clusters.push(cluster.fork());
    }

    // Recycle a worker every 6 hours (all workers once per day on a 4-processor system)
    setInterval(function () {
        clusters.pop().kill('SIGTERM');
		clusters.push(cluster.fork());
    }, 21600000);

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        clusters.push(cluster.fork());
    });
} else {
    console.log('created child with PID ' + process.pid);
    // Workers can share any TCP connection
    // In this case its a HTTP server
    http.createServer(app).listen(process.env.PORT || 3000, function(){
        console.log("Express server listening on port " + app.get('port'));
    }).on('connection', function (connect) {
        try {
            console.log(cli.green(connect.server.connections), 'connections');
        } catch(e) {
            console.log(cli.red(e));
        }
    });
}

*/
