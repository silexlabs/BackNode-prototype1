var Express = require('express'),
Unifile = require('unifile'),
http = require('http'),
unigit = require('./server_module/unigit.js'),
unigrab = require('./server_module/unigrab.js'),
bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
io = require('socket.io').listen(8000),
cookieSession = require('cookie-session');

var options = Unifile.defaultConfig;

var pathFileInfo = {};

var backnode = Express();

//To use unifile as an api
backnode.use('/deploy', bodyParser())
.use('/deploy', cookieParser())
.use('/deploy', cookieSession({ secret: 'plum plum plum'}))

//Unifile
.use(Unifile.middleware(Express, backnode, options))

//static
.use('/cloud-explorer', Express.static(__dirname + '/../submodules/cloud-explorer/lib/'))
.use('/admin', Express.static(__dirname + '/../admin'))
.use('/app', Express.static(__dirname + '/../app/'))
.use('/', Express.static(__dirname + '/../public'))
.use('/', Express.static(__dirname + '/../node_modules/socket.io/node_modules/socket.io-client/'))
.use('/', Express.static(__dirname + '/../bower_components/bootstrap/'))
.use('/', Express.static(__dirname + '/../bower_components/jquery/'))
.use('/', Express.static(__dirname + '/../submodules/cloud-explorer/'))

.get('/deploy/:type', function(req, res) {
    switch (req.param('type')) {

        case 'searchGit':
            unigit.find("dropbox", req.param('path'), req, function(isGit) {
                res.write(JSON.stringify({git: isGit}));
                res.send();
            });
        break;

        case 'scan':
            var rd = Date.now() * (Math.random() * 10000);
            var deployKey = rd.toString().replace(".", "");

            unigit.scanGitIgnore("dropbox", req.param('path'), req, function(ignorePath) {
                unigrab.scanPath("dropbox", "tempFolder/" + deployKey, req.param('path'), ignorePath, req, {io: io, key: deployKey}, function(pathInfos) {
                    unigrab.ioEmit({io: io, key: deployKey}, "total files: " + pathInfos.fileCount + " estimate duration: " + unigrab.estimateTime(pathInfos.fileCount));
                    pathFileInfo[deployKey] = pathInfos;
                });
            });

            res.write(JSON.stringify({deployKey: deployKey}));
            res.send();
        break;

        case 'git':
            // grab the .git folder on user remote directory (we don't need other files to deploy modification)
            // unigit use the unigrab module to grab .git folder, use unigrab directly if you don't want to retrieve .git but all the remote folders
            unigit.grabGit("dropbox", "tempFolder/" + req.param('deployKey'), req.param('path'), req, {io: io, key: req.param('deployKey')}, function(message) {
                unigrab.ioEmit({io: io, key: req.param('deployKey')}, message);
            });
            res.send();
        break;

        default :
            // grab a folder (not just .git)
            unigrab.grabFolder("dropbox", "tempFolder/" + req.param('deployKey'), pathFileInfo[req.param('deployKey')], req, {io: io, key: req.param('deployKey')}, function(message) {
                unigrab.ioEmit({io: io, key: req.param('deployKey')}, message);
            });
            res.send();
        break;
    }
})

.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Not Found');
});

backnode.listen(process.env.PORT || 8080);

console.log('now listening on port ', (process.env.PORT || 8080));
