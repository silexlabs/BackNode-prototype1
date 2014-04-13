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
    search: function(filePath, fileName, deployButton) {
        //reset previous git directory path
        this.git.path = null;

        if (!this.git.deployButton) {
            this.git.deployButton = deployButton;
            this.git.deployButton.on("click", this.git.showDeployWindow.bind(this));
            $('#deployModalButton').on("click", this.git.deploy.bind(this));
            $('#deployGitModalButton').on("click", this.git.showDeploySaved.bind(this));
        }

        //retrieve dropbox path (replace unifile path and filename with blank)
        var dropboxPath = filePath.replace("../api/v1.0/dropbox/exec/get/", "").replace(fileName, "");
        var unifilePath = "/api/v1.0/dropbox/exec/ls/";
        var treeIndex = dropboxPath.split("/");
            treeIndex.pop(); //delete first blank entry

        //walk up into the dropbox directory to find a .git directory
        while (treeIndex !== null) {
            var treePath = (treeIndex.length >= 1) ? treeIndex.join("/") : "";

            $.get(unifilePath + treePath, null, this.git.isGitDirectory.bind(this, treePath));

            if (treeIndex.length > 0) {
                treeIndex.pop();
            } else {
                treeIndex = null;
            }
        }
    },
    //check in a folders array if we have a .git
    isGitDirectory: function(resultPath, unifileResponse) {
        //this.git.deployButton.hide();
        if (unifileResponse.length && !this.git.path) {
            for (var unifileObject in unifileResponse) {
                if (unifileResponse.hasOwnProperty(unifileObject) && unifileResponse[unifileObject].name && unifileResponse[unifileObject].name === ".git") {
                    this.git.path = resultPath;
                    if (this.git.deployButton) {
                        this.git.deployButton.show();
                    }
                }
            }
        }
    },
    showDeployWindow: function() {
        $('.modal-body #chooseFiles').hide();
        $('.modal-body #deployOnGoing').show();
        $('#deployModalButton').show();
        $('.modal-body #deployOnGoing p').show();
        $('#deployGitModalButton').removeClass('disabled');
        $('#deployModalButton').addClass('disabled');

        $.get("/deploy/scan", {"path": this.git.path}, function(response) {
            this.git.deployKey = JSON.parse(response).deployKey;
            if (!this.git.socket) {
                this.git.socket = io.connect("http://" + window.location.hostname + ":8000");
            }
            this.git.socket.on(this.git.deployKey, this.git.getDeployStatus.bind(this));
        }.bind(this));

        $('.modal').modal('show');
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
        $('#deployModalButton').addClass('disabled');
        $('#deployGitModalButton').addClass('disabled');
        $('.modal-body #deployOnGoing p').hide();

        $.get("/deploy/all", {"path": this.git.path, "deployKey": this.git.deployKey});
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

        //TODO must be finished
        $.get("/deploy/git", {"path": this.git.path, "deployKey": this.git.deployKey, "files": fileToDeploy});
    },
    getDeployStatus: function(data) {
        $('#deployOnGoing .progress span').html(data.code);

        if (data.code.indexOf("total files") === 0) {
           $('#deployModalButton').removeClass('disabled');
           $('#deployModalButton').html("Deploy folder (" + data.code.split("estimate duration: ")[1] + ")");
        }
        if (data.code.indexOf("download finished") === 0) {
            //this.git.socket.disconnect();
            //this.git.socket = null;
        }
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
    },

    //utils to help cleaning different kind of node
    cleanRessource: function(iframeDocument, type, tabToRemove) {
        var nodeArray = iframeDocument.getElementsByTagName(type);
        var l = nodeArray.length;

        for (var node = 0; node < l; node++) {
            var content = nodeArray[0].src || nodeArray[0].href || nodeArray[0].innerHTML;
            for (var index in tabToRemove) {
                if (tabToRemove.hasOwnProperty(index) && content.indexOf(tabToRemove[index]) !== -1) {
                    nodeArray[0].parentNode.removeChild(nodeArray[0]);
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
