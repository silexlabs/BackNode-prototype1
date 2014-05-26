var router = require('unifile/lib/core/router.js'),
unigrab = require('./unigrab.js'),
https = require('https'),
cp = require('child_process'),
querystring = require('querystring');

// grab the .git folder on the remotePath given
exports.grabGit = function(service, localPath, remotePath, req, socketIoConfig, done) {
    unigrab.scanPath(service, localPath, remotePath + "/.git", null, req, socketIoConfig, function(pathInfos) {
        unigrab.ioEmit(socketIoConfig, "total files git: " + pathInfos.fileCount);
        unigrab.grabFolder(service, localPath, pathInfos, req, socketIoConfig, function(message) {
            done(message);
        });
    });
}

// scan the .gitignore on remotePath and return a ignored path array
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

// search for a .git directory on the remote path given and his parent
exports.find = function(service, remotePath, req, done) {
    var gitPath = null;

    var treeIndex = remotePath.split("/");
        treeIndex.pop(); // delete first blank entry

    inspectPath(treeIndex);

    function inspectPath(currentTab) {
        var current = (currentTab.length >= 1) ? currentTab.join("/") : "";

        router.route(service, ["exec", "ls", current], req, null, null, function(response, status, reply) {
            if (status.success) {
                isGitDirectory(reply, function(isGit) {
                    if (isGit) {
                        gitPath = current;
                        done(gitPath);
                    } else if (treeIndex.length > 0) {
                        currentTab.pop();
                        inspectPath(currentTab);
                    } else if (treeIndex.length === 0 && gitPath === null) {
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

// get user access token and put it in a cookie (see https://developer.github.com/v3/oauth/)
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
                    res.write("<script>window.close()</script>");
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
            returnValue = req.signedCookies.git_access_token;
        }

        res.write(JSON.stringify({access_token: returnValue}));
        res.send();
    }
}

// deploy remote git folder's modifications on github branch master and gh-pages
exports.deployOnGHPages = function(localPath, accessToken, initOnRepoUrl, req, socketIoConfig, done) {
    if (initOnRepoUrl !== "" && accessToken) {
        // git init on folder to create the .git folder. then, add the remote url and start deploy again
        exports.exec(localPath, "git init", function(error, stdout, stderr) {
            if (!error) {
                exports.exec(localPath, "git remote add origin " + initOnRepoUrl, function(error, stdout, stderr) {
                    if (!error) {
                        exports.deployOnGHPages(localPath, "", req, socketIoConfig, done);
                    } else {
                        console.log(error);
                    }
                });
            } else {
                console.log(error);
            }
        });
    } else if (accessToken) {
        // start to deploy
        exports.checkIfBranchIsMaster(localPath, function(isOnMaster, stdout) {
            if (isOnMaster) {
                console.log("### isOnMaster");
                exports.commitWithDate(localPath, function(commitIsDone, stdout) {
                    unigrab.ioEmit(socketIoConfig, stdout);

                    if (commitIsDone) {
                        console.log("### commitIsDone");
                        exports.pushToMasterAndGHPages(localPath, accessToken, req, function(deployDone, stdout) {
                            unigrab.ioEmit(socketIoConfig, stdout);
                            if (deployDone) {
                                done(true);
                            } else {
                                unigrab.ioEmit(socketIoConfig, "deploy error");
                                done(false);
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
        // no connection on git, we must have the git access token before everything
        unigrab.ioEmit(socketIoConfig, "git not logged in");
    }
}

// check if the local folder are on branch master
exports.checkIfBranchIsMaster = function(localPath, done) {
    exports.exec(localPath, "git status", function(error, stdout, stderr) {
        if (stdout.indexOf("On branch master") === 0) {
            done(true, stdout);
        } else {
            done(false, stdout);
        }
    });
}

// create the commit
exports.commitWithDate = function(localPath, done) {
    exports.exec(localPath, "git add . --all", function(error, stdout, stderr) {
        if (!error) {
            exports.exec(localPath, "git commit -m 'BackNode deploy " + new Date() + "'", function(error, stdout, stderr) {
                if (!error) {
                    done(true, stdout);
                } else {
                    done(false, stdout);
                }
            });
        } else {
            done(false, "no changes to deploy");
        }
    });
}

// return the remote url (like origin or heroku)
exports.getRemoteUrl = function(remote, localPath, done) {
    exports.exec(localPath, "git config --local --get remote." + remote + ".url", done);
}

// return github page url
exports.getGitHubPageUrl = function(localPath, done) {
    exports.getRemoteUrl("origin", localPath, function(error, stdout, stderr) {
        if (!error) {
            var tab = stdout.split("/");
            var repoName = tab.pop().replace(".git", "");
            var accountName = tab.pop().toLowerCase();

            done(error, "http://" + accountName + ".github.io/" + repoName);
        } else {
            done(error, null);
        }
    });
}

// exec a bash command and log it
exports.exec = function(localPath, command, done) {
    cp.exec("cd " + localPath + " && " + command, function(error, stdout, stderr) {
        console.log("#########################");
        console.log("Exec command: ", command);
        console.log("Exec path: ", localPath);
        if (stdout && stdout !== "") {
            console.log("Exec stdout: ", stdout);
        }
        if (stderr && stderr !== "") {
            console.log("Exec stderr: ", stderr);
        }
        done(error, stdout, stderr);
    });
}

// push the commit to master and reset gh-pages with master
exports.pushToMasterAndGHPages = function(localPath, accessToken, req, done) {
    var gitRemoteUrl;

    exports.getRemoteUrl("origin", localPath, function(error, stdout, stderr) {
        if (!error) {
            gitRemoteUrl = stdout.replace("https://", "https://" + accessToken + "@");

            exports.exec(localPath, "git push " + gitRemoteUrl, function(error, stdout, stderr) {
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
        } else {
            done(false, stdout);
        }
    })

    function switchToGHPagesBranche(switchDone) {
        exports.exec(localPath, "git fetch origin && git checkout -b gh-pages", function(error, stdout, stderr) {
            if (error) {
                exports.exec(localPath, "git checkout gh-pages", function(error, stdout2, stderr) {
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
        exports.exec(localPath, "git reset --hard origin/master", function(error, stdout, stderr) {
            if (!error) {
                exports.exec(localPath, "git push " + gitRemoteUrl, function(error, stdout2, stderr) {
                    if (!error) {
                        exports.exec(localPath, "git checkout master", function(error, stdout3, stderr) {
                            pushDone(true, stdout + stdout2);
                        });
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

exports.createRepo = function(repoName, accessToken, done) {
    var dataObject = "", options = {
      headers: {"User-Agent": "BackNode", "Authorization": "token " + accessToken},
      hostname: 'api.github.com',
      port: 443,
      path: "/user/repos",
      method: 'POST'
    };

    var r = https.request(options, function(res) {
        res.on('data', function (chunk) {
            dataObject += chunk.toString();
        });

        res.on('end', function() {
            dataObject = JSON.parse(dataObject);
            if (dataObject.clone_url) {
                done(dataObject.clone_url);
            } else {
                done("");
            }
        });
    });

    r.on('error', function(error) {
        console.log(error);
        done("");
    });

    r.write(JSON.stringify({name: repoName.replace("/", "")}));
    r.end();
}
