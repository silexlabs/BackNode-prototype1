var cookieSession = require('cookie-session'),
cookieParser = require('cookie-parser'),
querystring = require('querystring'),
bodyParser = require('body-parser'),
gitAppId = require('../conf/gitAppId.json'),
unigrab = require('./unigrab.js'),
uniput = require('./uniput.js'),
router = require('unifile/lib/core/router.js')
https = require('https'),
cp = require('child_process');

var pathFileInfo = {};

/*
 * @method middleware use unigit as a middleware like unifile
 *
 */
exports.middleware = function(app, socketIo) {
    //git oauth
    app.use('/gitOauth/', cookieParser('backNodeGit'));
    app.use('/gitOauth/', cookieSession({ secret: 'backNodeGit'}));
    app.get('/gitOauth/:deployKey', function(req, res) {
        exports.oauth(req, res, socketIo);
    });

    //to use unifile as an api
    app.use('/deploy', bodyParser());
    app.use('/deploy', cookieParser());
    app.use('/deploy', cookieSession({ secret: 'plum plum plum'}));

    //dispatch
    app.get('/deploy/:type', function(req, res) {
        exports.routeur(req, res, socketIo);
    });

    return function(req, res, next) { next(); };
}

exports.routeur = function(req, res, socketIo) {
    var socketIoConfig = {io:socketIo, key:req.param('deployKey')};
    var localPath = "tempFolder/" + req.param('deployKey');

    switch (req.param('type')) {

        case 'userInfos':
            exports.getUserInfos(req.param('accessToken'), function(error, data) {
                res.write(JSON.stringify({data: data}));
                res.send();
            });
        break;

        case 'searchGit':
            var rd = Date.now() * (Math.random() * 10000);
            var deployKey = rd.toString().replace(".", "");
            socketIoConfig.key = deployKey;

            exports.find(req.param('service'), req.param('path'), req, function(isGit) {
                res.write(JSON.stringify({git: isGit, deployKey: deployKey}));
                res.send();
            });
        break;

        case 'scanFolder':
            exports.scanGitIgnore(req.param('service'), req.param('path'), req, function(ignorePath) {
                unigrab.scanPath(req.param('service'), localPath, req.param('path'), ignorePath, req, socketIoConfig, function(pathInfos) {
                    unigrab.ioEmit(socketIoConfig, "total files: " + pathInfos.fileCount + " estimate duration: " + unigrab.estimateTime(pathInfos.fileCount));
                    pathFileInfo[req.param('deployKey')] = pathInfos;
                });
            });
            res.send();
        break;

        case 'createRepo':
            exports.createRemoteRepo(req.param('name'), req.param('accessToken'), function(repoUrl) {
                res.write(JSON.stringify({repoUrl: repoUrl}));
                res.send();
            });
        break;

        case 'deployFolder' :
            // grab a folder (not just .git)
            unigrab.grabFolder(req.param('service'), localPath, pathFileInfo[req.param('deployKey')], req, socketIoConfig, function(message) {
                exports.deployOnGHPages(localPath + "/" + req.param('path'), req.param('accessToken'), req.param('initOnUrl'), req, socketIoConfig, function(done) {
                    if (done) {
                        var gitFolder = req.param('path') + "/.git";
                        unigrab.ioEmit(socketIoConfig, "update git project status on your dropbox folder...");
                        // when deploy is finish on gitHub, we must update the .git folder on dropbox, because we do the commit on backnode local machine, so the dropbox project don't know about commit
                        uniput.putFolder(req.param('service'), localPath, gitFolder, req, function(error) {
                            if (!error) {
                                unigrab.ioEmit(socketIoConfig, "git updated, deploy ok");
                                exports.getGitHubPageUrl(localPath + "/" + req.param('path'), function(error, stdout) {
                                    exports.deleteLocalPath(localPath);
                                    if (!error) {
                                        unigrab.ioEmit(socketIoConfig, stdout);
                                    }
                                });
                            } else {
                                unigrab.ioEmit(socketIoConfig, "git not updated, deploy error");
                                exports.deleteLocalPath(localPath);
                            }
                        });
                    } else {
                        exports.deleteLocalPath(localPath);
                    }
                });
            });
            res.send();
        break;
    }
}

/*
 * @method scanGitIgnore scan the .gitignore on remotePath and return a ignored path array
 *
 */
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

/*
 * @method find search for a .git directory on the remote path given and his parent
 *
 */
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

/*
 * @method oauth get user access token and put it in a cookie (see https://developer.github.com/v3/oauth/)
 *
 */
