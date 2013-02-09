

var http = require('http'),
    db = require('./util/db'),
    cli = require('cli-color');

require('./util/extend');

var counter = 0,
    url = 'www.magiccrush.com',
    end = 972001;

db.mongoConnect({db: 'test', collection: 'magiccrush'}, function (err, collection) {
    !function doLoop () {
        (function (counter) {
            var options = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control':	'max-age=0',
                    'Cookie':	'PHPSESSID=190e618cead64bd0a16621e4c6c9f18d',
                    'Host':	'www.magiccrush.com',
                    'User-Agent':	'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:18.0) Gecko/20100101 Firefox/18.0'
                }
            };

            var req = http.request('http://www.magiccrush.com:80/view_results.php?id=' + counter, function (res) {
                if(res.statusCode !== 200) {
                    console.error(cli.red('HTTP ERROR'), res.statusCode);
                    return;
                }

                var data = '';

                res.on('data', function (chunk) {
                    data += chunk;
                }).on('end', function () {
                    console.log('Saving data for ID ' + counter);
                    
                    var names = /"form_r">([^\/]*)<\/td>/.exec(data);
                    names = names && names[1];
                    
                    if(names) {
                        names = names.split('<br>');
                        
                        var person = names.shift().trim(),
                            crush = names;
                        
                        crush.forEach(function (name, i) {
                            crush[i] = name.trim();
                        });
                        
                        crush = crush.filter(function (name) {
                            return Boolean(name);
                        });
                        
                        collection.insert({id: counter, raw: data, person: person, crush: crush}, function (err) {
                            if(err) {
                                console.log(cli.red('Unable to save data for ID ' + counter), err);
                                return;
                            }
                            
                            console.log(cli.green(person), cli.blue(crush));
                        });
                    }
                });
            });
            
            for(var i in options.headers) {
                req.setHeader(i, options.headers[i]);
            }
            
            req.on('error', function () {
                    console.error(cli.red('NETWORK ERROR'), 'Something is not right');
                    console.log(arguments);
            });
            
            req.end();
        })(counter);
        
        counter++;
        
        if(counter <= end) {
            doLoop.defer(10);
        }
    }();
});

