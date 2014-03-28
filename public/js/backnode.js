var BackNode = function(iframe) {
	this.file = null;
	this.iframe = iframe;
	this.document = iframe.contentDocument;
  this.editor.parent = this;
  this.baliseSearch.parent = this;
};

BackNode.prototype.explorer = {
	pick: function(callback){
    $('#dark-bgr').show();
    cloudExplorer.pick({}, function(data){
      callback(data);
      $('#tools ul li:not(#open)').show();
      $(window).resize();
      $('#dark-bgr').hide();
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
    if (flagEditable === true)
    {
      for(key in listEditableContent)
      {
        switch(listEditableContent[key].tagName)
        {
          case "IMG":
          /*listener on picture click*/
          $(listEditableContent[key]).click(function(){
            parent.editor.editPicture($(this));
          });
          break;
          default:
            if($(listEditableContent[key]).length > 0)
            {
              $(listEditableContent[key]).attr('contenteditable', 'true');
            }
          break;
        }
      }
      this.insertBlock(this.parent.iframe.contentWindow, listEditableContent);
    }
    /*This function disallow the edition of elements*/
    else
    {
      /*remove the picture popin if needed*/
      $(parent.document).find('#bn-popinPicture').remove();
      for (key in listEditableContent)
      {
        if(listEditableContent[key].tagName == "IMG")
        {
          $(listEditableContent[key]).unbind("click");
        }
        else
        {
          $(listEditableContent[key]).removeAttr('contenteditable');
        }
      }
      this.removeBlock(this.parent.iframe.contentWindow, listEditableContent);
    }
    
  },/* This method allow the user to modify a picture ( alt and src attribute ) */
  editPicture: function(picture) {/*need to be modified, doesn't active now, that's so dirty */
      var iframe = $(this.parent.document);
      var popinpicture = '<div id="bn-popinPicture" style="display:none;position:fixed;z-index:10200;width:100%;height:100%;top:0;left:0;background:#000;background:rgba(0,0,0,0.8)"></div>';
      var alt = picture.attr('alt');
      if(alt === undefined)
        alt ="";
      var contentPopinpicture = '<div name="bn-picForm" style="border-radius:3px;-moz-border-radius:3px;-webkit-border-radius:3px;box-shadow:2px 2px 1px #000;width:410px;height:200px;text-align:center;background:#eee;position:absolute;left:50%;top:50%;margin:-100px 0 0 -205px;color:#000000;"><div style="padding:5px;margin-top:10px;margin-bottom:10px;color:#000;display:block;text-align:center"><img src="'+ document.URL +'img/import-title.png" alt="Import your file" style="width:50%;" /><span style="cursor:pointer;position:absolute;top:-15px;right:-15px;"><img src="'+ document.URL +'img/close-pic.png" alt="X" /></span></div><div style="height:35px;overflow:hidden;line-height:35px;margin-left:10px;"><label for="bn-picSrc" style="height:100%;float:left;margin-right:10px;">Src attribute</label><input id="bn-picSrc" type="text" name="picSrc" placeholder="Url" value="'+ picture.attr('src') +'" style="border:1px solid #ccc;padding-left:5px;box-sizing:border-box;height:100%;float:left;margin-right:0;border-radius:3px 0 0 3px;" /><img id="bn-picUpload" src="'+ document.URL +'img/import-btn.png" alt="Import a file" style="height:100%;float:left;" /></div><div style="height:35px;overflow:hidden;line-height:35px;margin:10px 0 0 10px;"><label for="bn-picAlt" style="height:100%;float:left;margin-right:10px;">Alt attribute</label><input id="bn-picAlt" type="text" name="picAlt" placeholder="Alternative text" value="'+ alt +'" style="border:1px solid #ccc;width:290px;padding-left:5px;box-sizing:border-box;border-radius:3px;height:100%;float:left;margin-left:2px;" /></div><button id="bn-valid" style="border:0;background:#38b396;margin-top:10px;width:90%;text-align:center;font-weight:bold;color:#fff;text-transform:capitalize;border-radius:3px;line-height:35px;">Save</button></div>';
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
	},
	insertBlock: function(window, list) {
		var self = this;
		var block = '<div class="backnode-editor-block" style="position:absolute;z-index:10100;background-color:red;opacity:0.3;"></div>';
		var $body = $(window.document).find('body');
		$.each(list, function(key, element) {
			if(typeof element.tagName == 'undefined') { return; }
			var $element = $(element);
			var $block = $(block);
			element.backNodeEditorParent = $block[0];
			$body.append($block);
			$block.bind('mouseover.backNodeEditor', function() {
				$.each(list, function(key, element) {
					$(element).trigger('mouseout.backNodeEditor');
				});
				$(this).hide();
			});
			$element.bind('mouseout.backNodeEditor', function() {
				if($(this).data('bn-editing') === true) { return; }
				$block.show();
			}).bind('click.backNodeEditor', function() {
				$(this).data('bn-editing', true);
				$block.hide();
			}).bind('focusout.backNodeEditor', function() {
				$(this).data('bn-editing', false);
				$block.show();
			});
		});
		var backupWindowSize = $(window.document).width()+'-'+$(window.document).height();
		$(window).bind('resize.backNodeEditor', function() {
			backupWindowSize = $(window.document).width()+'-'+$(window.document).height();
			setTimeout(function() {
				if(backupWindowSize == $(window.document).width()+'-'+$(window.document).height()) {
					self.updateBlock(self.parent.baliseSearch.getList(window.document));
				}
			}, 200);
		});
		$(window).bind('keyup.backNodeEditor', function() {
			self.updateBlock(self.parent.baliseSearch.getList(window.document));
		});
		this.updateBlock(this.parent.baliseSearch.getList(window.document));
	},
	removeBlock: function(window, list) {
		$(window).unbind('resize.backNodeEditor keyup.backNodeEditor');
		$(window.document).find('.backnode-editor-block').remove();
		$.each(list, function(key, element) {
			$(element).unbind('mouseout.backNodeEditor click.backNodeEditor focusout.backNodeEditor');
			$(element.backNodeEditorParent).unbind('mouseover.backNodeEditor');
			delete element.backNodeEditorParent;
		});
	},
	updateBlock: function(list) {
		$.each(list, function(key, element) {
			if(typeof element.tagName == 'undefined') { return; }
			var $element = $(element);
			var $block = $(element.backNodeEditorParent);
			$block.css({
				left:	$element.offset().left,
				top:	$element.offset().top,
				width:	$element.outerWidth(),
				height:	$element.outerHeight()
			});
		});
	}
}

BackNode.prototype.baliseSearch = {
	getList: function(document) {
		var list = [];
		$(document).find('[data-bn]').each(function() {
			if($(this).parents('[data-bn="template"], [data-bn="repeat"]').size() > 0) {
				return;
			} else if($(this).data('bn') == 'template') {
				var subTemplate = {
					type: 'template',
					DOM: this,
					repeats: []
				};
				$(this).find('[data-bn="repeat"]').each(function() {
					var subRepeat = {
						type: 'repeat',
						DOM: this,
						edit: []
					};
					$(this).find('[data-bn="edit"]').each(function() {
						subRepeat.edit.push(this);
					});
					subTemplate.repeats.push(subRepeat);
				});
				list.push(subTemplate);
			} else {
				list.push(this);
			}
		});
		return list;
	}
};
