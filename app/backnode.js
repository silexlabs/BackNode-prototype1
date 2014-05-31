var BackNode = function(iframe) {
    this.file = null;
    this.iframe = iframe;
    this.document = iframe.contentDocument;
    // Allows sharing parent global instance (the current this)
    this.editor.parent = this;
    this.baliseSearch.parent = this;
    this.ckeditor = {};
    this.gitPath = null;
    this.fileSaved = [];
};

BackNode.prototype.explorer = {
    pick: function(callback, notHide){
        $('#dark-bgr').show();
        cloudExplorer.pick({}, function(data){
            $(window).resize();
            if(!notHide) {
                $('#dark-bgr').hide();
            }
            callback(data);
        });
    },

    save: function(callback){
        callback = callback || function(){};
        var iframe = $('iframe')[0].contentDocument;
        var serializer = new XMLSerializer();
        var content = serializer.serializeToString(iframe);
        cloudExplorer.write(backNode.file, content, callback);
    }
};

BackNode.prototype.git = {
    STATES : {
        CONNECT: "connect",
        INIT: "init",
        GO_DEPLOY: "deploy",
        DEPLOY: "deploy_ongoing",
        DOWNLOAD_FINISH: "download_finish",
        SCAN_FINISH: "scan_finish"
    },
    // retrieve ui from document node
    getUI: function() {
        this.git.ui = {
            container: $('.modal'),
            progressBar: $('#deployOnGoing .progress'),
            progressBarCurrent: $('#deployOnGoing .progress-bar'),
            btDeploy: $('#deployModalButton'),
            btCreate: $('#chooseProjectFolder button'),
            inputCreate: $('#chooseProjectFolder input'),
            boxCreate: $('#chooseProjectFolder'),
            boxDeploy: $('.modal-body #deployOnGoing'),
            textDeploy: $('#deployOnGoing textarea'),
            textManGit: $('.modal-body #deployOnGoing p'),
            textGitHubPageUrl: $('#deployOnGoing center'),
            textProgressBar: $('#deployOnGoing .progress span'),
            textUserProfile: $('#userProfile h4'),
            imageUserProfile: $('#userProfile img'),
            templateCB: "<div class='checkbox'><label><input type='checkbox' name='TO_REPLACE' checked> TO_REPLACE </label></div>"
        };
    },
    //search a .git folder on a dropbox folder
    search: function(path, deployButton) {
        //reset previous git directory path
        this.git.path = null;

        if (!this.git.ui) {
            this.git.getUI.bind(this)();
        }

        if (!this.git.deployButton) {
            this.git.deployButton = deployButton;
            this.git.deployButton.on("click", this.git.showDeployWindow.bind(this));
            this.git.ui.btDeploy.on("click", this.git.deploy.bind(this));
            this.git.ui.btCreate.on("click", this.git.createRepo.bind(this));
        }

        this.git.dropboxPath = path;

        $.get("/deploy/searchGit", {"path": this.git.dropboxPath}, function(response) {
            var d = JSON.parse(response);

            //init socket with deployKey
            this.git.deployKey = d.deployKey;
            if (!this.git.socket) {
                this.git.socket = io.connect("http://" + window.location.hostname);
            }
            this.git.socket.on(d.deployKey, this.git.getDeployStatus.bind(this));

            //check if user is connected
            this.git.getToken.bind(this, function(token) {
                // if we have a token and a git folder on the remote project, deploy
                if (d.git) {
                    this.git.path = d.git;
                    this.git.updateDeployButton.bind(this, this.git.STATES.GO_DEPLOY)();
                } else {
                // else init a git repo
                    this.git.updateDeployButton.bind(this, this.git.STATES.INIT)();
                }

                // if no git token, client as to connect
                if (!token) {
                    this.git.updateDeployButton.bind(this, this.git.STATES.CONNECT)();
                }

                this.git.deployButton.show();
            }.bind(this))();

            //get git app conf
            $.get("/conf/gitAppId.json", null, function(response) {
                if (response.client_id && response.client_secret && response.client_redirect) {
                    this.git.appId = response;
                } else {
                    window.console.warn("In order to use git plugin, you must fill your app info on file /app/conf/gitAppId.js");
                }
            }.bind(this));
        }.bind(this));
    },
    showDeployWindow: function() {
        if (this.git.state === this.git.STATES.CONNECT && !this.git.access_token) {
            window.open("https://github.com/login/oauth/authorize?redirect_uri=" + this.git.appId.client_redirect + "/gitOauth/" + this.git.deployKey + "/&scope=repo&client_id=" + this.git.appId.client_id + "&state=" + Date.now(),"_blank","width=1150,height=750");
            this.git.access_token = "pending";
        } else if (this.git.access_token === "pending") {
            this.git.getToken.bind(this)(this.git.showDeployWindow.bind(this));
        } else {
            this.git.ui.boxCreate.hide();
            this.git.ui.textDeploy.hide().html("");
            this.git.ui.boxDeploy.show();
            this.git.ui.btDeploy.show();
            this.git.ui.textManGit.show();
            this.git.ui.btDeploy.addClass('disabled');
            this.git.ui.textGitHubPageUrl.hide();
            this.git.ui.progressBar.show();
            this.git.ui.progressBarCurrent.get(0).className = "progress-bar";
            this.git.ui.progressBar.get(0).className = "progress progress-striped active";

            this.git.ui.container.modal('show');

            if (this.git.state === this.git.STATES.INIT) {
                this.git.ui.boxCreate.show();
                this.git.ui.progressBar.hide();
                this.git.ui.inputCreate.attr("value", this.git.dropboxPath);
            } else {
                $.get("/deploy/scanFolder", {"path": this.git.path, deployKey: this.git.deployKey}, function(){});
                this.git.state = this.git.STATES.DEPLOY;
            }
        }
    },
    deploy: function() {
        if (this.git.access_token) {
            this.git.ui.btDeploy.addClass('disabled');
            this.git.ui.textManGit.hide();
            $.get("/deploy/deployFolder", {path: this.git.path, deployKey: this.git.deployKey, initOnUrl: this.git.initOnUrl || "", accessToken: this.git.access_token});
            this.git.initOnUrl = ""; //if necessary, init is normally done
            this.git.state = this.git.STATES.DEPLOY;
        }
    },
    // Get the current deploying status from the server with socketIo
    getDeployStatus: function(data) {
        if (this.git.state === this.git.STATES.DOWNLOAD_FINISH) {
            //download is finish, git deploy on going
            this.git.ui.textDeploy.show();
            this.git.ui.textDeploy.append("\n");
            this.git.ui.textDeploy.append(data.code.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

            //git deploy is finish, update the .git folder on dropbox
            if (data.code === "update git project status on your dropbox folder...") {
                this.git.ui.textProgressBar.html(data.code);
                this.git.ui.textDeploy.hide();
                this.git.state = data.code;
            }
        } else if (data.code.indexOf("git connection success") === 0) {
            // if we have a git folder on the remote project, deploy state
            // else init a git repo
            this.git.updateDeployButton.bind(this, this.git.path ? this.git.STATES.GO_DEPLOY : this.git.STATES.INIT)();
        } else if (data.code.indexOf("http://") === 0) {
            //everything is finish, show the return url (GitHub Page or Heroku, etc..)
            this.git.ui.textGitHubPageUrl.show();
            this.git.ui.textGitHubPageUrl.html("<a href='" + data.code + "' target='_blank'>" + data.code + "</a>");
            this.git.ui.textProgressBar.append("   <i class='fa fa-check-square-o'></i>");
            this.git.ui.progressBarCurrent.get(0).className = "progress-bar progress-bar-success";
            this.git.ui.progressBar.get(0).className = "progress";
            this.git.updateDeployButton.bind(this, this.git.STATES.GO_DEPLOY)();
        } else if (data.code.indexOf("files found:") === 0) {
            //currently scanning the folder
            if (data.code.indexOf("files found: 1") === 0) {
                this.git.ui.textProgressBar.html("scanning your folder <i class='fa fa-refresh fa-spin'></i>");
            }
        } else if (data.code.indexOf("total files") === 0) {
            //scan is finish, user have to click for start deployment
            this.git.state = this.git.STATES.SCAN_FINISH;
            this.git.ui.btDeploy.removeClass('disabled');
            this.git.ui.textProgressBar.html("scan finished <i class='fa fa-check-square-o'></i>");
            this.git.ui.progressBar.get(0).className = "progress";
        } else if (data.code.indexOf("download status:") === 0) {
            //project download ongoing by the server before it try to deploy git
            var tabDl = data.code.replace("download status: ", "").split("/");
            var toWidth = Math.ceil(((parseInt(tabDl[0]) * 100) / parseInt(tabDl[1]))) + "%";
            this.git.ui.progressBarCurrent.css("width",  toWidth);
            this.git.ui.textProgressBar.html(toWidth);
        } else if (data.code.indexOf("download finished") === 0) {
            //download finished !
            this.git.state = this.git.STATES.DOWNLOAD_FINISH;
            this.git.ui.textProgressBar.html("deploy on going, please wait...");
            this.git.ui.progressBar.get(0).className = "progress progress-striped active";
        } else {
            //everything else
            this.git.ui.textProgressBar.html(data.code);
        }
    },
    createRepo : function() {
        $.get("/deploy/createRepo", {name: this.git.ui.inputCreate.attr("value"), accessToken: this.git.access_token}, function(response) {
            var d = JSON.parse(response);
            this.git.path = this.git.ui.inputCreate.attr("value");
            this.git.state = this.git.STATES.GO_DEPLOY;
            this.git.initOnUrl = d.repoUrl;
            this.git.showDeployWindow.bind(this)();
            this.git.deployButton.html(this.git.deployButton.html().replace("Init", "Deploy"));
        }.bind(this));
    },
    getToken: function(callback) {
        $.get("/gitOauth/none", null, function(response) {
            var d = JSON.parse(response);
            if (d.access_token) {
                this.git.access_token = d.access_token;

                if (!this.git.user_infos) {
                    $.get("/deploy/userInfos", {accessToken: d.access_token}, function(response) {
                        var o = JSON.parse(response);
                        if (o.data) {
                            this.git.user_infos = o.data;
                            this.git.updateProfile.bind(this, o.data.avatar_url, o.data.login || o.data.name)();
                        }
                    }.bind(this));
                }
            }
            if (callback) {
                callback(d.access_token);
            }
        }.bind(this));
    },
    updateProfile: function(avatar, userName) {
        this.git.ui.imageUserProfile.attr("src", avatar || "http://i2.wp.com/assets-cdn.github.com/images/gravatars/gravatar-user-420.png");
        this.git.ui.textUserProfile.html(userName || "Login");
    },
    updateDeployButton: function(state) {
        this.git.state = state;
        this.git.deployButton.html(this.git.deployButton.html().replace(/init|deploy|connect/gi, state));
    }
};

BackNode.prototype.editor = {
    /*This method allow the user to modify the "data-bn" elements if flagEditable is true. It do the contrary if flagEditable is false */
    editable: function(listEditableContent, flagEditable) {
        var parent = this.parent;
        var iframeDocument = parent.document;
        var iframeWindow = parent.iframe.contentWindow;

        if (flagEditable === true) {
            for (var key in listEditableContent) {

                switch(listEditableContent[key].tagName) {
                    /*listener on picture click*/
                    case "IMG":
                        $(listEditableContent[key]).click(parent.editor.editPicture.bind(this, $(listEditableContent[key])));
                    break;

                    default:
                        if($(listEditableContent[key]).length > 0) {
                            //active editable element
                            $(listEditableContent[key]).attr('contenteditable', 'true');
                        }
                    break;
                }

                //add class hover editable for border color and cursor pointer when mouse over an editable element
                $(listEditableContent[key]).addClass("hoverEditable");
            }

            //add style node on iframe for css effect hover
            if (!parent.ckeditor.css) {
                parent.ckeditor.css = $('<style>.hoverEditable:hover { outline: 1px dashed #7DBEFF; cursor: pointer}</style>');
                $(iframeDocument.head).append(parent.ckeditor.css);
            }

            //active ckeditor on all content editable
            iframeWindow.CKEDITOR.inlineAll();
        } else {
        /*This function disallow the edition of elements*/

            /*remove the picture popin if needed*/
            $(parent.document).find('#bn-popinPicture').remove();

            for (var keyb in listEditableContent) {
                if(listEditableContent[keyb].tagName === "IMG") {
                    $(listEditableContent[keyb]).unbind("click");
                }  else {
                    $(listEditableContent[keyb]).removeAttr('contenteditable');
                }

                //remove class hover editable for border color and cursor pointer when mouse over an editable element
                $(listEditableContent[keyb]).removeClass("hoverEditable");
            }

            //remove style node on iframe for css effect hover
            if (parent.ckeditor.css) {
                parent.ckeditor.css.remove();
                parent.ckeditor.css = null;
            }

            //destroy CKEDITOR instance
            for (var editor in iframeWindow.CKEDITOR.instances) {
                if (iframeWindow.CKEDITOR.instances.hasOwnProperty(editor)) {
                    iframeWindow.CKEDITOR.instances[editor].destroy();
                }
            }

            //clean ckeditor empty style node ...
            var s = parent.document.head.getElementsByTagName("style");
            for(var i in s) {
                if (s.hasOwnProperty(i) && s[i].innerHTML === "") {
                    parent.document.head.removeChild(s[i]);
                }
            }
        }
    },

    //add ckeditor script in the iframe loaded
    addCkeditor: function(iframeDocument) {
        var script = iframeDocument.createElement("script");
        script.src = "/app/ckeditor/ckeditor.js";
        iframeDocument.body.appendChild(script);
    },

    //clean all the ckeditor script and misc before saving the document
    cleanCkeditor: function(iframeDocument) {
        this.cleanRessource(iframeDocument, "script", ["app/ckeditor/config.js", "app/ckeditor/lang/", "app/ckeditor/styles.js", "app/ckeditor/ckeditor.js"]);
        this.cleanRessource(iframeDocument, "link", ["app/ckeditor/skins/moono/editor.css"]);
        this.cleanRessource(iframeDocument, "style", [".cke{visibility:hidden;}"]);
        iframeDocument.getElementsByTagName('html')[0].className = iframeDocument.getElementsByTagName('html')[0].className.replace(" js canvas canvastext no-touch rgba backgroundsize borderimage borderradius boxshadow textshadow opacity cssanimations cssgradients csstransforms csstransforms3d csstransitions fontface", "");
    },

    //utils to help cleaning different kind of node
    cleanRessource: function(iframeDocument, type, tabToRemove) {
        var nodeArray = [];
        for (var i in iframeDocument.getElementsByTagName(type)) {
            nodeArray.push(iframeDocument.getElementsByTagName(type)[i]);
        }
        var l = nodeArray.length;
        for (var node = 0; node <= l; node++) {
            if (nodeArray[node] && nodeArray[node].tagName) {
                var content = nodeArray[node].src || nodeArray[node].href || nodeArray[node].innerHTML;
                for (var index in tabToRemove) {
                    if (tabToRemove.hasOwnProperty(index) && content.indexOf(tabToRemove[index]) !== -1) {
                        nodeArray[node].parentNode.removeChild(nodeArray[node]);
                    }
                }
            }
        }
    },

    /* This method allow the user to modify a picture ( alt and src attribute ) */
    editPicture: function(picture) {/*need to be modified, doesn't active now, that's so dirty */
        var iframe = $(this.parent.document);
        var popinpicture = '<div id="bn-popinPicture" style="display:none;position:fixed;z-index:10200;width:100%;height:100%;top:0;left:0;background:#000;background:rgba(0,0,0,0.8)"></div>';
        var alt = picture.attr('alt');

        backNode.editingPicture = picture;

        if(alt === undefined) {
            alt = "";
        }

        var contentPopinpicture = '<div name="bn-picForm" style="border-radius:3px;-moz-border-radius:3px;-webkit-border-radius:3px;box-shadow:2px 2px 1px #000;width:410px;height:200px;text-align:center;background:#eee;position:absolute;left:50%;top:50%;margin:-100px 0 0 -205px;color:#000000;"><div style="padding:5px;margin-top:10px;margin-bottom:10px;color:#000;display:block;text-align:center"><img src="'+ window.document.URL +'img/import-title.png" alt="Import your file" style="width:50%;" /><span style="cursor:pointer;position:absolute;top:-15px;right:-15px;"><img src="'+ window.document.URL +'img/close-pic.png" alt="X" /></span></div><div style="height:35px;overflow:hidden;line-height:35px;margin-left:10px;"><label for="bn-picSrc" style="height:100%;float:left;margin-right:10px;">Src attribute</label><input id="bn-picSrc" type="text" name="picSrc" placeholder="Url" value="'+ picture.attr('src') +'" style="border:1px solid #ccc;padding-left:5px;box-sizing:border-box;height:100%;float:left;margin-right:0;border-radius:3px 0 0 3px;" /><img id="bn-picUpload" src="'+ window.document.URL +'img/import-btn.png" alt="Import a file" style="height:100%;float:left;" /></div><div style="height:35px;overflow:hidden;line-height:35px;margin:10px 0 0 10px;"><label for="bn-picAlt" style="height:100%;float:left;margin-right:10px;">Alt attribute</label><input id="bn-picAlt" type="text" name="picAlt" placeholder="Alternative text" value="'+ alt +'" style="border:1px solid #ccc;width:290px;padding-left:5px;box-sizing:border-box;border-radius:3px;height:100%;float:left;margin-left:2px;" /></div><button id="bn-valid" style="border:0;background:#38b396;margin-top:10px;width:90%;text-align:center;font-weight:bold;color:#fff;text-transform:capitalize;border-radius:3px;line-height:35px;">Save</button></div>';
        iframe.find("body").append(popinpicture);
        iframe.find('#bn-popinPicture').append(contentPopinpicture);
        iframe.find('#bn-popinPicture').slideDown(400, function() {
            iframe.find('#bn-popinPicture div #bn-valid').click(function(e) {
                e.preventDefault();
                picture.attr('src', iframe.find('#bn-picSrc').val());
                picture.attr('alt', iframe.find('#bn-picAlt').val());
                iframe.find('#bn-popinPicture').slideUp(400,function(){
                    iframe.find('#bn-popinPicture').remove();
                });
            });

            iframe.find('#bn-popinPicture div div span').click(function(){
                iframe.find('#bn-popinPicture').slideUp(400,function(){
                    iframe.find('#bn-popinPicture').remove();
                });
            });
        });
    }
};

BackNode.prototype.baliseSearch = {
    getList: function(iframeDocument) {
        var list = [];
        list = list
        .concat(this.getListForSelector(iframeDocument, '[data-bn="text"]', '[data-bn="image"]', '[data-bn="template"]', '[data-bn="repeat"]'))
        .concat(this.getListForSelector(iframeDocument, '.backnode-text', '.backnode-image', '.backnode-template', '.backnode-repeat'));

        return list;
    },
    getListForSelector: function(iframeDocument, bnTexts, bnImages, bnTemplates, bnRepeats) {
        var list = [];
        $(iframeDocument).find(bnImages + ', ' + bnTexts + ', ' + bnTemplates + ', ' + bnRepeats).each(function() {

            if($(this).parents(bnTemplates + ', ' + bnRepeats).size() > 0) {
                console.warn('getListForSelector this has a parent which is a template', this);
                return;
            } else if($(this).is(bnTemplates)) {
                var subTemplate = {
                    type: 'template',
                    DOM: this,
                    repeats: []
                };
                $(this).find(bnRepeats).each(function() {
                    var subRepeat = {
                        type: 'repeat',
                        DOM: this,
                        edit: []
                    };
                    $(this).find(bnTexts).each(function() {
                        subRepeat.edit.push(this);
                    });
                    subTemplate.repeats.push(subRepeat);
                });
                list.push(subTemplate);
            } else if($(this).is(bnImages)) {
                list.push($(this).get(0));
            } else {
                list.push(this);
            }
        });

        return list;
    }
};
