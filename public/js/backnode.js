var BackNode = function(iframe) {
	this.file = null;
	this.iframe = iframe;
	this.document = iframe.contentDocument;
  this.editor.parent = this;
  this.baliseSearch.parent = this;
};

BackNode.prototype.explorer = {
	pick: function(callback){
		cloudExplorer.pick({}, function(data){
			callback(data);
			$('#tools ul li:not(#open)').show();
	    $(window).resize();
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
    }
    
    //Call the function which colorize the editable zones
    parent.editor.showEditableElements(listEditableContent,flagEditable);
    
  },/* This method allow the user to modify a picture ( alt and src attribute ) */
  editPicture: function(picture) {/*need to be modified, doesn't active now, that's so dirty */
      var iframe = $(this.parent.document);
      var popinpicture = '<div id="bn-popinPicture" style="display:none;position:fixed;z-index:10000;width:100%;height:100%;top:0;left:0;background:#000;background:rgba(0,0,0,0.8)"></div>';
      var contentPopinpicture = '<form name="bn-picForm" style="border-radius:3px;-moz-border-radius:3px;-webkit-border-radius:3px;box-shadow:2px 2px 1px #000;width:400px;height:200px;text-align:center;background:#eee;position:absolute;left:50%;top:50%;margin:-100px 0 0 -200px"><div style="padding:5px;margin-bottom:20px;color:#000;display:block;text-align:center">Import your file<span style="cursor:pointer;position:absolute;top:0;right:0"><img src="'+ document.URL +'img/close-pic.png" alt="X" /></span></div><div><label for="bn-picSrc">Src attribute</label><input id="bn-picSrc" type="text" name="picSrc" value="'+ picture.attr('src') +'" /></div><div><label for="bn-picAlt">Alt attribute</label><input id="bn-picAlt" type="text" name="picAlt" value="'+ picture.attr('alt') +'" /></div><button id="bn-picUpload">Upload a file</button><button id="bn-valid">Valid</button</div>';
      iframe.find("body").append(popinpicture);
      iframe.find('#bn-popinPicture').append(contentPopinpicture);
      iframe.find('#bn-popinPicture').slideDown(400, function() {
        iframe.find('#bn-popinPicture form #bn-valid').click(function(e) {
          e.preventDefault();
          picture.attr('src', iframe.find('#bn-picSrc').val());
          picture.attr('alt', iframe.find('#bn-picAlt').val());
          iframe.find('#bn-popinPicture').slideUp(400,function(){
            iframe.find('#bn-popinPicture').remove();
          });
        });
        iframe.find('#bn-popinPicture form div span').click(function(){
          iframe.find('#bn-popinPicture').slideUp(400,function(){
            iframe.find('#bn-popinPicture').remove();
          });
        });
      });
  },
  resizeOneElement: function(element){
          var top = element.offset().top;
          var left = element.offset().left;
          //console.log(top)
          //console.log(left)

          element.children('.backnode-editzone').offset({top: top, left: left});
          element.children('.backnode-editzone').css({width: element.width(), height: element.height()});
        
  },
  resizeEditableElements: function(listEditableContent) {
    //alert('test2')
    for (key in listEditableContent)
      {
        var element = $(parent.document).find(listEditableContent[key]);
        console.log(element)
        //console.dir(element)
        //console.log(listEditableContent[key])
        //if (element.length > 0){
          var top = element.offset().top;
          var left = element.offset().left;
          //console.log(top)
          //console.log(left)

          element.children('.backnode-editzone').offset({top: top, left: left});
          element.children('.backnode-editzone').css({width: element.width(), height: element.height()});
        //}
      }
  },
  showEditableElements: function(listEditableContent, flagEditable){
    var edit_zone = '<div style="background:#d6ffa0;border:1px solid grey;position:absolute;opacity:0.3" class="backnode-editzone"></div>';
    
    var parent = this.parent;
    if (flagEditable === true)
    {
      for (key in listEditableContent)
      {
        var element = $(parent.document).find(listEditableContent[key]);
        //console.log(element);
        //console.log(listEditableContent[key])
        if (element.length > 0){

        element.append(edit_zone);
        parent.editor.resizeOneElement(element);
      
        element.mouseenter(function() {
            $(this).children('.backnode-editzone').hide();
        });
        element.mouseleave(function() {
            if ($(this).is(":focus") === false)
            $(this).children('.backnode-editzone').show();
        });
        element.keyup(function(){
            parent.editor.resizeEditableElements(listEditableContent);
        });
        element.keydown(function(){
            parent.editor.resizeEditableElements(listEditableContent);
        });
        element.focusout(function(){
            $(this).children('.backnode-editzone').show();
        });
      }
    }
    }
    else{
      for (key in listEditableContent)
      {
        var element = $(parent.document).find(listEditableContent[key]);
        element.children('.backnode-editzone').remove();
      }
    }
    parent.editor.resizeEditableElements(listEditableContent);
  }
}


BackNode.prototype.baliseSearch = {

  getList: function(){
    window.test = $(this.parent.document).find('html');
    var $dataEdit       = $(this.parent.document).find('[data-bn="edit"]')
      , $dataRepeat     = $(this.parent.document).find("[data-bn='repeat']")
      , $dataTemplate   = $(this.parent.document).find("[data-bn='template']")

      ,  mainArray          = []
      ,  dataSoloEditArray  = []
      ,  dataTemplateArray  = []
    ;

    var checkTemplate = function($template, templateArray){

      var $dataBnEdit   = $template.find("[data-bn='edit']")
        , $dataBnRepeat = $template.find("[data-bn='repeat']")
        ;

      // for each data-bn="edit" in the template

      for (i=0, j=$dataBnEdit.length; i<j; i++) {
        var $item = $dataBnEdit.eq(i)
          , hasRepeat = $item.closest("[data-bn='repeat']").length > 0 ? true : false
          ;

        // if the data-bn="edit" isn't in a data-bn="repeat"
        // push it in the racine of the template array

        if (!hasRepeat)
          templateArray.push($item);
      }

      checkRepeat($dataBnRepeat, templateArray);
    }

    var checkRepeat = function($repeat, templateArray){

      var repeatArray = [];

      for (i=0, j=$repeat.length; i<j; i++){
        var $current = $repeat.eq(i)
          , $dataBnEdit = $current.find("[data-bn='edit']")
          ;
        repeatArray.push($dataBnEdit);
      }
      templateArray.push(repeatArray);
      dataTemplateArray.push(templateArray);
      templateArray = [];
    }
    

    // push solo data-bn="edit" in the mainArray
    for (i=0, j=$dataEdit.length; i<j; i++){

      var $item       = $dataEdit.eq(i)
        , hasRepeat   = $item.closest("[data-bn='repeat']").length > 0 ? true : false
        , hasTemplate = $item.closest("[data-bn='template']").length > 0 ? true : false
        ;
      if (!hasRepeat && !hasTemplate){
        mainArray.push($item.get(0));
      }
    }


    // for each data-bn="template"

    for (a=0, b=$dataTemplate.length; a<b; a++){
      var $template     = $dataTemplate.eq(a)
        , templateArray = []
      ;

      checkTemplate($template, templateArray);
    }
    
    mainArray.push(dataTemplateArray);
    
    return mainArray;

  }
};
