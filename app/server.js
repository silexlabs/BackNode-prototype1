var express = require('express'),
unifile = require('unifile'),
http = require('http'),
unigit = require('./server_module/unigit.js'),
unigrab = require('./server_module/unigrab.js'),
bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
io = require('socket.io'),
cookieSession = require('cookie-session');

var backnode = express();
var serverIo = http.createServer(backnode);
var socketIo = io.listen(serverIo);

var options = unifile.defaultConfig;
var pathFileInfo = {};

//To use unifile as an api
backnode.use('/deploy', bodyParser())
.use('/deploy', cookieParser())
.use('/deploy', cookieSession({ secret: 'plum plum plum'}))

//unifile
.use(unifile.middleware(express, backnode, options))

//static
.use('/cloud-explorer', express.static(__dirname + '/../submodules/cloud-explorer/lib/'))
.use('/app', express.static(__dirname + '/../app/'))
.use('/admin', express.static(__dirname + '/../admin/'))
.use('/', express.static(__dirname + '/../app/'))
.use('/', express.static(__dirname + '/../public/'))
.use('/', express.static(__dirname + '/../submodules/'))

//deploy plugin
.use('/gitOauth', cookieParser('backNodeGit'))
.use('/gitOauth', cookieSession({ secret: 'backNodeGit'}))
.get('/gitOauth', unigit.oauth)
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
                unigrab.scanPath("dropbox", "tempFolder/" + deployKey, req.param('path'), ignorePath, req, {io: socketIo, key: deployKey}, function(pathInfos) {
                    unigrab.ioEmit({io: socketIo, key: deployKey}, "total files: " + pathInfos.fileCount + " estimate duration: " + unigrab.estimateTime(pathInfos.fileCount));
                    pathFileInfo[deployKey] = pathInfos;
                });
            });

            res.write(JSON.stringify({deployKey: deployKey}));
            res.send();
        break;

        case 'git':
            // grab the .git folder on user remote directory (we don't need other files to deploy modification)
            // unigit use the unigrab module to grab .git folder, use unigrab directly if you don't want to retrieve .git but all the remote folders
            unigit.grabGit("dropbox", "tempFolder/" + req.param('deployKey'), req.param('path'), req, {io: socketIo, key: req.param('deployKey')}, function(message) {
                unigrab.ioEmit({io: socketIo, key: req.param('deployKey')}, message);
            });
            res.send();
        break;

        default :
            // grab a folder (not just .git)
            unigrab.grabFolder("dropbox", "tempFolder/" + req.param('deployKey'), pathFileInfo[req.param('deployKey')], req, {io: socketIo, key: req.param('deployKey')}, function(message) {
                unigit.deployOnGHPages("tempFolder/" + req.param('deployKey') + "/" + req.param('path'), {io: socketIo, key: req.param('deployKey')});
            });
            res.send();
        break;
    }
})

//404 not found
.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Not Found');
});

serverIo.listen(process.env.PORT || 8080);

console.log('now listening on port ', (process.env.PORT || 8080));
