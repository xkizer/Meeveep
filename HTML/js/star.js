jQuery(function ($) {
	var bigUl = $('#preview-slideshow .viewport ul'),
		currentCard = window.cardInfo && window.cardInfo[0],
		lastEvent = null;

	var CARD_SIGNATURE_SAVE_URI = '/card/{0}/update/signature',
		CARD_ACCEPT_URI = '/card/{0}/accept',
        CREATE_RECORDING_SESSION_URI = '/media/createSession',
        CARD_VIDEO_SAVE_URI = '/card/{0}/update/video';

    var VIDEO_FREQUENCY = 25,                   // fps
        VIDEO_PERIOD = 1000/VIDEO_FREQUENCY,    // period of frames
        COMPILE_INTERVAL = 3000;                // Period of each batch sent to server

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
			$('#personal-autograph-preview h1 .name').text(card.name);
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
     * @param {object} card The card to check
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
		header.find('.name').text(card.name);

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
		$('#sign-actions a').click(function (e) {e.preventDefault();});
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

    window.getUserMedia = navigator.getUserMedia
                    || navigator.webkitGetUserMedia
                    || navigator.mozGetUserMedia
                    || navigator.oGetUserMedia
                    || navigator.msGetUserMedia;

    window.URL = window.webkitURL
                  || window.mozURL
                  || window.URL
                  || {createObjectURL: function(obj){return obj;}};

    window.audioContext = window.audioContext || window.webkitAudioContext;

    var recorderConfig = {
        workerPath: '/js/lib/recorderWorker.js',
        type: 'audio/wav'
    };

    // The video quality for normal videos (360p)
    var VIDEO_QUALITY = 360;

    // Tells whether there is an active recording going on or not.
    var recording = false;

    var showError = function () {
        console.error.apply(console, arguments);
    };

    var videoContainer = $('.video-container');

    //var audioContext = new webkitAudioContext();

    /**
     * Initialize a video recording session. Video is streamed live to the server,
     * thus, a fast Internet connection is required. The video recording starts
     * when a connection to the server has been negotiated. The connection
     * negotiation includes generation of a session ID that is attached to the
     * video.
     * @param {obect} card The card that the video will be attached to
     */
    function initVideo (card) {
        var recorder = {
            /**
             * Ends the recording session before anything begins
             */
            end: function () {
                // Trigger the onend callback
                if(this.onend) {
                    this.onend();
                }
            },

            paused: false,

            started: false
        };

        // Get permission to record video and audio
        getUserMedia.call(navigator, {audio: true, video: true}, function (stream) {
            // Create the recording session
            createRecordingSession (function (err, session) {
                if(err) {
                    // Could not create the recording session...
                    showError(err);
                    return recorder.end();
                }

                // We created the recording session...
                var server = session.server, // This is where we should connect
                    sessionId = session.id,
                    url = window.URL.createObjectURL(stream),
                    vidElem = document.querySelector('#video-preview video'),
                    audioElem = document.querySelector('#video-preview audio'),
                    scaleFactor,
                    timer, timeElapsed = 0;

                vidElem.src = url;
                ///audioElem.src = window.URL.createObjectURL(stream);
                vidElem.play();

                console.log('Server', server);
                var socket = io.connect(server, {'force new connection': true}),
                    vid = $(vidElem),

                    // Create a hidden canvas where we'll write our video data
                    canvas = $('<canvas>').css({display: 'none'}).appendTo('body'),

                    // Start a worker instance
                    // TODO: reuse workers
                    worker = new Worker('/js/streamWorker.js'),

                    // Ready trackers
                    metaLoaded = false,
                    socketReady = false,
                    workerReady = false,

                    // etc
                    ctx = canvas[0].getContext('2d'),
                    width, height, captureInterval, compileInterval;

                // When an error occurs...
                // TODO: Find a way to handle errors
                socket.on('error', function (error) {
                    console.error(error);
                });

                // When everything is ready (video, worker, socket)
                function streamReady () {
                    socket.emit('identify', sessionId);

                    // Wait for "ready"
                    socket.on('ready', function () {
                        // Calculate scaleFactor
                        var p = VIDEO_QUALITY; // We intend recording at 360p
                        scaleFactor = p / vid.height();
                        console.log('Video quality: ' + p);
                        console.log('Scale factor: ' + scaleFactor);

                        width = vid.width() * scaleFactor,
                        height = vid.height() * scaleFactor;

                        canvas.attr({width: width, height: height});

                        console.log('Everything ready... waiting for user');

                        // Controls
                        // Start the recorder
                        recorder.record = function () {
                            if(!recorder.paused) { // Means this is most probably an initial start
                                socket.emit('start-stream', {stream: sessionId, rate: VIDEO_FREQUENCY});
                            }

                            recorder.started = true;

                            captureInterval = window.setInterval(captureAndBuffer, VIDEO_PERIOD); // Save a frame every 40ms
                            compileInterval = window.setInterval(compileFrames, COMPILE_INTERVAL); // Upload frames every 2s
                            captureAndBuffer();

                            // Audio
                            rec.record();
                            recorder.paused = false;
                            recorder.onresume();
                        };

                        // Pause recording
                        recorder.pause = function () {
                            // Stop the cycle
                            window.clearInterval(captureInterval);
                            window.clearInterval(compileInterval);
                            rec.stop();

                            // Send the current buffer
                            captureAndBuffer();
                            compileFrames();

                            // Set to paused
                            recorder.paused = true;

                            // Fire event
                            recorder.onpause();
                            timer = null;
                        };

                        // End recording session
                        recorder.end = function () {
                            // Has anything been recorded?
                            if(recorder.started) {
                                // Follow the pause procedure
                                this.pause();

                                // Attach video to card
                                card.video = sessionId;
                            }

                            // Send "end" signal
                            socket.emit('end');

                            // Stop video
                            vidElem.pause();
                            vidElem.src = 'about:blank';

                            // Remove canvas
                            canvas.remove();

                            // End connection
                            socket.disconnect();

                            // Stop the cycle
                            window.clearInterval(captureInterval);
                            window.clearInterval(compileInterval);

                            // Fire event
                            recorder.onend();

                            // Reset
                            recorder = {
                                /**
                                 * Ends the recording session before anything begins
                                 */
                                end: function () {
                                    // Trigger the onend callback
                                    if(this.onend) {
                                        this.onend();
                                    }
                                },

                                paused: false,

                                started: false
                            };
                        };

                        // Trigger the "ready" event
                        if(recorder.onready) {
                            recorder.onready();
                        }
                    });
                };

                function captureFrame () {
                    var w = width,
                        h = height;

                    ctx.drawImage(vidElem, 0, 0, w, h);
                    return getAsJPEGBlob(canvas[0]);
                }

                /**
                 * Captures a single frame and buffers it
                 */
                function captureAndBuffer () {
                    if(!timer) {
                        timer = new Date();
                    } else {
                        var then = timer;
                        timer = new Date();
                        timeElapsed += timer - then;
                    }

                    // Send frame to worker
                    worker.postMessage({type: 'captureFrame', frame: captureFrame()});

                    // Throw event
                    if(recorder.ontimer) {
                        recorder.ontimer(timeElapsed);
                    }
                }

                function compileFrames () {
                    rec.exportWAV(function (blob) {
                        worker.postMessage({type: 'compileFrames', wav: blob});
                    });

                    rec.clear();
                }

                function sendFrames (payload) {
                    socket.emit('frame', {data: btoa(payload)});
                }

                // Audio...
                var context = new audioContext();
                var mediaStreamSource = context.createMediaStreamSource(stream);
                var rec = new Recorder(mediaStreamSource, recorderConfig);

                // Event listeners
                socket.on('connect', function () {
                    console.log('Connected to recording server... ready to stream data');
                    socketReady = true;

                    if(metaLoaded && workerReady) {
                        return streamReady();
                    }
                });

                vid.on('loadedmetadata', function () {
                    console.log('Loaded video meta data... ready to record video');
                    metaLoaded = true;

                    if(socketReady && workerReady) {
                        return streamReady();
                    }
                });

                worker.onmessage = function (event) {
                    var data = event.data;
                    console.log('From worker', data);

                    switch(data.type) {
                        case 'ready':
                            console.log('Worker ready... ready to process output');
                            workerReady = true;

                            if(socketReady && metaLoaded) {
                                return streamReady();
                            }
                        break;

                        case 'log':
                            console.log.apply(console, data.message);
                        break;

                        case 'payload':
                            sendFrames(data.payload);
                        break;
                    }
                };

                // In case these have been readied already
                if(socketReady && metaLoaded && workerReady) {
                    streamReady();
                }

                worker.postMessage({type: 'ready'});
            });
        }, function (err) {
            if(err) {
                alert('You need to grant us permission to use your camera and microphone');
                console.error('Something bad happened!');
                console.log(err);
            }
        });

        return recorder;
    }



    function createRecordingSession (callback) {
        $.ajax({
            type: 'get',
            url: CREATE_RECORDING_SESSION_URI,
            dataType: 'json',
            error: function (error) {
                callback(error);
            },
            success: function (data) {
                callback(null, data);
            }
        });
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
				orderId = card.orderId;

			includes.forEach(function (r) {
				data[r] = card[r];
			});

			$.ajax({
				error: function () {console.error('Something went wrong');}, // TODO: invent a way to notify user that an error occured
				url: CARD_ACCEPT_URI.format(orderId),
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
                bigUl[0].recalculate();
			}});
		}

		// TODO: implement a notification system to tell the user that the card is not ready for submission
	}


    /**
     * Convert data URI to blob
     * http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata/5100158
     * @param {string} dataURI The data uri to convert to binary
     * @param {function} callback Callback function
     */
    function dataURItoBlob(dataURI, callback) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs

        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0) {
            //byteString = atob(dataURI.split(',')[1]);
            byteString = dataURI.split(',')[1];
        } else {
            byteString = unescape(dataURI.split(',')[1]);
        }

        return byteString;
    }

    /**
     * Get image as binary
     * http://stackoverflow.com/questions/10313992/upload-html5-canvas-as-a-blob
     * @param {HTMLCanvasElement} canvas
     */
   function getAsJPEGBlob(canvas) {
        /*if(canvas.mozGetAsFile) {
            return canvas.mozGetAsFile("foo.jpg", "image/jpeg");
        } else {*/
            var data = canvas.toDataURL('image/jpeg', 0.5);
            var blob = dataURItoBlob(data);
            return blob;
        //}
    }

    function byteValue(x) {
        return x.charCodeAt(0) & 0xff;
    }

    function toBlob (byteString) {
        var ords = Array.prototype.map.call(byteString, byteValue);
        var ui8a = new Uint8Array(ords);
        return ui8a.buffer;
    }

    /*
     * Process signature button even
     */
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

                if(signature !== card.signature) {
                    // Video ID has changed
                    console.warn('Signature has changed... aborting');
                    return;
                }

				if(count > 4) {
					return;
				}

				$.ajax({
					url: CARD_SIGNATURE_SAVE_URI.format(card.orderId),
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

    /*
     * Process the video button click event
     */
	$('#personal-autographs-bottom .video').click(function (e) {
        // Check if there is a recording session
        if(recording) {
            // Something is recording... stop it
            console.log('Recording session complete');
            recording.end();

            return false;
        }

        var vidBtn = $(this),
            card = getCurrentCard();

        // Nothing is recording...
        recording = initVideo(card);

        // When the recorder ends...
        recording.onend = function () {
            recording.started = false;
            recording = null;

            // Reset the video button
            vidBtn.removeClass('recording');

            // Hide controls
            videoContainer.removeClass('ready');
            timeElem.text('00:00');

            // Save
            updateVideo(card);
            checkCard(card);
            bigUl.trigger(lastEvent);
        };

        recording.onready = function () {
            videoContainer.addClass('ready');
        };

        recording.onpause = function () {
            videoContainer.removeClass('recording');
        };

        recording.onresume = function () {
            videoContainer.addClass('recording');
        };

        var timeElem = videoContainer.find('.time');

        recording.ontimer = function (time) {
            time = Math.floor(time/1000);

            var secs = time % 60,
                mins = Math.floor(time / 60);

            timeElem.text('%02d:%02d'.printf(mins, secs));
        };

        vidBtn.addClass('recording');
        return false;
    });

    videoContainer.find('.play-pause').on('click', doPlayPause);

    function updateVideo (card) {
        // Attach the signature to the card...
        var videoId = card.video;

        if(!videoId) {
            return false;
        }

        var count = 0;

        function update() {
            count++;

            if(videoId !== card.video) {
                // Video ID has changed
                console.warn('Video ID has changed... aborting');
                return;
            }

            if(count > 4) { // Timeout
                return;
            }

            $.ajax({
                url: CARD_VIDEO_SAVE_URI.format(card.orderId),
                type: 'post',
                dataType: 'json',
                contentType: "application/json",
                data: JSON.stringify({video: videoId}),
                error: function () {update.defer(5000);} // Retry until it succeeds or ultimately fails
            });
        }

        update();
    }

    /**
     * Handles play and pause button clicks
     * @param {object} e
     */
    function doPlayPause (e) {
        e.preventDefault();

        if(!recording.started || recording.paused) {
            // Paused, resume play
            recording.record();
        } else {
            recording.pause();
        }
    }

	$('#personal-autograph-preview .rightbox .accept').click(function (e) {
		e.preventDefault();

		// Submit card
		doneSigning();
	});

    // Elsewhere... we deal with date picker
    var date = new Date(),
        fromContainer = $('.datepicker [name="validity.from"]'),
        toContainer = $('.datepicker [name="validity.to"]');

    fromContainer.datepicker({
        defaultDate: "+0d",
        changeMonth: true,
        numberOfMonths: 3,
        onClose: function( selectedDate ) {
            toContainer.datepicker( "option", "minDate", selectedDate );
        }
    });

    toContainer.datepicker({
        defaultDate: "+1m",
        changeMonth: true,
        numberOfMonths: 3,
        onClose: function( selectedDate ) {
            fromContainer.datepicker( "option", "maxDate", selectedDate );
        }
    });
});
