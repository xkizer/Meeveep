jQuery(function ($) {
    window.Meeveep = window.Meeveep || {};
    
	// Start the scrollbar
	$(".scrolling").mCustomScrollbar({
		scrollButtons:{
			enable: false
		}
	});
	
	$('select').selectbox();
	$('input[type="checkbox"]').uniform();
	
	// Profile area
	$('#icon-nav-profile').click(function (e) {
	    e.preventDefault();
	    
	    // Toggle the view of the user info box
	    var userInfoBox = $('#user-info-box');
	    
	    if(userInfoBox.css('display') === 'none') {
	        userInfoBox.fadeIn();
	    } else {
	        userInfoBox.fadeOut();
	    }
	});
    
	// Login authentication
	$('#login-form').submit(function (e) {
	    e.preventDefault();
	    
	    // Submit form using AJAX
	    var form = $(this).addClass('submitting');
	    form.find(':input').attr("disabled", "disabled");
	    
	    var username = form.find('[type="email"]').val();
	    var password = form.find('[type="password"]').val();
	    form.find('.error').css('display', 'none').text('');
	    
	    // Handles login error
	    function showError(msg) {
	        form.find('.error').css('display', 'block').text(msg);
	    }
	    
	    $.ajax({
	        type: 'post',
	        url: '/auth/login',
	        dataType: 'json',
	        context: form,
	        data: {
	            username: username,
	            password: password
	        },
	        complete: function () {
	            form.removeClass('submitting');
	            form.find(':input').removeAttr("disabled");
	        },
	        error: function () {
	            showError('Network error. Please check connection.'); // TODO: Internationalize
	        },
	        success: function (data) {
	            if(data.error) {
	                return showError(data.error);
	            }
	            
	            // Login successful... reload page
	            window.location.reload(true);
	        }
	    });
	});
    
    // Uploaders...
    $('#wrapper').delegate('.file-upload .picker', 'click', function () {
        // Some browsers require the file input element to be visible (and some
        // focused) before we can programatically activate the element.
        $(this).closest('.file-upload').find('input[type="file"]')
                .show()
                .focus()
                .click()
                .hide();
        
        return false;
    }).delegate('.file-upload input[type="file"]', 'change', function () {
        // File name
        var filename = this.value.split(/[\/\\]/g);
        filename = filename[filename.length - 1];
        $(this).closest('.file-upload').find('.filename').val(filename);
    }).delegate('.file-upload .upload', 'click', function (e) {
        e.preventDefault();
        
        var me = $(this),
            parent = me.closest('.file-upload'),
            fileInput = parent.find('input[type="file"]')[0];
        
        // Get picture information
        var picFile = fileInput.files[0],
            type = picFile.type,
            URL = window.URL || window.webkitURL,
            url = URL.createObjectURL(picFile),
            img, canvas, canvasRatio, ctx;
        
        if(!type.match(/^image\//)) {
            // Not an image...
            return false;
        }
        
        // Create a hidden image element and a hidden canvas element through which
        // we will get access to the image data
        img = $('<img>');
        canvas = $('<canvas>');
        ctx = canvas[0].getContext('2d');
        
        // Help Chrome get its acts together
        img.add(canvas).appendTo('body').hide();
        
        img.on('load', function () {
            var imageHeight, imageWidth,
                canvasHeight = 157 * 4,
                canvasWidth = 152 * 4;
        
            if(imageWidth < canvasWidth || imageHeight < canvasHeight) {
                // The image dimensions are too small
                return;
            }
            
            // ...then we need to get the ratio of the image to the canvas
            canvasRatio = canvasWidth/canvasHeight; //Math.min(canvasWidth/imageWidth, canvasHeight/imageHeight);
            imageWidth = Math.min(img.width(), img.height() * canvasRatio);
            imageHeight = Math.min(img.height(), img.width() / canvasRatio);
            
            // We need to set the dimensions of the canvas to match the image dimension
            canvas[0].width = imageWidth;
            canvas[0].height = imageHeight;

            // ...then we take as much of the picture as we can (and crop off the rest)
            var cropDomensions = [(img.width() - imageWidth) / 2, (img.height() - imageHeight) / 2]; // [horizontal-start, vertical-start]
            ctx.drawImage(img[0], cropDomensions[0], cropDomensions[1], imageWidth, imageHeight, 0, 0, imageWidth, imageHeight);
            
            // Trigger events to notify any listeners
            var event = new jQuery.Event('upload');
            event.imageData = canvas[0].toDataURL('image/jpeg', 0.9);
            event.canvas = canvas[0];
            parent.trigger(event);
            
            // Clean up
            canvas.remove();
            img.remove();
        });
        
        img[0].src = url;

        // Reset the controls
        parent.find('.filename').val('');
        fileInput.value = ''; // This makes it possible to detect file selection when the user selects the same file again
    });
    
    window.Meeveep.dialog = {
        /**
         * Create a new dialog box
         * @param {object} config An object describing the dialog box and its content
         * @returns {object} Returns an object that can be used to manipulate the dialog box
         */
        create: function (config) {
            var dialog = $('<section class="dialog">').appendTo('body'),
                body = $('<div class="body">').appendTo(dialog),
                viel = $('<div class="viel">').appendTo(dialog),
                title, content;
            
            if(config.markup) {
                // The user provided a complete markup
                body.append(config.markup);
            } else {
                if(config.title) {
                    title = $('<h1>').text(config.title).appendTo($('<header>').appendTo(body));
                }
                
                if(config.message) { // Plain text message
                    content = $('<div class="content">').text(config.message).appendTo(body);
                } else if (config.html) { // HTML message
                    content = $('<div class="content">').html(config.html).appendTo(body);
                }
                
                if(!config.buttons) {
                    // No buttons were provided for the user, we provide default buttons for the user
                    // If the caller wish to not provide any buttons at all, set config.buttons to an empty array
                    config.buttons = [
                        {
                            text: 'Okay »',
                            action: 'close'
                        }
                    ];
                }
                
                if(config.buttons.length > 0) {
                    // Buttons provided. If no buttons were provided, then the
                    // dialog can only be closed or controlled programatically.
                    // This is useful in situations where the dialog is waiting
                    // for an action to complete before continuing (like network
                    // to be established) or where the user has hit a road block
                    // (for example where service is not supported)
                    var buttons = $('<div class="actions">').appendTo(body);
                    
                    config.buttons.forEach(function (button) {
                        var btn = $('<button class="btn">').text(button.text).appendTo(buttons);
                        
                        btn.on('click', function (e) {
                            e.preventDefault();
                            
                            if(typeof button.action === 'function') {
                                button.action.call(dialog);
                            } else if (typeof button.action === 'string' && typeof dialog.actions[button.action] === 'function') {
                                dialog.actions[button.action].call(dialog);
                            }
                        });
                    });
                }
            }
            
            function calculatePosition () {
                var width, height,
                    maxWidth = $(window).width() - 72,
                    maxHeight = $(window).height() - 72,
                    minWidth = 72,
                    minHeight = 72;
                
                if(title) {
                    minHeight += title.closest('header').outerHeight();
                }
                
                if(buttons) {
                    minHeight += buttons.outerHeight();
                }
                
                if(config.width) {
                    // A specific width was specified
                    width = Math.min(Math.max(parseInt(config.width), minWidth), maxWidth) - 32;
                }
                
                if(config.height) {
                    height = Math.min(Math.max(parseInt(config.height), minHeight), maxWidth) - 32;
                }
                
                // Set the dimensions
                if(width) {
                    body.width(width);
                } else {
                    body.css({width: ''});
                }
                
                if(height) {
                    body.height(height);
                } else {
                    body.css({height: ''});
                }
                
                // Free up the height of the content so we can calculate the dialog height accurately
                if(content) {
                    content.css({height: ''});
                }
                
                // Check again to make sure that things are not looking bad
                if(!height) {
                    // We did not set the height ourselves, so it has the potential to overflow
                    var cHeight = body.height();
                    
                    if(cHeight > maxHeight) {
                        // And it overflowed!!!
                        body.height(maxHeight);
                        
                        // Check if we can ganner more space by expanding the width
                        if(!width) {
                            // We can only do this if we do not have a width constraint
                            var overflowRatio = cHeight / maxHeight;
                            width = body.width() * overflowRatio * 1.2;
                            body.width(Math.min(Math.max(width, minWidth), maxWidth - 32));
                        }
                    }
                }
                
                // Set the content height
                if(content) {
                    var contentHeight = body.height();
                    
                    if(title) {
                        contentHeight -= title.closest('header').outerHeight();
                    }
                    
                    if(buttons) {
                        contentHeight -= buttons.outerHeight();
                    }
                    
                    content.height(contentHeight);
                }
                
                // Calculate the top margin
                var topMargin = ($(window).height() - body.outerHeight()) / 2;
                body.css({'margin-top': topMargin + 'px'});
            };
        
            calculatePosition();
            $(window).on('resize', calculatePosition);
            
            dialog.actions = {
                close: function () {
                    dialog.remove();
                    $(window).off('resize', calculatePosition);
                },
                
                hide: dialog.hide.bind(dialog, 400),
                show: dialog.show.bind(dialog, 400),
                
                setTitle: function (text) {
                    var ttl = dialog.find('>header h1');
                    
                    if(!ttl.length === 0) {
                        ttl = $('<h1>').text(config.title).appendTo($('<header>').appendTo(body));
                    }
                    
                    ttl.text(text);
                    calculatePosition();
                },
                
                setMessage: function (text) {
                    if(!content) {
                        content = $('<div class="content">').appendTo(body);;
                    }
                    
                    content.text(text);
                    calculatePosition();
                },
                
                setMessageHTML: function (html) {
                    if(!content) {
                        content = $('<div class="content">').appendTo(body);;
                    }
                    
                    content.html(html);
                    calculatePosition();
                }
                
                // TODO: add configButtons method for changing the buttons
            };
            
            return dialog;
        },
        
        /**
         * Convert an already existing document element to a dialog. The only
         * modification to the markup is the addition of the class "dialog" and
         * the viel (if they don't exist already). Also, any element that has
         * the class "hidden" will be hidden by default
         * @param {string|object|HTMLElement} selector The element or the selector to convert.
         * @returns {object} Returns the object that can be used to manipulate the dialog
         */
        fromDocument: function (selector) {
            // TODO: Write implementation
        }
    };
});