exports.oauth = function(req, res, socketIo) {
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
                    unigrab.ioEmit({io:socketIo, key:req.param('deployKey')}, "git connection success");
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

        gitResponse.write('client_id=' + gitAppId.client_id + '&client_secret=' + gitAppId.client_secret + '&code=' + req.param('code'));
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

/*
 * @method deployOnGHPages deploy remote git folder's modifications on github branch master and gh-pages
 *
 */
exports.deployOnGHPages = function(localPath, accessToken, initOnRepoUrl, req, socketIoConfig, done) {
    if (initOnRepoUrl !== "" && accessToken) {
        // git init on folder to create the .git folder. then, add the remote url and start deploy again
        exports.exec(localPath, "git init", function(error, stdout, stderr) {
            if (!error) {
                exports.exec(localPath, "git remote add origin " + initOnRepoUrl, function(error, stdout, stderr) {
                    if (!error) {
                        exports.deployOnGHPages(localPath, accessToken, "", req, socketIoConfig, done);
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
                exports.commitWithDate(localPath, function(commitIsDone, stdout) {
                    unigrab.ioEmit(socketIoConfig, stdout);

                    if (commitIsDone) {
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
                        done(false);
                    }
                });

            } else {
                unigrab.ioEmit(socketIoConfig, "your git folder are not on master branch");
                done(false);
            }
        });
    } else {
        // no connection on git, we must have the git access token before everything
        unigrab.ioEmit(socketIoConfig, "git not logged in");
        done(false);
    }
}

/*
 * @method checkIfBranchIsMaster check if the local folder are on branch master
 *
 */
exports.checkIfBranchIsMaster = function(localPath, done) {
    exports.exec(localPath, "git status", function(error, stdout, stderr) {
        if (stdout.indexOf("On branch master") !== -1) {
            done(true, stdout);
        } else {
            done(false, stdout);
        }
    });
}

/*
 * @method commitWithDate create the commit
 *
 */
exports.commitWithDate = function(localPath, done) {
    var author = "BackNode <backnode.silex@gmail.com>";
    exports.exec(localPath, "git add . --all", function(error, stdout, stderr) {
        if (!error) {
            exports.exec(localPath, "git commit -m 'BackNode deploy " + new Date() + "' --author='" + author + "'", function(error, stdout, stderr) {
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

/*
 * @method getRemoteUrl return the remote url (like origin or heroku)
 *
 */
exports.getRemoteUrl = function(remote, localPath, done) {
    exports.exec(localPath, "git config --local --get remote." + remote + ".url", done);
}

/*
 * @method getGitHubPageUrl return github page url
 *
 */
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

/*
 * @method pushToMasterAndGHPages push the commit to master and reset gh-pages with master
 *
 */
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

/*
 * @method createRemoteRepo create a remote repo on git with github webapi
 *
 */
exports.createRemoteRepo = function(repoName, accessToken, done) {
    repoName = repoName.replace("/", "");
    exports.gitHubApiRequest(accessToken, "POST", "/user/repos", {name: repoName}, function(error, data) {
        if (!error && data.clone_url) {
            done(data.clone_url);
        } else {
            //repo already exist, construct repo url
            exports.getUserInfos(accessToken, function(error, data) {
                if (!error) {
                    done("https://github.com/" + data.login + "/" + repoName + ".git");
                } else {
                    done("");
                }
            });
        }
    });
}

/*
 * @method getUserInfos retrieve user informations from github api
 *
 */
exports.getUserInfos = function(accessToken, done) {
    exports.gitHubApiRequest(accessToken, "GET", "/user", null, done);
}

/*
 * @method deleteLocalPath delete folder at the given path
 *
 */
exports.deleteLocalPath = function(localPath, done) {
    exports.exec(".", "rm -rf " + localPath, done || function(){});
}

/*
 * @method exec execute a bash command and log it
 *
 */
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

/*
 * @method gitHubApiRequest create https request for github api
 *
 */
exports.gitHubApiRequest = function(accessToken, method, path, params, done) {
    var dataObject = "", options = {
      headers: {"User-Agent": "BackNode", "Authorization": "token " + accessToken},
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: method
    };

    var r = https.request(options, function(res) {
        res.on('data', function (chunk) {
            dataObject += chunk.toString();
        });

        res.on('end', function() {
            dataObject = JSON.parse(dataObject);
            done(null, dataObject);
        });
    });

    r.on('error', function(error) {
        console.log(error);
        done(error, null);
    });

    if (params) {
        r.write(JSON.stringify(params));
    }

    r.end();
}
