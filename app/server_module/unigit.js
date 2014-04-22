var router = require('unifile/lib/core/router.js'),
unigrab = require('./unigrab.js'),
https = require('https'),
cp = require('child_process'),
querystring = require('querystring');

var git_access_token;

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

exports.oauth = function(req, res) {
    if (req.param('code')) {
        var access_token, dataObject, options = {
          hostname: 'github.com',
          port: 443,
          path: '/login/oauth/access_token',
          method: 'POST'
        };

        var gitResponse = https.request(options, function(resG) {
            resG.on('data', function (chunk) {
                dataObject = querystring.parse(chunk.toString());
                if (dataObject.access_token) {
                    access_token = dataObject.access_token;
                    res.cookie('git_access_token', access_token, {signed: true});
                    res.send();
                }
            });
        });

        gitResponse.on('error', function(error) {
            console.log(error);
        });

        gitResponse.write('client_id=79b7bd5afe5787355123&client_secret=4d52c270bb7e45f228328169d281e42c282d4756&code=' + req.param('code'));
        gitResponse.end();
    } else {
        var returnValue = false;

        if (req.signedCookies.git_access_token) {
            returnValue = git_access_token = req.signedCookies.git_access_token;
        }

        res.write(JSON.stringify({access_token: returnValue}));
        res.send();
    }
}

exports.deployOnGHPages = function(localPath, socketIoConfig) {
    if (git_access_token) {
        exports.checkIfBranchIsMaster(localPath, function(isOnMaster, stdout) {
            if (isOnMaster) {
                console.log("### isOnMaster");
                exports.commitWithDate(localPath, function(commitIsDone, stdout) {
                    unigrab.ioEmit(socketIoConfig, stdout);

                    if (commitIsDone) {
                        console.log("### commitIsDone");
                        exports.pushToMasterAndGHPages(localPath, function(deployDone, stdout) {
                            unigrab.ioEmit(socketIoConfig, stdout);

                            if (deployDone) {
                                unigrab.ioEmit(socketIoConfig, "deploy finished");
                            } else {
                                unigrab.ioEmit(socketIoConfig, "deploy error");
                            }
                        });
                    } else {
                        console.log("### " + stdout);
                    }
                });

            } else {
                unigrab.ioEmit(socketIoConfig, "your git folder are not on master branch");
            }
        });
    } else {
        unigrab.ioEmit(socketIoConfig, "git not logged in");
    }
}

exports.checkIfBranchIsMaster = function(localPath, done) {
    cp.exec("cd " + localPath + " && git status", function(error, stdout, stderr) {
        if (stdout.indexOf("On branch master") === 0) {
            done(true, stdout);
        } else {
            done(false, stdout);
        }
    });
}

exports.commitWithDate = function(localPath, done) {
    cp.exec("cd " + localPath + " && git stash && git pull --rebase && git stash pop && git add . --all", function(error, stdout, stderr) {
        if (!error) {
            cp.exec("cd " + localPath + " && git commit -m 'BackNode deploy " + new Date() + "'", function(error, stdout2, stderr) {
                if (!error) {
                    done(true, stdout + stdout2);
                } else {
                    done(false, "no changes to deploy");
                }
            });
        } else {
            done(false, error);
        }
    });
}

exports.pushToMasterAndGHPages = function(localPath, done) {
    cp.exec("cd " + localPath + " && git pull --rebase && git push", function(error, stdout, stderr) {
        if (!error) {
            switchToGHPagesBranche(function(switchDone, stdout2) {
                if (switchDone) {
                    resetAndPush(function(pushDone, stdout3) {
                        if (pushDone) {
                            done(true, stdout + stdout2 + stdout3);
                        } else {
                            done(false, stdout + stdout2 + stdout3);
                        }
                    });
                } else {
                    done(false, stdout + stdout2);
                }
            });
        } else {
            done(false, stdout);
        }
    });

    function switchToGHPagesBranche(switchDone) {
        cp.exec("cd " + localPath + " && git checkout -b gh-pages", function(error, stdout, stderr) {
            if (error) {
                cp.exec("cd " + localPath + " && git checkout gh-pages", function(error, stdout2, stderr) {
                    if (!error) {
                        switchDone(true, stdout + stdout2);
                    } else {
                        switchDone(false, error);
                    }
                });
            } else {
                switchDone(true, error);
            }
        });
    }

    function resetAndPush(pushDone) {
        cp.exec("cd " + localPath + " && git reset --hard origin/master", function(error, stdout, stderr) {
            if (!error) {
                cp.exec("cd " + localPath + " && git push -uf origin gh-pages", function(error, stdout2, stderr) {
                    if (!error) {
                        pushDone(true, stdout + stdout2);
                    } else {
                        pushDone(false, error);
                    }
                });
            } else {
                pushDone(false, error)
            }
        });
    }
}
