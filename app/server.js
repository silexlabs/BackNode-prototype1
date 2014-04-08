var Express = require('express');
var Unifile = require('unifile');
var http = require('http');
var fs = require('fs');
var router = require('unifile/lib/core/router.js');

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
backnode.use('/grabGit', Express.bodyParser())
.use('/grabGit', Express.cookieParser())
.use('/grabGit', Express.cookieSession({ secret: 'plum plum plum'}))

//Unifile
.use(Unifile.middleware(Express, backnode, options))

//static
.use('/submodules', Express.static(__dirname + '/../submodules'))
.use('/cloud-explorer', Express.static(__dirname + '/../submodules/cloud-explorer/lib'))
.use('/app', Express.static(__dirname + '/../app'))
.use('/admin', Express.static(__dirname + '/../admin'))
.use('/', Express.static(__dirname + '/../public'))

.get('/grabGit', function(req, res) {
	var rd = Date.now();
	fs.exists("tempGit/", function(exist) {
		if (!exist) {
			fs.mkdirSync("tempGit", 0777);
		}

		fs.mkdir("tempGit/" + rd, 0777, function(error) {
			if (error) {
				console.log(error);
			} else {
				scanPath("tempGit/" + rd + "/", req.param('path'), req, function(data) {
					res.send();
				});
			}
		});
	});
})

.use(function(req, res, next) {
	res.setHeader('Content-Type', 'text/plain');
	res.send(404, 'Not Found');
});

function scanPath(root, path, req, cbk) {
	console.log("GRAB: " + path);
	fs.mkdir(root + path);
	router.route("dropbox", ["exec", "ls", path], req, null, null, function(response, status, reply) {
		for (var i in reply) {
			if (reply[i].is_dir) {
				scanPath(root, path + '/' + reply[i].name, req, cbk);
			}
		}
	});
}


backnode.listen(process.env.PORT || 8080);
console.log('now listening on port ', (process.env.PORT || 8080));
