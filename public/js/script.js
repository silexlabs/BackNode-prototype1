var activeResize = false;
var oldIframeWidth = 1920;
var oldIframeHeight = 1080;

$(document).ready(function() {
	var $iframe = $('#iframe');
	var $resizeIframe = $('#resize-iframe');
	var $iframeContainer = $('#iframe-container');
	var iframeWidthGap = ($('#resize-iframe').outerWidth() - $('#resize-iframe').width()) / 2;
	var iframeHeightGap = ($('#resize-iframe').outerHeight() - $('#resize-iframe').height() + $('#resize-bar').height()) / 2;

	window.backNode = new BackNode($iframe.get(0));

	/* ------------------------------------------- */

	function BNWindowResize(width, height, animate){
		var x = ($iframeContainer.width() - width) / 2 - iframeWidthGap;
		var y = ($iframeContainer.height() - height) / 2 - iframeHeightGap;
		x = x >= 10 ? x : 10;
		y = y >= 10 ? y : 10;
		$resizeIframe.animate({
				left: x,
				right: x,
				top: y,
				bottom: y
			}, {
				duration: animate ? 250 : 0,
				step: function(){
					$('#iframe-width').text($iframe.width());
					$('#iframe-height').text($iframe.height());
					$iframe.height($resizeIframe.height() - 45);
				},
				complete: function(){
					$('#iframe-width').text($iframe.width());
					$('#iframe-height').text($iframe.height());
					$iframe.height($resizeIframe.height() - 45);
				}
			});
	}

	/* -------------------------------------------- */

	// Click on "Edit mode" & Switching between On and Off
	$('#tools #editor').click(function() {
		$(this).toggleClass('switch-on');
		backNode.editor.editable(backNode.baliseSearch.getList(), $(this).hasClass('switch-on'));
	});

	// Click on open
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

	// Click on save
	$('#tools #save').click(function() {
		if(backNode.file === null) {
			alert('No file chosen !');
			return;
		}
		backNode.editor.editable(backNode.baliseSeach.getList(),false);
		backNode.explorer.save(function(){
			alert('File saved !');
			backNode.editor.editable(backNode.baliseSeach.getList(),true);
		});
	});

	// Enable resize window
	$('body').mousedown(function(evt){
		activeResize = $(evt.target).is($('#resize-icon'));
	}).mouseup(function(){
		activeResize = false;
	});

	// Resizing window
	$('body').mousemove(function(evt){
		if(!activeResize) return;
		var x = $iframeContainer.width() - evt.pageX + $iframeContainer.offset().left - 5;
		var y = $iframeContainer.height() - evt.pageY - $iframeContainer.offset().top - 5;
		var minX = $iframeContainer.width() / 2 - 105;
		var minY = $iframeContainer.height() / 2 - 105;
		x = x <= minX ? x : minX;
		y = y <= minY ? y : minY;
		x = x >= 10 ? x : 10;
		y = y >= 10 ? y : 10;
		$resizeIframe.css({
			left: x,
			right: x,
			top: y,
			bottom: y
		});
		$iframe.height($resizeIframe.height() - 45);
		$('#iframe-width').text($iframe.width());
		$('#iframe-height').text($iframe.height());
		oldIframeWidth = $iframe.width();
		oldIframeHeight = $iframe.height();
	});

	// Click on presets menu -> Show presets
	$('#resolution').click(function(){
		$('#resolution-presets').stop().slideToggle(200);
	});

	// Click on a preset resolution -> Resize window
	$('#resolution-presets li').click(function(){
		BNWindowResize($(this).data('width'), $(this).data('height'), true);
	});

	// Click on body -> Hide presets menu if opened
	$('body').click(function(evt){
		if(!$(evt.target).is($('#resolution, #resolution span, #resolution i')))
			$('#resolution-presets').slideUp(200);
	});

	// When window is resized
	$(window).resize(function(){
		// Keep the same BNWindow resolution
		BNWindowResize(oldIframeWidth, oldIframeHeight);

		// Store the BNWindow resolution
		oldIframeWidth = $iframe.width();
		oldIframeHeight = $iframe.height();

		$iframe.height($resizeIframe.height() - 45);
		if($resizeIframe.width() < 200) {
			$resizeIframe.css({
				left: $iframeContainer.width() / 2 - 105,
				right: $iframeContainer.width() / 2 - 105
			});
		}

		if($resizeIframe.height() < 200) {
			$resizeIframe.css({
				top: $iframeContainer.height() / 2 - 105,
				bottom: $iframeContainer.height() / 2 - 105
			});
		}

		$('#iframe-width').text($iframe.width());
		$('#iframe-height').text($iframe.height());
		$('#tools').height($(window).height());
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
