var fs = require('fs');
var router = require('unifile/lib/core/router.js');
var exec = require('child_process').exec;

/*
 * @method scanPath scan the given remote path with unifile and return a pathInfos object (for unigrab.grabFolder)
 * @return {Object} pathInfos
 */
exports.scanPath = function(service, localPath, remotePath, ignorePath, req, socketIoConfig, done) {
    exports.ioEmit(socketIoConfig, "scan your " + service + " path");

    var pathInfos = {start: 0, success: 0, error: 0, fileCount: 0, fileList: {}, timeStart: 0};
    var timeoutGrab = 5000;

    exports.createLocalPath(localPath, 0, function(success) {
        if (success) {
            checkPath(remotePath);
        } else {
            exports.ioEmit(socketIoConfig, "create local path failed");
        }
    });

    function checkPath(currentPath) {
        //check if path is ignored or not
        isIgnore(currentPath, ignorePath, function(ignored) {
            if (!ignored) {
                //scan the given path and redirect to scanPath again or add file in the grab list
                router.route(service, ["exec", "ls", currentPath], req, null, null, function(response, status, reply) {

                    if (status.success) {
                        //create local directory like remote
                        exports.createLocalPath(localPath + "/" + currentPath, 0, function(success) {
                            if (success) {
                                //scan all the entry in ls request reply
                                for (var i in reply) {
                                    var filePath = currentPath + '/' + reply[i].name;

                                    //if it's a directory, scan it
                                    if (reply[i].is_dir) {

                                        checkPath(filePath);

                                    } else {
                                    //else add this file to grab list
                                        //WARNING ! We must wait to list all the directories before starting to grab files because off dropbox request limit
                                        pathInfos.fileCount++;
                                        pathInfos.fileList[filePath] = {
                                            url: filePath,
                                            start: false,
                                            success: false,
                                            error: false
                                        }
                                        exports.ioEmit(socketIoConfig, "files found: " + pathInfos.fileCount);
                                    }
                                }
                            } else {
                                checkPath(currentPath);
                            }
                        });
                    } else if (status.code === 503){
                        //if we have an error (generally 503), try again later
                        checkPath(currentPath);
                        exports.ioEmit(socketIoConfig, "dropbox api request limit, need to wait a little -- " + "files found: " + pathInfos.fileCount);
                    }
                });
            }

            if (pathInfos.timeoutGrab) {
                clearTimeout(pathInfos.timeoutGrab);
                pathInfos.timeoutGrab = null;
            }

            //when scan is finished for [timeoutGrab] --> return dl status
            pathInfos.timeoutGrab = setTimeout(function() {
                done(pathInfos);
            }, timeoutGrab);
        });
    }

    function isIgnore(path, ignorePath, cbk) {
        var isIgnored = false;

        for (var i in ignorePath) {
            if (ignorePath.hasOwnProperty(i) && path.indexOf(ignorePath[i]) !== -1) {
                isIgnored = true;
            }
        }

        cbk(isIgnored);
    }
}

/*
 * @method grabFolder download the given remote folder at the given localPath with unifile
 *
 */
exports.grabFolder = function(service, localPath, pathInfos, req, socketIoConfig, done) {
    if (!pathInfos) {
        throw "unigrab : grabFolder error, you must fill pathInfos param, return by unigrab.scanPath";
    }

    startToGrabAllFiles();

    function startToGrabAllFiles() {
        exports.ioEmit(socketIoConfig, "start downloading files");
        console.log("\n");
        console.log("*************************************************************");
        console.log("START TO GRAB " + pathInfos.fileCount + " FILE");
        console.log("*************************************************************");
        console.log("ESTIMATE TIME: " + exports.estimateTime(pathInfos.fileCount));
        console.log("*************************************************************");
        console.log("\n");
        pathInfos.timeStart = Date.now();
        for (var i in pathInfos.fileList) {
            grabFile(pathInfos.fileList[i].url, req, pathInfos);
        }
    }

    function grabFile(filePath) {
        //prevent from werd issue
        if (pathInfos.fileList[filePath].success) {
            return;
        }

        if (!pathInfos.fileList[filePath].start) {
            pathInfos.fileList[filePath].start = true;
            pathInfos.start++;
        }

        router.route(service, ["exec", "get", filePath], req, null, null, function(response, status, text_content, mime_type) {
            if (status.success) {
                pathInfos.success++;
                pathInfos.fileList[filePath].success = true;

                if (filePath.indexOf(".gitmodules") !== -1 && text_content.success) {
                    text_content = "";
                }

                fs.writeFile(localPath + "/" + filePath, text_content);

                exports.ioEmit(socketIoConfig, "download status: " + pathInfos.success + "/" + pathInfos.start + " (" + exports.estimateTime(pathInfos.fileCount) + " left)");
            } else {
                pathInfos.error++;
                pathInfos.fileList[filePath].error = true;
                grabFile(pathInfos.fileList[filePath].url);

                exports.ioEmit(socketIoConfig, "dropbox api request limit, need to wait a little -- " +
                    "download status: " + pathInfos.success + "/" + pathInfos.start + " (" + exports.estimateTime(pathInfos.fileCount) + " left)");
            }

            if (pathInfos.success === pathInfos.fileCount) {
                var timeElapsed = (Date.now() - pathInfos.timeStart) / 1000;
                exports.ioEmit(socketIoConfig, "download finished on: " + timeElapsed + "s");
                done("download finished on: " + timeElapsed + "s");
            }
        });
    }
}

/*
 * @method createLocalPath create the local path given
 *
 */

exports.createLocalPath = function(localPath, current, done) {
    var tabPath = localPath.split("/");
    var stringPath = "";
    var loop = (current === tabPath.length - 1) ? false : true;

    for (var i = 0; i <= current; i++) {
        stringPath += tabPath[i] + "/";
    }

    createFolder(stringPath, function(success) {
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

    function createFolder(path, done) {
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
}

/*
 * @method ioEmit emit to io sockets a message on a private channel
 *
 */

exports.ioEmit = function(socketIoConfig, message) {
    if (socketIoConfig && socketIoConfig.io && socketIoConfig.key && socketIoConfig.io.sockets) {
        socketIoConfig.io.sockets.emit(socketIoConfig.key, {code: message});
    }
}

/*
 * @method estimateTime estimate the download time with request number (experimental)
 *
 */

exports.estimateTime = function(nbRequest) {
    var duration, time, returnTime;
    var lowEstimatedTimePerRequest = 94.0545455;
    var highEstimatedTimePerRequest = 137.450425;

    duration = nbRequest <= 200 ? lowEstimatedTimePerRequest : highEstimatedTimePerRequest;
    time = nbRequest * duration;
    returnTime = time >= 60000 ? parseInt((time / 1000) / 60) : parseInt(time / 1000);
    returnUnit = time >= 60000 ? "mn" : "s";

    return (returnTime + returnUnit);
}
