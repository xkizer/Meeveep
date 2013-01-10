
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
  , session = require('./util/session.js');

// Extend objects
require('./util/extend.js');

var app = express();

// assign the swig engine to .mustache files
//app.engine('html', cons.mustache);
app.set('layout', 'layout');
app.set('partials', {head: "head", sidebar: 'sidebar', newsletter: 'sidebar/newsletter'});
app.engine('html', require('hogan-express'));


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
app.post('/card/:orderId/update/signature', autographs.updateSignature);
app.post('/card/:orderId/accept', autographs.acceptOrder);
app.get('/card/:orderId/reject', autographs.rejectOrder);
app.get('/media/createSession', media.createSession);

app.post('/upload', function (req) {
    console.log(req);
});


// <<<<<<<<<<<<<<<<<
http.createServer(app).listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port " + app.get('port'));
});
// >>>>>>>>>>>>>>>>

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