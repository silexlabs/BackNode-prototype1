var Express = require('express');
var Unifile = require('unifile');
var http = require('http');
var unigit = require('./server_module/unigit.js');
var unigrab = require('./server_module/unigrab.js');

var options = Unifile.defaultConfig;
    options.staticFolders.push(
        {
            name: '/cloud-explorer',
            path: '../../../../submodules/cloud-explorer/lib/app/'
        },
        {
            name: '/cetest',
            path: '../../../../submodules/cloud-explorer/lib/app/'
        }
    );

var backnode = Express();

//To use unifile as an api
backnode.use('/deploy', Express.bodyParser())
.use('/deploy', Express.cookieParser())
.use('/deploy', Express.cookieSession({ secret: 'plum plum plum'}))

//Unifile
.use(Unifile.middleware(Express, backnode, options))

//static
.use('/submodules', Express.static(__dirname + '/../submodules'))
.use('/cloud-explorer', Express.static(__dirname + '/../submodules/cloud-explorer/lib'))
.use('/app', Express.static(__dirname + '/../app'))
.use('/admin', Express.static(__dirname + '/../admin'))
.use('/bower_components', Express.static(__dirname + '/../bower_components'))
.use('/', Express.static(__dirname + '/../public'))

.get('/deploy/:type', function(req, res) {
    var rd = Date.now() * (Math.random() * 10000);
    var str = rd.toString().replace(".", "");

    if (req.param('type') === 'git') {
        /* grab the .git folder on user remote directory (we don't need other files to deploy modification)
         * unigit use the unigrab module to grab .git folder, use unigrab directly if you don't want to retrieve .git but all the remote folders
         * you can test this feature with an url in your navigator used to connect to dropbox like this:
         * http://localhost:8080/deploy/git?path=DROPBOX_FOLDER_TO_GRAB
         * and see download logs on your terminal
         */
        unigit.grabGit("dropbox", req.param('path'), "tempFolder/" + str, req);
    } else {
        /* grab a folder (not just .git)
         * you can test this feature with an url in your navigator used to connect to dropbox like this: http://localhost:8080/deploy/other?path=DROPBOX_FOLDER_TO_GRAB
         * and see download logs on your terminal
         */
        unigrab.grabFolder("dropbox", req.param('path'), "tempFolder/" + str, null, req);
    }

    res.send();
})

.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Not Found');
});

backnode.listen(process.env.PORT || 8080);
console.log('now listening on port ', (process.env.PORT || 8080));
