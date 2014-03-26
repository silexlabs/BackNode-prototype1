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
