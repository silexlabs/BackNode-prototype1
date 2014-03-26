$(document).ready(function() {
	window.backNode = new BackNode($('#iframe').get(0));
	
	$('#tools #editor').click(function() {
		backNode.editor.editable(backNode.baliseSearch.getList(),true);
	});
	$('#tools #open').click(function() {
		backNode.explorer.pick(function(file) {
			if(file.mimetype == 'text/html') {
				backNode.file = file;
				$(backNode.iframe).attr('src', file.url).load(function(){
					backNode.document = this.contentDocument;
				});
			} else {
				alert('File isn\'t valid !');
			}
		});
	});
	$('#tools #save').click(function() {
		if(backNode.file === null) {
			alert('you didn\'t select a file');
			return;
		}
		backNode.editor.editable(backNode.baliseSeach.getList(),false);
		backNode.explorer.save(backNode.file.url, $(backNode.document).html());
		backNode.editor.editable(backNode.baliseSeach.getList(),true);
	});
	
	$(window).resize(function() {
		$('#iframe').width($(window).width()-$('#tools').width());
		$('#tools').height($(window).height());
		$('#iframe').height($(window).height());
		$('#CE').css({ marginLeft: -($('#CE').width()/2), marginTop: -($('#CE').height()/2) });
	}).resize();
});
