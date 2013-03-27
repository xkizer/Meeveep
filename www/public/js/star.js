jQuery(function ($) {
	var bigUl = $('#preview-slideshow .viewport ul'),               // The container of the slides
		currentCard = window.cardInfo && window.cardInfo[0],        // Initialize the current card to the first card in the stack
		lastEvent = null,                                           // Holds the last event triggered on the bigUl, so that the event can be easily fired again
        
        // Our URLs for AJAX actions
        CARD_SIGNATURE_SAVE_URI = '/card/{0}/update/signature',
		CARD_ACCEPT_URI = '/card/{0}/accept',
        CARD_REJECT_URI = '/card/{0}/reject',
        CREATE_RECORDING_SESSION_URI = '/media/createSession',
        CARD_VIDEO_SAVE_URI = '/card/{0}/update/video',
        CARD_AUDIO_SAVE_URI = '/card/{0}/update/audio',

        // Settings for the video recording
        VIDEO_FREQUENCY = 24,                   // fps
        VIDEO_PERIOD = 1000/VIDEO_FREQUENCY,    // period of frames (T = 1/f)
        COMPILE_INTERVAL = 3000,                // Period of each batch sent to server (Send frames to server every x milliseconds)
        VIDEO_QUALITY = 320,                    // The video quality for normal videos (360p)

        // Allowed pen colors (names matched to css values)
        penColors = {
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
        },

        // Map the name of the actions to the css class name given to their icons
        iconMap = {
            signature: 'note',
            audio: 'audio',
            video: 'video'
        };

	// Attach the various cards and the view representing each to the other
	bigUl.find('li').each(function (i) {
		$(this).data('card', cardInfo[i]);
		cardInfo[i].dom = this;
	});

	// Delete the card info (note that this does not save memory, as the card
    // info is still in scope. It only saves us from unwanted bugs by forcing
    // us to access the card info only through the data attribute. It also helps
    // to ensure that memroy is freed when each individual card is removed)
	delete window.cardInfo;

    // When the slideshow is scrolled (this event is fired from book.js)
	bigUl.on('scrolled', function (e) {
		var index = e.position,
            card = currentCard = $(bigUl.find('li')[index]).data('card');   // Attach the currently visible card to the currentCard variable...
            
		lastEvent = e;  // ...and set the event object as lastEvent

		if(card) {
            // Update the page headings to match the content of the card
			$('#personal-autograph-preview h1 .name').html(card.name);
			$('#personal-autograph-preview > p').html(card.msg);

			// Check if card is ready to submit
			checkCard(card);
            
			if(card.valid) {
				// Card is complete, allow submit
				$('#personal-autograph-preview .rightbox .accept').addClass('ready');
			} else {
                // Not yet complete
				$('#personal-autograph-preview .rightbox .accept').removeClass('ready');
			}
            
            // Hide all activating icons by default...
			var icons = $('#personal-autographs-bottom .right');
			icons.find('a').css({display: 'none'});

			// ...then check what to enable and what to leave hidden (we enable only the icons that are required)
            // TODO: We might have to change this in the future to show all icons, but disbale the ones that are not required
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
     * @return {object} Returns the card that is currently visible to the user
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
		var valid = true, // Innocent until proven otherwise
            required = card.includes;

		for(var i = 0; i < required.length; i++) {
			if(!card[required[i]]) {
				valid = false;
				break;
			}
		}
        
        // Check if any display element should be shown
        var current = getCurrentCard();
        
        if(current === card) {
            // We are dealing with the current card...
            if(!recording) {
                // Check if it has a video attached
                if(card.videoURL) {
                    videoContainer.show();
                    vidElem.src = card.videoURL + '?type=ogv';
                    vidElem.poster = card.videoPoster;
                    videoContainer.attr('data-mode', 'playback').addClass('ready');
                    videoContainer.addClass('video');
                } else if (card.audioURL) {
                    videoContainer.show();
                    vidElem.src = card.videoURL + '?type=ogv';
                    videoContainer.attr('data-mode', 'playback').addClass('ready');
                    videoContainer.removeClass('video');
                } else {
                    vidElem.pause();
                    vidElem.src = 'about:blank';
                    videoContainer.removeClass('ready');
                    videoContainer.removeClass('playing');
                    videoContainer.removeAttr('data-mode');
                    videoContainer.hide();
                    videoContainer.removeClass('video');
                }
            }
        } else {
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

        // Recalculate whenever the window is resized (the viewport is usually resized with the window)
		$(window).resize(function () {
			(function () {
				offset = viewport.offset();
			}).defer(100); // We defer the calling of this function by 100ms because of a bug
		});

        // When the user's mouse moves, relocate the star's name to match the mouse position (but moved 30px to the right)
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
		var overlay = $('#sign-overlay').fadeIn(),                              // The signing window container
			img = overlay.find('.img'),                                         // The image container
			image = img.find('img').attr({src: card.large}),                    // The image itself (we display the large picture for the star to sign)
			header = overlay.find('header'),
			content = overlay.find('.content'),
			zIndex = 40,
			canvas = $('<canvas>').appendTo(img).css({'z-index': zIndex++}),    // Put a transparent canvas on top of the image
			startPosition = null,                                               // This holds the coordinates of the starting position of each stroke
			canvasOffset = canvas.offset(),
			context = canvas[0].getContext('2d'),
			penColor = penColors[card.penColor],                                // The pen color the user chose
			currentStrokes = [],                                                // Holds the coordinates of the current mouse strokes
			mouseStrokes = [];                                                  // Records all the various mouse stroke, for replay purposes

		// Disable body scrolling
		$('body').addClass('no-scroll');

		// If the card has a valid mouse stroke saved, we will redraw the mouse strokes (this means the card had been previously signed)
		if(card.signature) {
			mouseStrokes = JSON.parse(JSON.stringify(card.signature.strokes));
			mouseStrokes.dimensions = card.signature.referenceFrame;
		} else {
            // Save dimension information to the mouse strokes (this helps in future replay, in case window and overlay size has changed by then)
            mouseStrokes.dimensions = [canvas.width(), canvas.height()];
        }
    
		// Header
		header.find('.name').text(card.name);

        /**
         * Resizes the overlay, the image, and the canvas when the window is resized.
         * When a canvas is resized, it is wiped clean. This function redraws the
         * signature after resizing.
         */
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
		 * Recalibrates the mouse strokes based on a new canvas size. This means
         * basically, resampling the mouse strokes to fit the current picture size.
		 */
		function recalibrate() {
			var dimensions = [canvas.width(), canvas.height()];

			// Check if there is a change
			if(dimensions[0] === mouseStrokes.dimensions[0] && dimensions[1] === mouseStrokes.dimensions[1]) {
				// No change in dimension
				return;
			}

			// Get the ratios. X- and Y-ratios are usually the same, but we take precaution and treat them separately
			var ratios = [
							dimensions[0] / mouseStrokes.dimensions[0],
							dimensions[1] / mouseStrokes.dimensions[1]
						 ];

			// Set the new dimensions
			mouseStrokes.dimensions = dimensions;
            
            // Recalibrate...
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
            
            // Remove mouse events from old canvas. This is probably not necessary but used as a precaution to avoid
            // any manner of memory leak
            if(canvas) {
                canvas.off('mousedown')
                        .off('mouseout')
                        .off('mouseup')
                        .off('mousemove');
            }
            
            // Create the new empty canvas (the canvas that will take new strokes)
			canvas = $('<canvas>').appendTo(img).css({'z-index': zIndex++});
			context = canvas[0].getContext('2d');
			canvas.attr({'width': image.width(), 'height': image.height()});
			attachEvents(); // Attach the mousemove events to the new canvas
		}

		/**
         * Attach events to the current canvas (the foremost canvas)
         */
		function attachEvents() {
			canvas.on('mousedown', startStroke);

            /**
             * Called when the user presses the mouse down (to start the signature sequence)
             * @param {object} e
             */
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
            
            /**
             * Called when the user makes a stroke (moves the mouse)
             * @param {object} e
             */
			function doStroke (e) {
				if(startPosition === null) {
					return;
				}

				var end = [e.pageX, e.pageY];

				context.lineTo(end[0] - canvasOffset.left, end[1] - canvasOffset.top);
				currentStrokes.push([end[0] - canvasOffset.left, end[1] - canvasOffset.top]);
				context.stroke();
			}

            /**
             * Called when the user releases the mouse or leaves the signature area.
             * This ends the signature sequence, locks the canvas, and creates a new canvas
             * for the next strokes.
             * @param {object} e
             */
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

				canvas.off('mousedown mouseup mousemove mouseout');
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
		 * Undo the last layer (last stroke)
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
         * @return {object} Returns the signature in a form that can be safely stored
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
		 * Cancel the signature.
         * Cancelling removes all mouse strokes, all canvases, and returns us to
         * the main screen.
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
        
        /********* BEGIN THE SIGNING PROCESS ***********/
		attachEvents();
        
        // Attach events to the icons on the top-right of the page
		$('#sign-actions a').click(function (e) {e.preventDefault();});
		$('#sign-action-undo').click(undo);     // Undo button
		$('#sign-action-cancel').click(cancel); // Cancel button

		$('#sign-action-accept').click(function (e) {   // Accept button
			// Attempt to accept the signature
			var accept = serialize();

			if(accept) { // Accepted
				callback.call(card, accept);
				return cancel();
			}

			// If here... the signature was not accepted
		});
        
        // When the window resizes...
		$(window).resize(doResize).resize();
        
        // When the image is loaded, we artificially fire a resize event, so that
        // the window will be sized with the new image dimensions
		image.on('load', doResize);
	}
    
    
    
    
    /****************** START VIDEO/AUDIO RECORDING FUNCTIONS ****************/
    
    // Cross-browser getUserMedia
    window.getUserMedia = navigator.getUserMedia
                    || navigator.webkitGetUserMedia
                    || navigator.mozGetUserMedia
                    || navigator.oGetUserMedia
                    || navigator.msGetUserMedia;
    
    //Cross-browser window.URL
    window.URL = window.webkitURL
                  || window.mozURL
                  || window.URL
                  || {createObjectURL: function(obj){return obj;}};
    
    // Cross-browser window.audioContext (As of writing, only Chrome 23+ supports this)
    window.audioContext = window.audioContext || window.webkitAudioContext;

    // Configuration for Recorderjs
    var recorderConfig = {
            workerPath: '/js/lib/recorderWorker.js',
            type: 'audio/wav'
        },

        // Tells whether there is an active recording going on or not.
        recording = false,
        
        // Make-shift error reporting
        showError = function () {
            console.error.apply(console, arguments);
        },

        // Video container (the element holding the video element)
        videoContainer = $('.video-container'),
        
        // We use document.querySelector here because we are dealing with only standards-compliant browsers
        vidElem = document.querySelector('#video-preview video'),
        
        // The element that displays playback time
        timeElem = videoContainer.find('.time');


    /**
     * Initialize a video recording session. Video is streamed live to the server,
     * thus, a fast Internet connection is required. The video recording starts
     * when a connection to the server has been negotiated. The connection
     * negotiation includes generation of a session ID that is attached to the
     * video.
     * @param {obect} card The card that the video will be attached to
     * @param {boolean} justAudio Setting this to true will force the use of only audio recording
     * @return {object} Returns the recorder. The recorder object can be used to control the 
     * recording (record, pause, end, etc). This essentially created a closure.
     */
    function initVideo (card, justAudio) {
            var withVideo = !justAudio;
            
            if(withVideo) {
                videoContainer.addClass('video');
            } else {
                videoContainer.removeClass('video');
            }
            
            var recorder = {
                /**
                 * Ends the recording session before anything begins
                 */
                end: function () {
                    // Trigger the onend callback
                    if(this.onend) {
                        this.onend();
                    }

                    if(withVideo) {
                        vidElem.pause();
                        vidElem.src = 'about:blank';
                    }
                },

                paused: false,

                started: false
            };

        // Get permission to record video and audio
        getUserMedia.call(navigator, {audio: true, video: withVideo}, function (stream) {
            // Create the recording session
            createRecordingSession (function (err, session) {
                if(err) {
                    // Could not create the recording session...
                    showError(err);
                    return recorder.end();
                }
                
                // Throw timer event
                if(recorder.ontimer) {
                    recorder.ontimer(timeElapsed);
                }

                // We created the recording session...
                var server = session.server, // This is where we should connect
                    sessionId = session.id,
                    url = window.URL.createObjectURL(stream),
                    scaleFactor,
                    timer, timeElapsed = 0;

                if(withVideo) {
                    vidElem.src = url;
                    vidElem.play();
                }

                var socket = io.connect(server, {'force new connection': true}),
                    vid = $(vidElem),

                    // Create a hidden canvas where we'll write our video data
                    canvas = withVideo && $('<canvas>').css({display: 'none'}).appendTo('body'),

                    // Start a worker process
                    // TODO: reuse workers
                    worker = new Worker('/js/streamWorker.js'),

                    // Ready trackers
                    metaLoaded = false,
                    socketReady = false,
                    workerReady = false,

                    // etc
                    ctx = canvas && canvas[0].getContext('2d'),
                    width, height, captureInterval, compileInterval;

                // When an error occurs...
                // TODO: Find a way to handle errors
                socket.on('error', function (error) {
                    console.error(error);
                });
                
                socket.on('warn', function (msg) {
                    console.warn(msg);
                });
                
                socket.on('fatal', function (msg) {
                    recorder.started = false;
                    console.error(msg);
                    alert('Cannot record because of server error');
                    recorder.end();
                });
                
                // Set the mode for recording
                videoContainer.show();
                videoContainer.attr('data-mode', 'record');

                /**
                 * Called when everything is ready (video, worker, socket)
                 */
                function streamReady () {
                    socket.emit('identify', sessionId);

                    // Wait for "ready"
                    socket.on('ready', function () {
                        console.log('Everything ready... waiting for user');

                        // Controls
                        // Start the recorder
                        recorder.record = function () {
                            if(withVideo) {
                                // Calculate scaleFactor
                                var p = VIDEO_QUALITY; // We intend recording at 320p
                                scaleFactor = p / vid.height();
                                console.log('Video quality: ' + p);
                                console.log('Scale factor: ' + scaleFactor);

                                width = vid.width() * scaleFactor,
                                height = vid.height() * scaleFactor;

                                canvas.attr({width: width, height: height});
                            }

                            if(!recorder.paused) { // Means this is most probably an initial start
                                var meta = {stream: sessionId};
                                
                                if(withVideo) {
                                    meta.rate = VIDEO_FREQUENCY;
                                    meta.media = ['audio', 'video'];
                                } else {
                                    meta.media = ['audio'];
                                }
                                
                                socket.emit('start-stream', meta);
                            }

                            recorder.started = true;

                            captureInterval = window.setInterval(captureAndBuffer, VIDEO_PERIOD); // Save a frame every 40ms
                            compileInterval = window.setInterval(compileFrames, COMPILE_INTERVAL); // Upload buffer every x secs
                            captureAndBuffer();

                            // Audio
                            rec.record();
                            recorder.paused = false;
                            recorder.onresume();
                        };

                        // Pause recording
                        recorder.pause = function (feedbackId) {
                            // Stop the cycle
                            window.clearInterval(captureInterval);
                            window.clearInterval(compileInterval);
                            rec.stop();

                            // Send the current buffer
                            captureAndBuffer();
                            compileFrames(feedbackId);

                            // Set to paused
                            recorder.paused = true;

                            // Fire event
                            recorder.onpause();
                            timer = null;
                        };

                        // End recording session
                        recorder.end = function () {
                            videoContainer.show();
                            // Has anything been recorded?
                            if(recorder.started) {
                                var feedbackId = Math.random();
                                
                                socket.on('feedback', function (fdId) {
                                    if(fdId === feedbackId) {
                                        // Matches
                                        console.log('Ending now...');
                                        // Send "end" signal
                                        socket.emit('end');
                                    }
                                });
                            
                                // Follow the pause procedure
                                this.pause(feedbackId);

                                // Attach video to card
                                card[withVideo ? 'video' : 'audio'] = sessionId;
                            }

                            // Stop video
                            if(withVideo) {
                                vidElem.pause();
                                vidElem.src = 'about:blank';
                                
                                // Remove canvas
                                canvas.remove();
                            }

                            // End connection
                            //socket.disconnect(); // We do not end the connection because the server will use this connection to tell us when the video is ready
                            socket.on('media-ready', function (data) { // Video processing is complete
                                // We can now disconnect the socket
                                socket.disconnect();
                                
                                if(withVideo) {
                                    // Append the video data to the card, and refresh card
                                    card.videoURL = data.videoURL;
                                    card.videoPoster = data.posterURL;
                                } else {
                                    card.audioURL = data.audioURL;
                                }
                                
                                checkCard(card);
                            });

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
                                    
                                    if(withVideo) {
                                        vidElem.src = 'about:blank';
                                        vidElem.pause();
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

                /**
                 * Capture a single picture frame from the video
                 * @returns {string} Returns a base64-encoded JPEG of the current frame
                 */
                function captureFrame () {
                    var w = width,
                        h = height;

                    ctx.drawImage(vidElem, 0, 0, w, h);
                    return getAsJPEGBlob(canvas[0]);
                }

                /**
                 * Captures a single frame and buffers it (stores it for sending).
                 * Note that buffering is handled by the worker.
                 */
                function captureAndBuffer () {
                    // Calculate time elapsed since recording started
                    if(!timer) {
                        timer = new Date();
                    } else {
                        var then = timer;
                        timer = new Date();
                        timeElapsed += timer - then;
                    }

                    // Throw timer event
                    if(recorder.ontimer) {
                        recorder.ontimer(timeElapsed);
                    }

                    if(justAudio) { // Just audio, nothing to capture buddy
                        return;
                    }
                    
                    // Send frame to worker
                    worker.postMessage({type: 'captureFrame', frame: captureFrame()});
                }

                /**
                 * Compile frames for sending to the server. Frames are compiled every x seconds
                 * and some of the compiling functions (the heavy ones) are handled by the workers.
                 * @param {string|number} feedbackId The feedbackId, if provided, can be used to track the compilation
                 */
                function compileFrames (feedbackId) {
                    // Get the WAV audio from the recorder
                    rec.exportWAV(function (blob) {
                        worker.postMessage({type: 'compileFrames', wav: blob, feedbackId: feedbackId});
                    });

                    // Clear the audio buffer
                    rec.clear();
                }

                /**
                 * Send the compiled frames to the server (the compiled frames is
                 * a deflated binary string, so we have to encode it in base64)
                 * @param {string} payload Binary string of the payload to send
                 * @param {string|number} feedbackId The feedbackId, if provided,
                 * can be used to know when the server is done processing the frames
                 */
                function sendFrames (payload, feedbackId) {
                    var data = {data: btoa(payload)};
                    
                    if(feedbackId) {
                        data.feedbackId = feedbackId;
                    }
                    
                    socket.emit('frame', data);
                }

                // Audio...
                var context = new audioContext();
                var mediaStreamSource = context.createMediaStreamSource(stream);
                var rec = new Recorder(mediaStreamSource, recorderConfig);

                // Event listeners
                socket.on('connect', function () { // When we are connected to the server...
                    console.log('Connected to recording server... ready to stream data');
                    socketReady = true;

                    if(metaLoaded && workerReady) {
                        return streamReady();
                    }
                });

                // When the video is ready...
                vid.on('loadedmetadata', function () {
                    console.log('Loaded media meta data... ready to record');
                    metaLoaded = true;

                    if(socketReady && workerReady) {
                        return streamReady();
                    }
                });
                
                if(justAudio) {
                    vid.trigger('loadedmetadata');
                }

                // When the worker sends us a message...
                worker.onmessage = function (event) {
                    var data = event.data;
                    // There are different types of messages the worker may send
                    // us. We use switch to find out which.
                    switch(data.type) {
                        // Ready event signifies the worker is ready to start crunching numbers.
                        // This event is usually a response to the 'ready' event we sent to the worker.
                        case 'ready':
                            console.log('Worker ready... ready to process output');
                            workerReady = true;

                            if(socketReady && metaLoaded) {
                                return streamReady();
                            }
                        break;

                        // The worker wants to console.log something (workers do not have direct access to the console object)
                        case 'log':
                            console.log.apply(console, data.message);
                        break;

                        // The worker sent us the result of number crunching, ready for the server.
                        case 'payload':
                            sendFrames(data.payload, data.feedbackId);
                        break;
                    }
                };

                // In case these have been readied already
                if(socketReady && metaLoaded && workerReady) {
                    streamReady();
                }

                // Tell the worker we are ready
                worker.postMessage({type: 'ready'});
            });
        }, function (err) { // The user either clicked "Deny" on the permissions screen or something worse happened
            if(err) {
                alert('You need to grant us permission to use your camera and/or microphone');
                console.error('Something bad happened!');
                console.log(err);
            }
        });

        return recorder;
    }
    
    /**
     * Creates a recording session. This tells the server that we want to record something.
     * The server checks if we have the permission to record something, and tells us using the callback.
     * @param {function} callback The callback receives an error object (null if no error occured) and the
     * result of the operation. An error means something bad happens, and an id means we are allowed to record.
     * This id must be used to authenticate against the recording server (also sent in the payload).
     */
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
	 * Reject a card and mark as "won't sign"
	 */
	function rejectCard () {
		var card = getCurrentCard();
        
		if(card) {
			var orderId = card.orderId;

			$.ajax({
				error: function () {console.error('Something went wrong');}, // TODO: invent a way to notify user that an error occured
				url: CARD_REJECT_URI.format(orderId),
				type: 'get',
				dataType: 'json',
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

    /**
     * Checks the byte value of the specified character
     * @param {string} x The character to check
     * @return {number} Returns the byte value
     */
    function byteValue(x) {
        return x.charCodeAt(0) & 0xff;
    }

    /**
     * Converts a byte string to a binary buffer
     * @param {type} byteString
     * @return {ArrayBuffer} Returns an ArrayBuffer representing the input in binary
     */
    function toBlob (byteString) {
        var ords = Array.prototype.map.call(byteString, byteValue);
        var ui8a = new Uint8Array(ords);
        return ui8a.buffer;
    }

    /*
     * Process signature button event
     */
	$('#personal-autographs-bottom .note').click(function (e) {
		e.preventDefault();
		var card = getCurrentCard();
        
		initSignature(card, function (signature) {
			// Attach the signature to the card...
			card.signature = signature;
            
			var count = 0;

            // Update the signature property of the card on the server
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
					error: function () {update.defer(5000);} // Retry until it succeeds or times out
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
	$('#personal-autographs-bottom .video').click(function () {
        // Check if there is a recording session
        if(recording) {
            // Something is recording... stop it
            console.log('Recording already in progress');
            return false;
        }

        var vidBtn = $(this),
            card = getCurrentCard();

        // Nothing is recording...
        recording = initVideo(card, false);

        // When the recorder ends...
        recording.onend = function () {
            // Reset the video button
            vidBtn.removeClass('recording');

            // Hide controls
            videoContainer.removeClass('ready');
            timeElem.text('00:00');

            if(recording && recording.started) {
                // Save
                updateVideo(card);
            }
            
            checkCard(card);
            bigUl.trigger(lastEvent);
            recording.started = false;
            recording = null;
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

        recording.ontimer = function (time) {
            time = Math.floor(time/1000);

            var secs = time % 60,
                mins = Math.floor(time / 60);

            timeElem.text('%02d:%02d'.printf(mins, secs));
        };

        vidBtn.addClass('recording');
        return false;
    });

    /*
     * Process the video button click event
     */
	$('#personal-autographs-bottom .audio').click(function () {
        // Check if there is a recording session
        if(recording) {
            // Something is recording... stop it
            console.log('Recording already in progress');
            return false;
        }

        var audBtn = $(this),
            card = getCurrentCard();

        // Nothing is recording...
        recording = initVideo(card, true);

        // When the recorder ends...
        recording.onend = function () {
            // Reset the video button
            audBtn.removeClass('recording');

            // Hide controls
            videoContainer.removeClass('ready');
            timeElem.text('00:00');

            if(recording && recording.started) {
                // Save
                updateAudio(card);
            }
            
            checkCard(card);
            bigUl.trigger(lastEvent);
            recording.started = false;
            recording = null;
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

        recording.ontimer = function (time) {
            time = Math.floor(time/1000);

            var secs = time % 60,
                mins = Math.floor(time / 60);

            timeElem.text('%02d:%02d'.printf(mins, secs));
        };

        audBtn.addClass('recording');
        return false;
    });

    videoContainer.find('.play-pause').on('click', doPlayPause); // Play/pause button
    videoContainer.find('.stop').on('click', function () { // Stop button
        if(recording) { // Already recording something?
            recording.end();
        }
        
        return false; // no-op
    });

    /**
     * Update a card with the video
     * @param {object} card The card to update
     */
    function updateVideo (card) {
        // Attach the video to the card...
        var videoId = card.video;

        if(!videoId) { // No video
            return false;
        }

        var count = 0;

        // Do AJAX
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
                error: function () {update.defer(5000);} // Retry until it succeeds or times out
            });
        }

        update();
    }

    /**
     * Update a card with the audio
     * @param {object} card The card to update
     */
    function updateAudio (card) {
        // Attach the audio to the card...
        var audioId = card.audio;

        if(!audioId) { // No audio
            return false;
        }

        var count = 0;

        // Do AJAX
        function update() {
            count++;

            if(audioId !== card.audio) {
                // Audio ID has changed
                console.warn('Audio ID has changed... aborting');
                return;
            }

            if(count > 4) { // Timeout
                return;
            }

            $.ajax({
                url: CARD_AUDIO_SAVE_URI.format(card.orderId),
                type: 'post',
                dataType: 'json',
                contentType: "application/json",
                data: JSON.stringify({audio: audioId}),
                error: function () {update.defer(5000);} // Retry until it succeeds or times out
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
        
        // Check mode
        var mode = videoContainer.attr('data-mode');

        if(mode === 'playback') {
            // Playback mode
            if(vidElem.paused) {
                initPlay();
            } else {
                videoContainer.removeClass('playing');
                vidElem.pause();
            }
            
            return;
        }
        
        if(!recording.started || recording.paused) {
            // Paused, resume play
            recording.record();
        } else {
            recording.pause();
        }
    }
    
    function initPlay() {
        vidElem.play();
        videoContainer.addClass('playing');
        
        vidElem.onended = function () {
            endPlay();
        };
        
        vidElem.ontimeupdate = function () {
            var secs = vidElem.currentTime % 60,
                mins = Math.floor(vidElem.currentTime / 60),
                totSec = vidElem.duration % 60,
                totMin = Math.floor(vidElem.duration / 60);

            timeElem.text('%02d:%02d/%02d:%02d'.printf(mins, secs, totMin, totSec));
        };
    }
    
    function endPlay() {
        var totSec = vidElem.duration % 60,
            totMin = Math.floor(vidElem.duration / 60);

        vidElem.currentTime = 0;
        timeElem.text('00:00/%02d:%02d'.printf(totMin, totSec));
        vidElem.ontimeupdate = vidElem.onend = vidElem.onpause = null;
        videoContainer.removeClass('playing');
    }

    // When the card is accepted
	$('#personal-autograph-preview .rightbox .accept').click(function (e) {
		e.preventDefault();

		// Submit card
		doneSigning();
	});

    // When the card is accepted
	$('#personal-autograph-preview .rightbox .reject').click(function (e) {
		e.preventDefault();

		// Reject card
		rejectCard();
	});
    
    // Check the cards
    try {
        checkCard(getCurrentCard());
    } catch (e) {}

    // Elsewhere... we deal with date picker
    var date = new Date(),
        fromContainer = $('.datepicker [name="validity.from"]'),
        toContainer = $('.datepicker [name="validity.to"]');

    // From date...
    fromContainer.datepicker({
        defaultDate: "+0d",
        changeMonth: true,
        numberOfMonths: 3,
        onClose: function( selectedDate ) {
            toContainer.datepicker( "option", "minDate", selectedDate );
        }
    });

    // To date...
    toContainer.datepicker({
        defaultDate: "+1m",
        changeMonth: true,
        numberOfMonths: 3,
        onClose: function( selectedDate ) {
            fromContainer.datepicker( "option", "maxDate", selectedDate );
        }
    });
    
    // Make it possible to pick one and only one of video, audio and HQ video
    var mediaSelector = $('#dashboard-02oa7d :checkbox');
    var mmIcons = $('#dashboard-star-thumbnail .mm-icons');
    
    mediaSelector.not('[value="user-image"]').not('[value="hq"]').on('change', function () {
        if(this.checked) {
            // This option has been checked, uncheck every other option
            mediaSelector.not(this).not('[value="user-image"]').not('[value="hq"]').each(function () {
                this.checked = false;
                $.uniform.update(this);
            });
        }
    });
    
    if(window.starInfo) {
        // Star info is set, this is the "add product" page
        (function () {
            var starSelect = $('#star-select');
            var starImage = $('#dashboard-star-thumbnail img');
            var nameContainer = $('#dashboard-star-thumbnail h3');
            var price = $('#dashboard-star-thumbnail .price');
            var priceInput = $('#dashboard-pricing [name="price"]');
            
            function checkStar() {
                var currentId = starSelect.val();
                var star;
                
                // Find star object
                for(var i = 0; i < starInfo.length; i++) {
                    if(starInfo[i].id === currentId) {
                        star = starInfo[i];
                        break;
                    }
                }
                
                starImage.attr('src', star.image);
                starImage.css('display', 'block');
                nameContainer.text(star.name);
                price.text('%.2f'.printf(parseFloat(priceInput.val()) || 0) + '€');
                
                // Includes
                mediaSelector.each(function () {
                    var name = this.value;
                    var icon = mmIcons.find('.' + name);
                    
                    if(this.checked) {
                        icon.css({display: 'block'});
                    } else {
                        icon.css({display: 'none'});
                    }
                });
            }
            
            starSelect.change(checkStar).change();
            priceInput.on('mouseup change keyup', checkStar);
            mediaSelector.on('change', checkStar);
        }());
    }
});
