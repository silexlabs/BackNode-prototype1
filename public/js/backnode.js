var BackNode = function(iframe) {
	this.file = null;
	this.iframe = iframe;
	this.document = iframe.contentWindow.document;
};

BackNode.prototype.explorer = {
	pick: function(callback){
		cloudExplorer.pick({}, callback);
	},

	save: function(){

	}
};



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










