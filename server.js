var Express = require('express');
var Unifile = require('unifile');

var options = Unifile.defaultConfig;
	options.staticFolders.push(
		{
			name: '/cloud-explorer',
			path: '../../../../lib/cloud-explorer/lib/app/'
		},
		{
			name: '/cetest',
			path: '../../../../lib/cloud-explorer/lib/app/'
		}
	);

var backnode = Express();
	backnode.use(Unifile.middleware(Express, backnode, options));
	backnode.use('/', Express.static(__dirname + '/public'));
	backnode.use(function(req, res, next) {
		res.setHeader('Content-Type', 'text/plain');
		res.send(404, 'Not Found');
	});
	backnode.listen(process.env.PORT || 8080);
