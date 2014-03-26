$(document).ready(function() {
	var backNode = new BackNode($('#iframe').get(0));
	alert('test')
	$('p').click(function(){
		alert('toto')
	})

	$('#tools #editor').click(function() {
		backNode.editor.editable(backNode.baliseSearch.getList(),true);
	});
	$('#tools #open').click(function() {
		backNode.explorer.pick(function(file) {
			if(file.mimetype == 'text/html') {
				backNode.file = file;
				$(backNode.iframe).attr('src', file.url);
			} else {
				alert('Le type de fichier est invalide !');
			}
		});
	});
	$('#tools #save').click(function() {
		if(backNode.file === null) {
			alert('Vous n\'avais pas sélectioné de fichier');
			return;
		}
		backNode.editor.editable(false, backNode.baliseSeach.getList());
		backNode.explorer.save(backNode.file.url, $(backNode.document).html());
		backNode.editor.editable(true, backNode.baliseSeach.getList());
	});
	
	$(window).resize(function() {
		$('#iframe').width($(window).width()-$('#tools').width());
		$('#tools').height($(window).height());
		$('#iframe').height($(window).height());
		$('#CE').css({ marginLeft: -($('#CE').width()/2), marginTop: -($('#CE').height()/2) });
	}).resize();
});
