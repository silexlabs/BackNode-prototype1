var router = require('unifile/lib/core/router.js');
var unigrab = require('./unigrab.js');

//grab the .git folder on the remotePath given
exports.grabGit = function(service, localPath, remotePath, req, socketIoConfig, done) {
    unigrab.scanPath(service, localPath, remotePath + "/.git", null, req, socketIoConfig, function(pathInfos) {
        unigrab.ioEmit(socketIoConfig, "total files git: " + pathInfos.fileCount);
        unigrab.grabFolder(service, localPath, pathInfos, req, socketIoConfig, function(message) {
            done(message);
        });
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

exports.find = function(service, remotePath, req, done) {
    var gitPath = null;

    var treeIndex = remotePath.split("/");
        treeIndex.pop(); //delete first blank entry

    inspectPath(treeIndex);

    function inspectPath(currentTab) {
        var current = (currentTab.length >= 1) ? currentTab.join("/") : "";

        router.route(service, ["exec", "ls", current], req, null, null, function(response, status, reply) {
            if (status.success) {
                isGitDirectory(reply, function(isGit) {
                    if (isGit) {
                        gitPath = current;
                        done(gitPath);
                    } else if (treeIndex !== null) {
                        currentTab.pop();
                        inspectPath(currentTab);
                    } else if (treeIndex === null && gitPath === null) {
                        done(false);
                    }
                });
            }
        });
    }

    function isGitDirectory(unifileResponse, done) {
        var isGit = false;
        if (unifileResponse.length) {
            for (var unifileObject in unifileResponse) {
                if (unifileResponse.hasOwnProperty(unifileObject) && unifileResponse[unifileObject].name && unifileResponse[unifileObject].name === ".git"  && !gitPath) {
                    isGit = true;
                }
            }
        }
        done(isGit);
    }
}
