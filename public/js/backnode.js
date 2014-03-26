var BackNode = function(iframe) {
	this.file = null;
	this.iframe = iframe;
	this.document = iframe.contentWindow.document;
  this.editor.parent = this;
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
      $(parent.document).on('click', "img", function() {
        parent.editor.editPicture($(this));
      });
      for (key in listEditableContent)
      {
        /*console.log(typeof listEditableContent[key])*/
        $(listEditableContent[key]).attr('contenteditable', 'true');
      }
    }
    else
    {
      for (key in listEditableContent)
      {
          $(listEditableContent[key]).removeAttr('contenteditable');
      }
    }
  },/* This method allow the user to modify a picture ( alt and src attribute ) */
  editPicture: function(picture) {
      showEditableElements();
      $('#popinPicture').append('<div style="width:500px;height:500px;text-align:center;background:#ddd;position:absolute;left:50%;top:50%;margin:-250px 0 0 -250px"><div style="padding:5px;margin-bottom:20px;background-color:#222;color:#eaeaea;display:block;text-align:right"><span style="cursor:pointer;">Fermer X</span></div><p style="margin-left:20px;margin-bottom:20px;display:inline-block;width:150px;text-align:left;">Picture link</p><p class="backNode-imgSrc" contenteditable="true" style="display:inline-block;margin-left:20px;margin-right:20px;margin-bottom:20px;width:200px;background-color:#fff">' + picture.attr('src') + '</p><div><p style="width:150px;text-align:left;margin-left:20px;margin-bottom:20px;display:inline-block;">Alternative Text</p><p class="backNode-imgSrc" contenteditable="true" style="display:inline-block;margin-left:20px;margin-right:20px;margin-bottom:20px;width:200px;background-color:#fff">' + picture.attr('alt') + '</p></div></div>');
      $('#popinPicture').slideDown(400, function() {
        $('#popinPicture').on("click", "span", function() {
          picture.attr('src', $('.backNode-imgSrc').html());
          picture.attr('alt', $('.backNode-imgAlt').html());
          $('#popinPicture').slideUp(400);
        });
      });
  },
  resizeEditableElements: function(elem) {
    var top = elem.offset().top;
    var left = elem.offset().left;

    elem.children('.backnode-editzone').offset({top: top, left: left});
    elem.children('.backnode-editzone').css({width: elem.width(), height: elem.height()});
  },
  getAllEditableElements: function() {
    $('[data-bn="edit"]').each(function() {
        backNode.editor.resizeEditableElements($(this));
    });
  },
  showEditableElements: function(){
    var edit_zone = '<div style="background:#d6ffa0;border:1px solid grey;position:absolute;opacity:0.3" class="backnode-editzone"></div>';
    $('[data-bn="edit"]').each(function() {
      $(this).append(edit_zone);
      $(this).css('z-index', 1);
      $(this).children('.backnode-editzone').css('z-index', 2);
    });
    $('[data-bn="edit"]').click(function() {
      $('.backnode-editzone').not(this).show;
    });
    $(window).resize(function() {
      backNode.editor.getAllEditableElements();
    });
    $('[data-bn="edit"]').keydown(function() {
      backNode.editor.getAllEditableElements();
    });
    $('[data-bn="edit"]').keyup(function() {
      backNode.editor.getAllEditableElements();
    });
    backNode.editor.getAllEditableElements();
    $('[data-bn="edit"]').css('height', '100%');
    $('[data-bn="edit"]').mouseenter(function() {
      $(this).children('.backnode-editzone').hide();
      //$(this).children('.backnode-editzone').css('z-index', 0);
    });
    $('[data-bn="edit"]').mouseleave(function() {
      if ($(this).is(":focus") === false)
          $(this).children('.backnode-editzone').show();
      //$(this).children('.backnode-editzone').css('z-index', 2);
    });
  }
}


BackNode.prototype.baliseSearch = {

  getList: function(){

    var $dataEdit       = $("[data-bn='edit']")
      , $dataRepeat     = $("[data-bn='repeat']")
      , $dataTemplate   = $("[data-bn='template']")

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
        mainArray.push($item);
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