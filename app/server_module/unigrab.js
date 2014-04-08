var fs = require('fs');
var router = require('unifile/lib/core/router.js');
var currentService = "dropbox";

exports.grabFolder = function(service, remotePath, localPath, req) {
    exports.createLocalPath(localPath, 0, function(success) {
        if (success) {
            //scan the dropbox folder to find a .gitignore if they are
            exports.scanGitIgnore(service, remotePath, req, function(ignore) {
                var dlStatus = {start: 0, success: 0, error: 0};
                //scan the dropbox folder to grab all the files
                exports.scanPath(service, remotePath, localPath, req, ignore, dlStatus);
            });
        } else {
            res.send(404);
        }
    });
}

exports.createLocalPath = function(localPath, current, done) {
    var tabPath = localPath.split("/");
    var stringPath = "";
    var loop = (current === tabPath.length - 1) ? false : true;

    for (var i = 0; i <= current; i++) {
        stringPath += tabPath[i] + "/";
    }

    exports.createFolder(stringPath, function(success) {
        if (success) {
            if (loop) {
                current++;
                exports.createLocalPath(localPath, current, done);
            } else {
                done(true);
            }
        } else {
            done(false);
        }
    });
}

exports.createFolder = function(path, done) {
    fs.exists(path, function(exist) {
        if (!exist) {
            fs.mkdir(path, 0777, function(error) {
                if (error) {
                    done(false);
                } else {
                    done(true);
                }
            });
        } else {
            done(true);
        }
    });
}

exports.scanPath = function(service, remotePath, localPath, req, ignore, dlStatus) {
    exports.isIgnore(remotePath, ignore, function(ignored) {
        if (!ignored) {
            //console.log("FOLDER: " + remotePath);
            fs.mkdir(localPath + remotePath);
            router.route(service, ["exec", "ls", remotePath], req, null, null, function(response, status, reply) {
                for (var i in reply) {
                    if (reply[i].is_dir) {
                        exports.scanPath(service, remotePath + '/' + reply[i].name, localPath, req, ignore, dlStatus);
                    } else {
                        exports.grabFile(service, remotePath + '/' + reply[i].name, localPath, req, dlStatus);
                    }
                }
            });
        }
    });
}

exports.grabFile = function(service, filePath, localPath, req, dlStatus) {
    dlStatus.start++;
    console.log("dlStatus: " + dlStatus.start + " / " + dlStatus.success + " / " + dlStatus.error);
    router.route(service, ["exec", "get", filePath], req, null, null, function(response, status, text_content, mime_type) {
        if (status.success) {
            dlStatus.success++;
        } else {
            dlStatus.error++;
            console.log(status.code);
            console.log(filePath);
            console.log(response);
        }
    });
}

exports.scanGitIgnore = function(service, path, req, done) {
    var ignore = [];
    router.route(service, ["exec", "get", path + "/.gitignore"], req, null, null, function(response, status, text_content, mime_type) {
        if (status.success) {
            var tmpI = text_content.toString().split("\n");
            for (var i in tmpI) {
                if (tmpI.hasOwnProperty(i) && tmpI[i].indexOf("*") === -1 && tmpI[i] !== "") {
                    ignore.push(tmpI[i]);
                }
            }
        }

        done(ignore);
    });
}

exports.isIgnore = function(path, ignore, done) {
    var isIgnored = false;

    for (var i in ignore) {
        if (ignore.hasOwnProperty(i) && path.indexOf(ignore[i]) !== -1) {
            isIgnored = true;
        }
    }

    done(isIgnored);
}
