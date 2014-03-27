var BackNode = function(iframe) {
	this.file = null;
	this.iframe = iframe;
	this.document = iframe.contentDocument;
  this.editor.parent = this;
  this.baliseSearch.parent = this;
};

BackNode.prototype.explorer = {
	pick: function(callback){
		cloudExplorer.pick({}, callback);
	},

	save: function(){

	}
};
BackNode.prototype.editor = {
  /*This method allow the user to modify the "data-bn" elements if flagEditable is true. It do the contrary if flagEditable is false */
  editable: function(listEditableContent, flagEditable) {
    var parent = this.parent;
    if (flagEditable === true)
    {
      for(key in listEditableContent)
      {console.log(listEditableContent[key].tagName)
        switch(listEditableContent[key].tagName)
        {
          case "img":
          /*listener on picture click*/
          
          $(parent.document).find(listEditableContent[key]).click(function(){
            
            //parent.editor.editPicture($(this));
          });
          break;
          default:
            $(listEditableContent[key]).attr('contenteditable', 'true');
          break;
        }
      }
    }
    /*This function disallow the edition of elements*/
    else
    {
      for (key in listEditableContent)
      {
        if(listEditableContent[key].tagName == "img")
        {
          $(parent.document).off();
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
      $('#popinPicture').append('<div style="width:500px;height:500px;text-align:center;background:#ddd;position:absolute;left:50%;top:50%;margin:-250px 0 0 -250px"><div style="padding:5px;margin-bottom:20px;background-color:#222;color:#eaeaea;display:block;text-align:right"><span style="cursor:pointer;">Fermer X</span></div><p style="margin-left:20px;margin-bottom:20px;display:inline-block;width:150px;text-align:left;">Picture link</p><p class="backNode-imgSrc" contenteditable="true" style="display:inline-block;margin-left:20px;margin-right:20px;margin-bottom:20px;width:200px;background-color:#fff">' + picture.attr('src') + '</p><div><p style="width:150px;text-align:left;margin-left:20px;margin-bottom:20px;display:inline-block;">Alternative Text</p><p class="backNode-imgSrc" contenteditable="true" style="display:inline-block;margin-left:20px;margin-right:20px;margin-bottom:20px;width:200px;background-color:#fff">' + picture.attr('alt') + '</p></div></div>');
      $('#popinPicture').slideDown(400, function() {
        $('#popinPicture').on("click", "span", function() {
          picture.attr('src', $('.backNode-imgSrc').html());
          picture.attr('alt', $('.backNode-imgAlt').html());
          $('#popinPicture').slideUp(400,function(){
            $('#popinPicture').remove();
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

    for (key in listEditableContent)
      {
        //console.log(listEditableContent[key])
        if (listEditableContent[key].length > 0){
          var top = $(listEditableContent[key]).offset().top;
          var left = $(listEditableContent[key]).offset().left;
          //console.log(top)
          //console.log(left)

          $(listEditableContent[key]).children('.backnode-editzone').offset({top: top, left: left});
          $(listEditableContent[key]).children('.backnode-editzone').css({width: $(listEditableContent[key]).width(), height: $(listEditableContent[key]).height()});
        }
      }
  },
  showEditableElements: function(listEditableContent, flagEditable){
    var edit_zone = '<div style="background:#d6ffa0;border:1px solid grey;position:absolute;opacity:0.3" class="backnode-editzone"></div>';
    
    var parent = this.parent;
    if (flagEditable === true)
    {
      for (key in listEditableContent)
      {
        //console.log(listEditableContent[key])
        if (listEditableContent[key].length > 0){

        $(listEditableContent[key]).append(edit_zone);
        //parent.editor.resizeEditableElements($(listEditableContent[key]));
          
        $(listEditableContent[key]).mouseenter(function() {
            $(this).children('.backnode-editzone').hide();
        });
        $(listEditableContent[key]).mouseleave(function() {
            if ($(this).is(":focus") === false)
            $(this).children('.backnode-editzone').show();
        });
        $(listEditableContent[key]).keyup(function(){
            parent.editor.resizeEditableElements($(listEditableContent[key]));
        });
        $(listEditableContent[key]).keydown(function(){
            parent.editor.resizeEditableElements($(listEditableContent[key]));
        });
      }
    }
    }
    else{
      for (key in listEditableContent)
      {
        $(listEditableContent[key]).children('.backnode-editzone').remove();
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