var fs = require('fs');
var router = require('unifile/lib/core/router.js');
var currentService = "dropbox";

exports.grabFolder = function(path, req, res) {
    var rd = Date.now() * (Math.random() * 10000);
    var localFolder = "tempFolder/" + rd + "/";

    //create main temp folder for all the grab folder
    exports.createFolder(localFolder.split("/")[0], function(success) {
        if (success) {
            //create a special folder with a random name to grab user's folders
            exports.createFolder(localFolder, function(success) {
                if (success) {
                    //scan the dropbox folder to find a .gitignore if they are
                    exports.scanGitIgnore(path, req, function(ignore) {
                        //scan the dropbox folder to grab all the files
                        exports.scanPath(path, localFolder, req, ignore);
                    });
                } else {
                    res.send(404);
                }
            });
        } else {
            res.send(404);
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

exports.scanPath = function(path, root, req, ignore) {
    exports.isIgnore(path, ignore, function(ignored) {
        if (!ignored) {
            console.log("GRAB: " + path);
            fs.mkdir(root + path);
            router.route(currentService, ["exec", "ls", path], req, null, null, function(response, status, reply) {
                for (var i in reply) {
                    if (reply[i].is_dir) {
                        exports.scanPath(path + '/' + reply[i].name, root, req, ignore);
                    }
                }
            });
        }
    });
}

exports.scanGitIgnore = function(path, req, done) {
    var ignore = [];
    router.route(currentService, ["exec", "get", path + "/.gitignore"], req, null, null, function(response, status, text_content, mime_type) {
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
    console.log(ignore);
    for (var i in ignore) {
        if (ignore.hasOwnProperty(i) && path.indexOf(ignore[i]) !== -1) {
            isIgnored = true;
        }
    }

    done(isIgnored);
}
