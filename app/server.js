var Express = require('express');
var Unifile = require('unifile');
var http = require('http');
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
backnode.use('/grabFolder', Express.bodyParser())
.use('/grabFolder', Express.cookieParser())
.use('/grabFolder', Express.cookieSession({ secret: 'plum plum plum'}))

//Unifile
.use(Unifile.middleware(Express, backnode, options))

//static
.use('/submodules', Express.static(__dirname + '/../submodules'))
.use('/cloud-explorer', Express.static(__dirname + '/../submodules/cloud-explorer/lib'))
.use('/app', Express.static(__dirname + '/../app'))
.use('/admin', Express.static(__dirname + '/../admin'))
.use('/', Express.static(__dirname + '/../public'))

.get('/grabFolder', function(req, res) {
    var rd = Date.now() * (Math.random() * 10000);
    var str = rd.toString().replace(".", "");
	unigrab.grabFolder("dropbox", req.param('path'), "tempFolder/" + str, req, res);
})

.use(function(req, res, next) {
	res.setHeader('Content-Type', 'text/plain');
	res.send(404, 'Not Found');
});

backnode.listen(process.env.PORT || 8080);
console.log('now listening on port ', (process.env.PORT || 8080));
