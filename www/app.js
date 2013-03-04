
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , products = require('./routes/products.js')
  , auth = require('./routes/auth')
  , stars = require('./routes/stars.js')
  , account = require('./routes/account.js')
  , manager = require('./routes/manager.js')
  , autographs = require('./routes/autograph.js')
  , media = require('./routes/media.js')
  , http = require('http')
  , path = require('path')
  , cons = require('consolidate')
  , session = require('./util/session.js')
  , io = require('socket.io')
  , url = require('url');

// Extend objects
require('./util/extend.js');

var app = express();

// assign the swig engine to .mustache files
//app.engine('html', cons.mustache);
app.set('layout', 'layout');
app.set('partials', {head: "head", sidebar: 'sidebar', newsletter: 'sidebar/newsletter'});
app.engine('html', require('hogan-express'));
app.engine('txt', require('hogan-express'));
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


app.get(/^\/(?:(?:index|home)(?:\.html)?)?$/, routes.index);
app.get('/star/:starId([0-9]+)', stars.starInfo);
app.get('/autographs/unsigned', autographs.unsigned);

// Product ordering
app.get('/product/order/:productId', function (req, res) { res.redirect(301, (req.url + '/step-1').itrim('/')); });
app.get('/product/order/:productId/step-:step([1-9])', products.order);


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

// Account management
app.get('/auth/logout', auth.logout);
app.post('/auth/login', auth.login);
app.get('/auth/login', auth.displayLogin);
app.get('/login', function (req, res) {
    res.redirect('/auth/login' + (url.parse(req.url).search || ''));
});

app.get('/auth/forgotpw', auth.forgotPassword);
app.post('/auth/forgotpw', auth.retrievePassword);
app.get('/auth/resetpw/:nonce/:verifier', auth.resetPassword);

app.get('/account/changepw', account.displayChangePassword);
app.post('/account/changepw', account.changePassword);

app.get('/account/register', account.register);
app.get('/register', account.register); // Alias
app.post('/account/register', account.doRegister);
app.post('/account/register', account.register); // If the registration fails


// Star management
app.get('/star/add', manager.addStarForm);
app.post('/star/add', manager.addStar);
app.get('/product/add', manager.addProduct);
app.post('/product/add', manager.doAddProduct);
app.get('/manage/dashboard', manager.listProducts);
app.get('/product/delete/:productId', manager.deleteProduct);

app.post('/star/upload/image', manager.tempUploadImage);
app.options('/star/upload/image', manager.tempUploadImage);






// <<<<<<<<<<<<<<<<<
var server = http.createServer(app);

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
