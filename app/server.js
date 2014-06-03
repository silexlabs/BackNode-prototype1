var express = require('express'),
io = require('socket.io'),
http = require('http'),
unifile = require('unifile'),
unigit = require('./server_module/unigit.js');

var backnode = express();
var serverIo = http.createServer(backnode);
var socketIo = io.listen(serverIo, { log: false });

var options = unifile.defaultConfig;

//unifile
backnode.use(unifile.middleware(express, backnode, options))

//unigit
.use(unigit.middleware(backnode, socketIo))

//static
.use('/cloud-explorer', express.static(__dirname + '/../submodules/cloud-explorer/lib/'))
.use('/app', express.static(__dirname + '/../app/'))
.use('/admin', express.static(__dirname + '/../admin/'))
.use('/', express.static(__dirname + '/../app/'))
.use('/', express.static(__dirname + '/../public/'))
.use('/', express.static(__dirname + '/../submodules/'))

//404 not found
.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(404, 'Not Found');
});

serverIo.listen(process.env.PORT || 8080);

console.log('now listening on port ', (process.env.PORT || 8080));
