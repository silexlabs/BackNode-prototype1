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
        cloudExplorer.write(backNode.file, content, function() {
            if (this.fileSaved.indexOf(this.iframe.src) === -1) {
                this.fileSaved.push(this.iframe.src.replace("http://" + window.location.host + "/api/v1.0/dropbox/exec/get/", ""));
            }
            callback();
        }.bind(this));
    }
};

BackNode.prototype.git = {
    //search a .git folder on a dropbox folder
    search: function(path, deployButton) {
        //reset previous git directory path
        this.git.path = null;

        if (!this.git.deployButton) {
            this.git.deployButton = deployButton;
            this.git.deployButton.on("click", this.git.showDeployWindow.bind(this));
            $('#deployModalButton').on("click", this.git.deploy.bind(this));
            $('#deployGitModalButton').on("click", this.git.showDeploySaved.bind(this));
            $('#chooseProjectFolder button').on("click", function(){
                $.get("/deploy/create", {name: $('#chooseProjectFolder input').attr("value")}, function(response) {
                    var d = JSON.parse(response);
                    this.git.path = $('#chooseProjectFolder input').attr("value");
                    this.git.state = "Deploy";
                    this.git.initOnUrl = d.repoUrl;
                    this.git.showDeployWindow.bind(this)();
                    this.git.deployButton.html(this.git.deployButton.html().replace("Init", "Deploy"));
                }.bind(this));
            }.bind(this));
        }

        this.git.dropboxPath = path;

        $.get("/deploy/searchGit", {"path": this.git.dropboxPath}, function(response) {
            var d = JSON.parse(response);

            if (d.git) {
                this.git.path = d.git;
                this.git.state = "Deploy";
                this.git.deployButton.html(this.git.deployButton.html().replace("Init", this.git.state));
            } else {
                this.git.state = "Init";
                this.git.deployButton.html(this.git.deployButton.html().replace("Deploy", this.git.state));
            }

            this.git.deployButton.show();
            this.git.getToken.bind(this)();
        }.bind(this));
    },
    showDeployWindow: function() {
        if (!this.git.access_token) {
            window.open("https://github.com/login/oauth/authorize?redirect_uri=http://localhost:8080/gitOauth/&scope=repo&client_id=79b7bd5afe5787355123&state=" + Date.now(),"_blank","width=1150,height=750");
            this.git.access_token = "pending";
        } else if (this.git.access_token === "pending") {
            this.git.getToken.bind(this)(this.git.showDeployWindow.bind(this));
        } else {
            $('.modal-body #chooseFiles').hide();
            $('#chooseProjectFolder').hide();
            $('#deployOnGoing textarea').hide().html("");
            $('.modal-body #deployOnGoing').show();
            $('#deployModalButton').show();
            $('.modal-body #deployOnGoing p').show();
            $('#deployGitModalButton').removeClass('disabled');
            $('#deployModalButton').addClass('disabled');
            $('#deployOnGoing center').hide();
            $('#deployOnGoing .progress').show();

            $('.modal').modal('show');

            if (this.git.state === "Init") {
                $('#chooseProjectFolder').show();
                $('#deployOnGoing .progress').hide();
                $('#chooseProjectFolder input').attr("value", this.git.dropboxPath);
            } else {
                $.get("/deploy/scan", {"path": this.git.path}, function(response) {
                    this.git.deployKey = JSON.parse(response).deployKey;
                    if (!this.git.socket) {
                        this.git.socket = io.connect("http://" + window.location.hostname);
                    }
                    this.git.socket.on(this.git.deployKey, this.git.getDeployStatus.bind(this));
                }.bind(this));

                this.git.state = "homeDeploy";
            }
        }
    },
    showDeploySaved: function() {
        if ($('.modal-body #chooseFiles').html() !== "") {
            $('.modal-body #chooseFiles').html("");
            $('.modal-body #deployOnGoing p').hide();
            $('.modal-body #deployOnGoing').show();
            this.git.deployJustGit.bind(this)();
        } else {
            var templateCB = "<div class='checkbox'><label><input type='checkbox' name='TO_REPLACE' checked> TO_REPLACE </label></div>";
            $('.modal-body #chooseFiles').show();
            $('.modal-body #deployOnGoing').hide();
            $('#deployModalButton').hide();
            $('.modal-title').html("Please select some files to deploy");
            $('#deployGitModalButton').addClass('disabled');

            if (this.fileSaved.length > 0) {
                for (var i in this.fileSaved) {
                    if (this.fileSaved.hasOwnProperty(i)) {
                        $('.modal-body #chooseFiles').append(templateCB.replace(/TO_REPLACE/g, this.fileSaved[i]));
                    }
                }
                $('#deployGitModalButton').removeClass('disabled');
            } else {
                $('.modal-body #chooseFiles').append("You haven't save any files, so nothing to deploy...");
                $('#deployGitModalButton').addClass('disabled');
            }
        }
    },
    deploy: function() {
        if (this.git.access_token) {
            $('#deployModalButton').addClass('disabled');
            $('#deployGitModalButton').addClass('disabled');
            $('.modal-body #deployOnGoing p').hide();
            $.get("/deploy/all", {"path": this.git.path, "deployKey": this.git.deployKey, "initOnUrl": this.git.initOnUrl || ""});
            this.git.initOnUrl = ""; //if necessary, init is normally done
            this.git.state = "deployStarted";
        }
    },
    deployJustGit: function() {
        var fileToDeploy = [];
        var _this = this;

        $('.modal-body #chooseFiles input').each(function() {
            if (this.checked) {
                _this.fileSaved.splice(_this.fileSaved.indexOf(this.name), 1); //delete the entry to deploy off the fileSaved table (use to know how file can be deploy)
                fileToDeploy.push(this.name);
            }
        });

        $('#deployModalButton').addClass('disabled');
        $('#deployGitModalButton').addClass('disabled');

        //TODO must be finished (grab the saved file too)
        $.get("/deploy/git", {"path": this.git.path, "deployKey": this.git.deployKey, "files": fileToDeploy});
    },
    getDeployStatus: function(data) {

        if (this.git.state === "downloadFinish") {
            $('#deployOnGoing textarea').show();
            $('#deployOnGoing textarea').append("\n");
            $('#deployOnGoing textarea').append(data.code.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

            if (data.code === "update git project status on your dropbox folder...") {
                $('#deployOnGoing .progress span').html(data.code);
                $('#deployOnGoing textarea').hide();
                this.git.state = data.code;
            }
        } else if (data.code.indexOf("http://") === 0) {
            $('#deployOnGoing center').show();
            $('#deployOnGoing center').html("<a href='" + data.code + "' target='_blank'>" + data.code + "</a>");
            $('#deployOnGoing .progress span').append("   <i class='fa fa-check-square-o'></i>");
        } else if (data.code.indexOf("files found:") === 0) {
            if (data.code.indexOf("files found: 1") === 0) {
                $('#deployOnGoing .progress span').html("scanning your folder <i class='fa fa-refresh fa-spin'></i>");
            }
        } else if (data.code.indexOf("total files") === 0) {
            this.git.state = "scanFinish";
            $('#deployModalButton').removeClass('disabled');
            $('#deployModalButton').html("Deploy folder <i class='fa fa-cog fa-spin'></i>");
            $('#deployOnGoing .progress span').html("scan finished <i class='fa fa-check-square-o'></i>");
            $('#deployOnGoing .progress').get(0).className = "progress";
        } else if (data.code.indexOf("download status:") === 0) {
            var tabDl = data.code.replace("download status: ", "").split("/");
            var toWidth = Math.ceil(((parseInt(tabDl[0]) * 100) / parseInt(tabDl[1]))) + "%";
            $('#deployOnGoing .progress-bar').css("width",  toWidth);
            $('#deployOnGoing .progress span').html(toWidth);
        } else if (data.code.indexOf("download finished") === 0) {
            this.git.state = "downloadFinish";
            $('#deployOnGoing .progress span').html("deploy on going, please wait...");
            $('#deployOnGoing .progress').get(0).className = "progress progress-striped active";
        } else {
            $('#deployOnGoing .progress span').html(data.code);
        }


    },
    getToken: function(callback) {
        $.get("/gitOauth", null, function(response) {
            var d = JSON.parse(response);
            if (d.access_token) {
                this.git.access_token = d.access_token;
            }
            if (callback) {
                callback(d.access_token);
            }
        }.bind(this));
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
