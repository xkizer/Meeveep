jQuery(function ($) {
	var bigUl = $('#preview-slideshow .viewport ul'),
		currentCard = cardInfo[0],
		lastEvent = null;
	
	var CARD_SIGNATURE_SAVE_URI = '/card/{0}/update/signature',
		CARD_ACCEPT_URI = '/card/{0}/accept';
	
	var penColors = {
		red: 'red',
		blue: 'blue',
		cyan: 'cyan',
		white: 'white',
		black: 'black',
		yellow: 'yellow',
		orange: 'orange',
		green: 'green',
		purple: 'purple',
		pink: 'pink'
	};
	
	// Attach the various cards and the view represnting each to the other
	bigUl.find('li').each(function (i) {
		$(this).data('card', cardInfo[i]);
		cardInfo[i].dom = this;
	});
	
	// Delete the card info
	delete cardInfo;
	
	var iconMap = {
		signature: 'note',
		audio: 'audio',
		video: 'video'
	};
	
	bigUl.on('scrolled', function (e) {
		var index = e.position;
		var card = currentCard = $(bigUl.find('li')[index]).data('card');
		lastEvent = e;
		
		if(card) {
			$('#personal-autograph-preview h1').text(card.name);
			$('#personal-autograph-preview > p').text(card.msg);
			
			// Check if card is ready to submit
			checkCard(card);
			
			if(card.valid) {
				// Card is complete, allow submit
				$('#personal-autograph-preview .rightbox .accept').addClass('ready');
			} else {
				$('#personal-autograph-preview .rightbox .accept').removeClass('ready');
			}
			
			var icons = $('#personal-autographs-bottom .right');
			icons.find('a').css({display: 'none'});
			
			// Check what the card requires and what it does not
			card.includes.forEach(function (part) {
				var icon = icons.find('.' + iconMap[part]).css({display: 'block'});
				
				// Check if "part" has been completed
				if(card[part]) {
					icon.addClass('done');
				} else {
					icon.removeClass('done');
				}
			});
		}
	});
	
	/**
	 * Get the card that is currently in the forefront
	 */
	function getCurrentCard () {
		return currentCard;
	}
	
	/**
	 * Check if a card is ready to be submitted. A card is deemed ready to be submitted if all the required card elements
	 * have been added.
	 */
	function checkCard(card) {
		var valid = true; // Innocent until proven otherwise
		
		// TODO: Implement the card checking function
		var required = card.includes;
		
		for(var i = 0; i < required.length; i++) {
			if(!card[required[i]]) {
				valid = false;
				break;
			}
		}
		
		card.valid = valid;
		return valid;
	}
	
	// Fancy mouse cursor
	var viewport = $('.signage .viewport');
	
	viewport.each(function () {
		var viewport = $(this),
		nameTip = viewport.find('.cursor-tip'),
		offset = viewport.offset();
		
		$(window).resize(function () {
			(function () {
				offset = viewport.offset();
			}).defer(100);
		});
		
		viewport.on('mousemove', function (e) {
			var x = e.pageX,
				y = e.pageY;
			
			nameTip.css({left: x - offset.left + 30, top: y - offset.top});
		});
	});
	
	/**
	 * Start a signature signing session
	 * @param {object} card The card that will be signed
	 * @param {function} callback The callback function to be called when done. Callback is called if and only if the
	 * star clicks "accept". The callback is called in the context of the card and is passed the signature sequence.
	 */
	function initSignature(card, callback) {
		// Signing window auto resize
		var overlay = $('#sign-overlay').fadeIn(),
			img = overlay.find('.img'),
			image = img.find('img').attr({src: card.large}),
			header = overlay.find('header'),
			content = overlay.find('.content'),
			zIndex = 40,
			canvas = $('<canvas>').appendTo(img).css({'z-index': zIndex++}),
			startPosition = null,
			canvasOffset = canvas.offset(),
			context = canvas[0].getContext('2d'),
			penColor = penColors[card.penColor],
			currentStrokes = [],
			mouseStrokes = []; // Records the various mouse stroke, for replay purposes
		
		// Disable mody scrolling
		$('body').addClass('no-scroll');
		
		// If the card has a valid mouse stroke saved, we will redraw the mouse strokes
		if(card.signature) {
			mouseStrokes = JSON.parse(JSON.stringify(card.signature.strokes));
			mouseStrokes.dimensions = card.signature.dimensions;
			
			// Redraw
			redraw();
		}
		
		// Save dimension information to the mouse strokes
		mouseStrokes.dimensions = [canvas.width(), canvas.height()];
		
		// Header
		header.find('.name').text(card.name)
	
		function doResize() {
			var height = overlay.height() - header.height() - 52;
			img.height(height);
			content.width(Math.max(image.width(), header.width()));
			
			if(canvas) {
				canvas.attr({'width': image.width(), 'height': image.height()});
				canvasOffset = canvas.offset();
				recalibrate();
				redraw();
			}
		}
		
		/**
		 * Recalibrates the mouse strokes based on a new canvas size
		 */
		function recalibrate() {
			var dimensions = [canvas.width(), canvas.height()];
			
			// Check if there is a change
			if(dimensions[0] === mouseStrokes.dimensions[0] && dimensions[1] === mouseStrokes.dimensions[1]) {
				// No change in dimension
				return;
			}
			
			// Get the ratios. X- and Y- ration are usually the same, but we take precaution and treat them separately
			var ratios = [
							dimensions[0] / mouseStrokes.dimensions[0],
							dimensions[1] / mouseStrokes.dimensions[1]
						 ];
			
			// Set the new dimensions
			mouseStrokes.dimensions = dimensions;
			
			mouseStrokes.forEach(function (currentStrokes) {
				currentStrokes.forEach(function (xy) {
					xy[0] *= ratios[0];
					xy[1] *= ratios[1];
				});
			});
			
			// Done.
		}
		
		/**
		 * Redraws all layers using mouseStroke record
		 */
		function redraw() {
			// Remove all canvas
			img.find('canvas').remove();
			
			// Recreate each canvas
			mouseStrokes.forEach(function (currentStrokes) {
				var ctx = $('<canvas>').appendTo(img).attr({'width': image.width(), 'height': image.height()}).css({'z-index': zIndex++})[0].getContext('2d');
				ctx.beginPath();
				ctx.lineWidth = 1.5;
				ctx.strokeStyle = penColor;
				ctx.moveTo(currentStrokes[0][0], currentStrokes[0][1]);
				
				currentStrokes.forEach(function (point) {
					ctx.lineTo(point[0], point[1]);
				});
				
				ctx.stroke();
				ctx.closePath();
			});
			
			canvas = $('<canvas>').appendTo(img).css({'z-index': zIndex++});
			context = canvas[0].getContext('2d');
			canvas.attr({'width': image.width(), 'height': image.height()});
			attachEvents();
		}
		
		// Disable drag
		function attachEvents() {
			canvas.on('mousedown', startStroke);
			
			function startStroke (e) {
				// Start the drag
				startPosition = [e.pageX, e.pageY];
				context.beginPath();
				context.lineWidth = 1.5;
				context.strokeStyle = penColor;
				context.moveTo(startPosition[0] - canvasOffset.left, startPosition[1] - canvasOffset.top);
				currentStrokes.push([startPosition[0] - canvasOffset.left, startPosition[1] - canvasOffset.top]);
				
				canvas.on('mouseout mouseup', endStroke).on('mousemove', doStroke);
			}
			
			function doStroke (e) {
				if(startPosition === null) {
					return;
				}
				
				var end = [e.pageX, e.pageY];
				
				context.lineTo(end[0] - canvasOffset.left, end[1] - canvasOffset.top);
				currentStrokes.push([end[0] - canvasOffset.left, end[1] - canvasOffset.top]);
				context.stroke();
			}
			
			function endStroke (e) {
				if(startPosition === null) {
					return;
				}
				
				if(currentStrokes.length < 2) {
					// Nothing really was drawn...
					startPosition = null;
					currentStrokes = [];
					return;
				}
				
				canvas.off('mousedown mouseup mousemove');
				context.closePath();
				mouseStrokes.push(currentStrokes);
				
				// Create a new layer
				canvas = $('<canvas>').appendTo(img).css({'z-index': zIndex++});
				currentStrokes = [];
				context = canvas[0].getContext('2d');
				startPosition = null;
				canvas.attr({'width': image.width(), 'height': image.height()});
				canvasOffset = canvas.offset();
				attachEvents.defer(100);
			}
		}
		
		/**
		 * Undo the last layer
		 */
		function undo() {
			// Get the last canvas
			var canvases = img.find('canvas');
			var lastCanvas = canvases[canvases.length - 2]; // This should be the current canvas and should be empty
			
			if(startPosition !== null) {
				// Strange... something is being drawn on current canvas. We Delete the current canvas
				lastCanvas = canvases[canvases.length - 1];
				$(lastCanvas).trigger('mouseout');
			}
			
			if(!lastCanvas) {
				// Last canvas not found
				return;
			}
			
			// Delete canvas
			$(lastCanvas).remove();
			
			// Delete the stroke record
			mouseStrokes.pop();
		}
		
		/**
		 * Serialize the signature into a form that can be sent and stored
		 */
		function serialize () {
			// Decision point: should we save the image with the signature hard-coded,
			// or the image with the signature on an overlying canvas, or the image
			// with the canvas layers intact as they are?
			// We choose the third option: save the image along with canvas layers
			
			// Our reference frame is the current frame of the picture.
			var signature = {
				referenceFrame: mouseStrokes.dimensions,
				strokes: mouseStrokes
			};
			
			if(mouseStrokes.length < 1) {
				// Nothing has been signed yet...
				return;
			}
			
			return signature;
		}
		
		/**
		 * Cancel the signature
		 */
		function cancel () {
			// Remove all the canvas
			img.find('canvas').remove();
			
			// Delete the history
			mouseStrokes = [];
			currentStrokes = [];
			canvas = null;
			
			// Remove the large image
			image.attr('src', 'about:blank');
			
			// Remove other events
			$('#sign-actions a').off('click');
			$(window).off('resize');
			
			// Close overlay
			overlay.fadeOut();
			$('body').removeClass('no-scroll');
		}
		
		attachEvents();
		$('#sign-actions a').click(function (e) {e.preventDefault()});
		$('#sign-action-undo').click(undo);
		$('#sign-action-cancel').click(cancel);
		
		$('#sign-action-accept').click(function (e) {
			// Attempt to accept the signature
			var accept = serialize();
			
			if(accept) { // Accepted
				callback.call(card, accept);
				return cancel();
			}
			
			// If here... the signature was not accepted
		});
		
		$(window).resize(doResize).resize();
		image.on('load', doResize);
	}
	
	/**
	 * Complete signing a particular card. Submits card immediately, delete it from the queue and
	 * move forward. The card is submitted along with all it's current appendages (video, audio, signature).
	 */
	function doneSigning() {
		var card = getCurrentCard();
		
		if(card && checkCard(card)) {
			// Card is valid...
			// submit card
			var includes = card.includes,
				data = {},
				cardId = card.cardId;
			
			includes.forEach(function (r) {
				data[r] = card[r];
			});
			
			$.ajax({
				error: function () {console.error('Something went wrong');}, // TODO: invent a way to notify user that an error occured
				url: CARD_ACCEPT_URI.format(cardId),
				type: 'post',
				dataType: 'json',
				contentType: 'application/json',
				data: JSON.stringify(data),
				success: function (data) {console.log(data);} // TODO: invent a way to tell the user that the transaction succeeded
			});
			
			// Close the card
			$(card.dom).animate({width: 0}, {complete: function () {
				$(this).remove();
				// Update...
				bigUl.trigger(lastEvent);
			}});
		}
		
		// TODO: implement a notification system to tell the user that the card is not ready for submission
	}
	
	$('#personal-autographs-bottom .note').click(function (e) {
		e.preventDefault();
		var card = getCurrentCard();
		
		initSignature(card, function (signature) {
			// Attach the signature to the card...
			card.signature = signature;
			
			var count = 0;
			
			function update() {
				// ...and update server
				count++;
				
				if(count > 4) {
					return;
				}
				
				$.ajax({
					url: CARD_SIGNATURE_SAVE_URI.format(card.cardId),
					type: 'post',
					dataType: 'json',
					contentType: "application/json",
					data: JSON.stringify(signature),
					error: function () {update.defer(5000);} // Retry until it succeeds
				});
			}
			
			update();
			
			// Check card
			checkCard(card);
			bigUl.trigger(lastEvent);
		});
	});
	
	$('#personal-autograph-preview .rightbox .accept').click(function (e) {
		e.preventDefault();
		
		// Submit card
		doneSigning();
	});
});