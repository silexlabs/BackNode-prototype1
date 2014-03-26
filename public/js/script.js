$(document).ready(function() {
	var backNode = new BackNode($('#iframe').get(0));
	
	$('#tools #editor').click(function() {
		$(this).toggleClass('switch-on');
		backNode.editor.editable(true, backNode.baliseSeach.getList());
	});
	$('#tools #open').click(function() {
		backNode.explorer.pick(function(file) {
			if(file.mimetype == 'text/html') {
				backNode.file = file;
				$(backNode.iframe).attr('src', file.url);
			} else {
				alert('Invalid extension !');
			}
		});
	});
	$('#tools #save').click(function() {
		if(backNode.file === null) {
			alert('No file chosen !');
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
		var bgrHeight = $(window).height() - $('#menu-wrapper').height() - 110;
		if(bgrHeight > 200) {			
			$('#tools #background').stop().fadeIn().css({
				backgroundImage: "url('../img/backnode.png')",
				height: bgrHeight
			});
		} else if(bgrHeight < 50) {
			$('#tools #background').stop().fadeOut(50);
		} else {
			$('#tools #background').stop().fadeIn().css({
				backgroundImage: "url('../img/logo.png')",
				height: 86
			});
		}
	}).resize();
});
