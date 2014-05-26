var express = require('express'),
unifile = require('unifile'),
http = require('http'),
unigit = require('./server_module/unigit.js'),
unigrab = require('./server_module/unigrab.js'),
uniput = require('./server_module/uniput.js'),
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
    var socketIoConfig = {io:socketIo, key:req.param('deployKey')};
    var localPath = "tempFolder/" + req.param('deployKey');

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
            socketIoConfig.key = deployKey;

            unigit.scanGitIgnore("dropbox", req.param('path'), req, function(ignorePath) {
                unigrab.scanPath("dropbox", "tempFolder/" + deployKey, req.param('path'), ignorePath, req, socketIoConfig, function(pathInfos) {
                    unigrab.ioEmit(socketIoConfig, "total files: " + pathInfos.fileCount + " estimate duration: " + unigrab.estimateTime(pathInfos.fileCount));
                    pathFileInfo[deployKey] = pathInfos;
                });
            });

            res.write(JSON.stringify({deployKey: deployKey}));
            res.send();
        break;

        case 'git':
            // grab the .git folder on user remote directory (we don't need other files to deploy modification)
            // unigit use the unigrab module to grab .git folder, use unigrab directly if you don't want to retrieve .git but all the remote folders
            unigit.grabGit("dropbox", localPath, req.param('path'), req, socketIoConfig, function(message) {
                unigrab.ioEmit(socketIoConfig, message);
            });
            res.send();
        break;

        case 'create':
            unigit.createRepo(req.param('name'), req.param('accessToken'), function(repoUrl) {
                res.write(JSON.stringify({repoUrl: repoUrl}));
                res.send();
            });
        break;

        case 'all' :
            // grab a folder (not just .git)
            unigrab.grabFolder("dropbox", localPath, pathFileInfo[req.param('deployKey')], req, socketIoConfig, function(message) {
                unigit.deployOnGHPages(localPath + "/" + req.param('path'), req.param('accessToken'), req.param('initOnUrl'), req, socketIoConfig, function(done) {
                    if (done) {
                        var gitFolder = req.param('path') + "/.git";
                        unigrab.ioEmit(socketIoConfig, "update git project status on your dropbox folder...");
                        // when deploy is finish on gitHub, we must update the .git folder on dropbox, because we do the commit on backnode local machine, so the dropbox project don't know about commit
                        uniput.putFolder("dropbox", localPath, gitFolder, req, function(error) {
                            if (!error) {
                                unigrab.ioEmit(socketIoConfig, "git updated, deploy ok");
                                unigit.getGitHubPageUrl(localPath + "/" + req.param('path'), function(error, stdout) {
                                    if (!error) {
                                        unigrab.ioEmit(socketIoConfig, stdout);
                                    }
                                });
                            } else {
                                unigrab.ioEmit(socketIoConfig, "git not updated, deploy error");
                            }
                        });
                    }
                });
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
