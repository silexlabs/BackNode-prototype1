var Express = require('express');
var Unifile = require('unifile');

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
	backnode.use(Unifile.middleware(Express, backnode, options));
	backnode.use('/submodules', Express.static(__dirname + '/../submodules'));
	backnode.use('/cloud-explorer', Express.static(__dirname + '/../submodules/cloud-explorer/lib'));
	backnode.use('/app', Express.static(__dirname + '/../app'));
	backnode.use('/admin', Express.static(__dirname + '/../admin'));
	backnode.use('/', Express.static(__dirname + '/../public'));
	backnode.use(function(req, res, next) {
		res.setHeader('Content-Type', 'text/plain');
		res.send(404, 'Not Found');
	});
	backnode.listen(process.env.PORT || 8080);
	console.log('now listening on port ', (process.env.PORT || 8080));
