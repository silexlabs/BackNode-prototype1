var router = require('unifile/lib/core/router.js');
var unigrab = require('./unigrab.js');

//grab the .git folder on the remotePath given
exports.grabGit = function(service, remotePath, localPath, req, socketIoConfig) {
    exports.scanGitIgnore(service, remotePath, req, function(ignorePath) {
        unigrab.grabFolder(service, remotePath + "/.git", localPath, ignorePath, req, socketIoConfig);
    });
}

//scan the .gitignore on remotePath and return a ignored path array
exports.scanGitIgnore = function(service, remotePath, req, done) {
    var ignorePath = [];
    router.route(service, ["exec", "get", remotePath + "/.gitignore"], req, null, null, function(response, status, text_content, mime_type) {
        if (status.success) {
            var tmpI = text_content.toString().split("\n");
            for (var i in tmpI) {
                if (tmpI.hasOwnProperty(i) && tmpI[i].indexOf("*") === -1 && tmpI[i] !== "") {
                    ignorePath.push(tmpI[i]);
                }
            }
        }

        done(ignorePath);
    });
}
