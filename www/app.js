
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , stars = require('./routes/stars.js')
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
app.get('/star/:starId([0-9]+)/book', stars.book);

http.createServer(app).listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port " + app.get('port'));
});
