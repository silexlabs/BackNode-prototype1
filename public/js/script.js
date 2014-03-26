$(document).ready(function() {

	window.backNode = new BackNode($('#iframe').get(0));

	$('#tools #editor').click(function() {
		$(this).toggleClass('switch-on');
		if($(this).hasClass('switch-on'))
			$('#tools ul li:not(#open)').hide();
		else
			$('#tools ul li:not(#open)').show();
		backNode.editor.editable(backNode.baliseSearch.getList(), $(this).hasClass('switch-on'));
	});
	$('#tools #open').click(function() {
		backNode.explorer.pick(function(file) {
			if(file.mimetype == 'text/html') {
				backNode.file = file;
				$(backNode.iframe).attr('src', file.url).load(function(){
					backNode.document = this.contentDocument;
				});
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
		backNode.editor.editable(backNode.baliseSeach.getList(),false);
		backNode.explorer.save(backNode.file.url, $(backNode.document).html());
		backNode.editor.editable(backNode.baliseSeach.getList(),true);
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
