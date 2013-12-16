/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , picServer = require('./server')
  , extend = require('./util/extend');

var app = express();

app.set('json spaces', null);

app.configure(function(){
  app.set('port', process.env.PORT || 23091);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.use(express.favicon());
  app.use(express.cookieParser({secret: 'sdfg'}));
  app.use(express.logger('dev'));
//  app.use(express.bodyParser());
  app.use(express.json());
  app.use(express.urlencoded());

  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


// ROUTERS
app.post('/convert', picServer.convert);

// END ROUTERS


var server = http.createServer(app);

server.listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
});
