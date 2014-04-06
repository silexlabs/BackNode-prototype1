var BackNode = function(iframe) {
    this.file = null;
    this.iframe = iframe;
    this.document = iframe.contentDocument;
    // Allows sharing parent global instance (the current this)
    this.editor.parent = this;
    this.baliseSearch.parent = this;
    this.ckeditor = {};
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

BackNode.prototype.editor = {
    /*This method allow the user to modify the "data-bn" elements if flagEditable is true. It do the contrary if flagEditable is false */
    editable: function(listEditableContent, flagEditable) {
        var parent = this.parent;

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

                            //active ckeditor on editable element
                            if (!parent.ckeditor[$(listEditableContent[key]).get(0)]) {
                                parent.ckeditor[$(listEditableContent[key]).get(0)] = window.CKEDITOR.inline( $(listEditableContent[key]).get(0) );
                            }
                        }
                    break;
                }

                //add class hover editable for border color and cursor pointer when mouse over an editable element
                $(listEditableContent[key]).addClass("hoverEditable");

                //add style node on iframe for css effect hover
                if (!parent.ckeditor.css) {
                    parent.ckeditor.css = $('<style>.hoverEditable:hover { outline: 1px dashed #7DBEFF; cursor: pointer}</style>');
                    $(parent.document.head).append(parent.ckeditor.css);
                }
            }
        } else {
        /*This function disallow the edition of elements*/
            /*remove the picture popin if needed*/
            $(parent.document).find('#bn-popinPicture').remove();
            for (var keyb in listEditableContent) {
                if(listEditableContent[keyb].tagName === "IMG") {
                    $(listEditableContent[keyb]).unbind("click");
                }  else {
                    //remove everythings
                    $(listEditableContent[keyb]).removeAttr('contenteditable');
                    if (parent.ckeditor[$(listEditableContent[keyb]).get(0)]) {
                        parent.ckeditor[$(listEditableContent[keyb]).get(0)].destroy();
                        parent.ckeditor[$(listEditableContent[keyb]).get(0)] = null;
                    }
                }

                //remove class hover editable for border color and cursor pointer when mouse over an editable element
                $(listEditableContent[keyb]).removeClass("hoverEditable");

                //remove style node on iframe for css effect hover
                if (parent.ckeditor.css) {
                    parent.ckeditor.css.remove();
                    parent.ckeditor.css = null;
                }

                //clean ckeditor empty style node ...
                var s = parent.document.head.getElementsByTagName("style");
                for(var i in s) {
                    if (s.hasOwnProperty(i) && s[i].innerHTML === "") {
                        parent.document.head.removeChild(s[i]);
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