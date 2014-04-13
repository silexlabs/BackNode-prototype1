var fs = require('fs');
var router = require('unifile/lib/core/router.js');
var lowEstimatedTimePerRequest = 94.0545455;
var highEstimatedTimePerRequest = 137.450425;

exports.grabFolder = function(service, remotePath, localPath, ignorePath, req, socketIoConfig) {
    ioEmit("scan your " + service + "path");

    createLocalPath(localPath, 0, function(success) {
        if (success) {
            var dlStatus = {start: 0, success: 0, error: 0, fileCount: 0, fileList: {}, timeStart: 0};
            //scan the dropbox folder to grab all the files
            scanPath(service, remotePath, localPath, req, ignorePath, dlStatus, 5000);
        } else {
            res.send(404);
        }
    });

    /////////////////////////////
    function createLocalPath(localPath, current, done) {
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
                    createLocalPath(localPath, current, done);
                } else {
                    done(true);
                }
            } else {
                done(false);
            }
        });
    }

    /////////////////////////////
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

    //////////////////////////
    function scanPath(service, remotePath, localPath, req, ignorePath, dlStatus, timeoutGrab) {
        //check if path is ignored or not
        isIgnore(remotePath, ignorePath, function(ignored) {
            if (!ignored) {
                //scan the given path and redirect to scanPath again or add file in the grab list
                router.route(service, ["exec", "ls", remotePath], req, null, null, function(response, status, reply) {

                    if (status.success) {
                        //create local directory like remote
                        createLocalPath(localPath + "/" + remotePath, 0, function(done) {
                            if (done) {
                                //scan all the entry in ls request reply
                                for (var i in reply) {
                                    var filePath = remotePath + '/' + reply[i].name;

                                    //if it's a directory, scan it
                                    if (reply[i].is_dir) {

                                        scanPath(service, filePath, localPath, req, ignorePath, dlStatus, timeoutGrab);

                                    } else {
                                    //else add this file to grab list
                                        //WARNING ! We must wait to list all the directories before starting to grab files because off dropbox request limit
                                        dlStatus.fileCount++;
                                        dlStatus.fileList[filePath] = {
                                            url: filePath,
                                            start: false,
                                            success: false,
                                            error: false
                                        }
                                        ioEmit("files found: " + dlStatus.fileCount);
                                    }
                                }
                            } else {
                                scanPath(service, remotePath, localPath, req, ignorePath, dlStatus, timeoutGrab);
                            }
                        });
                    } else if (status.code === 503){
                        //if we have an error (generally 503), try again later
                        scanPath(service, remotePath, localPath, req, ignorePath, dlStatus, timeoutGrab);
                        ioEmit("dropbox api request limit, need to wait a little");
                    }
                });
            }

            if (dlStatus.timeoutGrab) {
                clearTimeout(dlStatus.timeoutGrab);
                dlStatus.timeoutGrab = null;
            }

            //when scan is finished for [timeoutGrab] --> call grab on file
            dlStatus.timeoutGrab = setTimeout(function() {
                startToGrabAllFiles(service, localPath, req, dlStatus);
            }, timeoutGrab);
        });
    }

    //////////////////////////
    function startToGrabAllFiles(service, localPath, req, dlStatus) {
        ioEmit("start downloading files");
        console.log("\n");
        console.log("*************************************************************");
        console.log("PATH SCANNED !! START TO GRAB " + dlStatus.fileCount + " FILE");
        console.log("*************************************************************");
        console.log("ESTIMATE TIME: " + estimateTime(dlStatus.fileCount));
        console.log("*************************************************************");
        console.log("\n");
        dlStatus.timeStart = Date.now();
        for (var i in dlStatus.fileList) {
            grabFile(service, dlStatus.fileList[i].url, localPath, req, dlStatus);
        }
    }

    //////////////////////////
    function grabFile(service, filePath, localPath, req, dlStatus) {
        //prevent from werd issue
        if (dlStatus.fileList[filePath].success) {
            return;
        }

        if (!dlStatus.fileList[filePath].start) {
            dlStatus.fileList[filePath].start = true;
            dlStatus.start++;
        }

        router.route(service, ["exec", "get", filePath], req, null, null, function(response, status, text_content, mime_type) {
            if (status.success) {
                dlStatus.success++;
                dlStatus.fileList[filePath].success = true;
                fs.writeFile(localPath + "/" + filePath, text_content);
            } else {
                dlStatus.error++;
                dlStatus.fileList[filePath].error = true;
                grabFile(service, dlStatus.fileList[filePath].url, localPath, req, dlStatus);
            }

            ioEmit("download status: " + dlStatus.success + "/" + dlStatus.start);

            if (dlStatus.success === dlStatus.fileCount) {
                var timeElapsed = (Date.now() - dlStatus.timeStart) / 1000;
                ioEmit("download finished on: " + timeElapsed + "s");
            }
        });
    }

    ///////////////////////////
    function isIgnore(path, ignorePath, done) {
        var isIgnored = false;

        for (var i in ignorePath) {
            if (ignorePath.hasOwnProperty(i) && path.indexOf(ignorePath[i]) !== -1) {
                isIgnored = true;
            }
        }

        done(isIgnored);
    }

    ///////////////////////////
    function estimateTime(nbRequest) {
        var duration, time, returnTime;

        duration = nbRequest <= 200 ? lowEstimatedTimePerRequest : highEstimatedTimePerRequest;
        time = nbRequest * duration;
        returnTime = time >= 60000 ? parseInt((time / 1000) / 60) : parseInt(time / 1000);
        returnUnit = time >= 60000 ? "mn" : "s";

        return (returnTime + returnUnit);
    }

    function ioEmit(message) {
        if (socketIoConfig && socketIoConfig.io && socketIoConfig.key) {
            socketIoConfig.io.sockets.emit(socketIoConfig.key, {code: message});
        }
    }
}
