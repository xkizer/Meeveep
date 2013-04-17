jQuery(function ($) {
    var PICTURE_UPLOAD_URL = '/star/upload/image';
    var PICTURE_DELETE_URL = '/star/upload/image/remove/{0}/{1}';
    var PRODUCT_DELETE_URL = '/product/delete/{0}';
    var worker = new Worker('/js/blob-converter.js');
    var uploadId = String(Math.random() * 1E10) + String(Math.random() * 10E4);
    $('#personal-autograph-dashboard form').append($('<input type="hidden" name="uploadId">').val(uploadId));
    
    $('#personal-autograph-dashboard .file-upload').on('upload', function (e) {
        var me = $(this),
            canvas = e.canvas,
            data = e.imageData,
            msgId = Math.random(),
            blob, ords, ui8a, dataURI, type;
        
        dataURI = data.split(',');
        type = /data:(.*);/.exec(dataURI[0])[1];
        
        worker.onmessage = function (msg) {
            if(msg.data.id === msgId) {
                blob = msg.data.blob;
                
                var fData = new FormData();
                fData.append('uploadId', uploadId); // The upload ID will be used to associate picture with the star
                fData.append("img", blob);
                
                // Create the canvas where we will display the progress quadrant
                var li = $('<li class="loading" data-loaded="0">').appendTo('#dashboard-star-thumbnails ul'),
                    cnv = $('<canvas height="53" width="53">').appendTo(li)[0],
                    text = $('<span>').appendTo(li),
                    ctx = cnv.getContext('2d'),
                    shift = -Math.PI/2;
            
                function redraw() {
                    // Clear canvas
                    cnv.width = cnv.width * 1;

                    // Make us an arc
                    var loaded = li.attr('data-loaded'),
                        angle = loaded * Math.PI * 2;

                    ctx.beginPath();
                    ctx.lineWidth = 8;
                    ctx.strokeStyle = "#f75209";
                    ctx.arc(26, 26, 22, 0 - shift, angle - shift, false);
                    ctx.stroke();
                    text.text('%d%%'.printf(loaded * 100));
                };
                
                // Upload the image
                var xhr;
                
                $.ajax({
                    url: PICTURE_UPLOAD_URL,
                    type: 'post',
                    data: fData,
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    xhr: function() {
                        xhr = $.ajaxSettings.xhr();
                        
                        xhr.upload.onprogress = function (e) {
                            if (e.lengthComputable) {
                                 var complete = (e.loaded / e.total);
                                 li.attr('data-loaded', complete);
                                 redraw();
                            } 
                        };
                        
                        return xhr;
                    }
                }).complete(function () {
                    $(canvas).remove();
                    $(cnv).remove();
                    text.remove();
                }).done(function (data) {
                    // Convert li to something useful
                    var imgId = data.id;
                    li.data('imageId', imgId);
                    li.append(imageActionsMarkup);
                    var img = $('<img>').appendTo(li);
                    
                    // Resize the canvas to fit this image
                    var cnv = $('<canvas>').hide().appendTo('body');
                    var ctx = cnv[0].getContext('2d');
                    cnv.attr({width: 102, height: 105});
                    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, cnv[0].width, cnv[0].height);
                    var data = cnv[0].toDataURL();
                    img[0].src = data;
                    li.removeAttr('data-loaded').removeClass('loading');
                }).error(function (e) {
                    li.remove();
                    
                    if(e.status) {
                        // We reached the server, but process failed
                        alert('Upload failed: server error');
                    } else {
                        alert('Upload failed. Please check network connection');
                    }
                });
            }
        };
        
        worker.postMessage({id: msgId, data: atob(dataURI[1]), type: type});
    });

    // Set as profile picture
    $('#dashboard-star-thumbnails ul').delegate('.profile-pic', 'click', function (e) {
        e.preventDefault();
        
        // Look for the profile-pic element, or create it if not found
        var form = $('#personal-autograph-dashboard form'),
            profilePic = form.find('input[name="profile-pic"]');
        
        if(!profilePic.length) {
            // Not found
            profilePic = $('<input type="hidden" name="profile-pic">').appendTo(form);
        }
        
        profilePic.val($(this).closest('li').data('imageId'));
        
        // Hide the profile-pic link for this element and show for every other element
        $('#dashboard-star-thumbnails ul').find('.profile-pic').show();
        $(this).hide();
    });

    // Delete picture
    $('#dashboard-star-thumbnails ul').delegate('.delete', 'click', function (e) {
        e.preventDefault();
        
        var parent = $(this).closest('li'),
            imageId = parent.data('imageId');
        
        $.ajax({
            url: PICTURE_DELETE_URL.format(uploadId, imageId),
            dataType: 'json'
        }).error(function () {
            alert('Unable to delete image. Check network connection');
        }).done(function () {
            parent.remove();
        });
    });
    
    // Commercial autographs delete
    $('#commercial-autographs-list .delete').click(function (e) {
        // The container
        var li = $(this).closest('li').addClass('deleting'),
            productId = li.attr('data-product-id');
        
        // Attempt deleting the product
        $.ajax({
            url: PRODUCT_DELETE_URL.format(productId),
            dataType: 'json'
        }).error(function () {
            li.removeClass('deleting');
        }).done(function (d) {
            if(d.error) {
                li.removeClass('deleting');
            } else {
                li.remove();
            }
        });
        
        return false;
    });
    
    // Adding star, switching categories
    var catSelect = $('select#star-category');
    
    if(catSelect.length === 1 && window.categoryTree) {
        var subCatSelect = $('select#star-subcategory');
        
        // When the category is switched
        catSelect.on('change', function () {
            var subCats = categoryTree[this.value].subcategories;
            subCatSelect.empty();
            
            subCats.forEach(function (sub) {
                var option = $('<option>').attr('value', sub).text(sub).appendTo(subCatSelect);
                subCatSelect.selectbox('detach');
                subCatSelect.selectbox('attach');
            });
        }).change();
    }
    
    // When the form is submitted...
    $('#add-star-form').on('submit', function (e) {
        e.preventDefault();
        
        // Everything okay... move forward
        var form = this,
            data = $(this).serialize();
        
        $.ajax({
            url: '/star/add',
            type: 'post',
            dataType: 'json',
            data: data,
            error: function () {
                $(form).find('.error').text('Server error').show();
            },
            success: function (data) {
                if(data.error) {
                    $(form).find('.error').text(data.error).show();
                } else if(data.success) {
                    form.reset();
                    $.uniform.update('input[type="checkbox"]');
                    $('#dashboard-star-thumbnails ul').empty();
                    $(form).find('.error').hide();
                    Meeveep.dialog.create({
                        title: 'Star created!',
                        message: 'The star has been created. You can now create new products for the star.',
                        buttons: [
                            {
                                text: 'Okay »',
                                action: 'close'
                            },
                            {
                                text: 'Create product',
                                action: '/product/add'
                            }
                        ]
                    });
                }
            }
        });
    });
    
    // Delete star...
    $('.stars-list .delete').click(function (e) {
        e.preventDefault();
        
        var me = $(this),
            li = me.closest('li'),
            action = me.attr('href'),
            name = li.find('.name').text();
        
        var dialog = Meeveep.dialog.create({
            title: 'Confirm delete star',
            html: ('You are about to delete the star {0}. Please note that if you continue, the following will happen<ol>' +
                    "<li>{0}'s account will be deleted, meaning they will not be able to login again</li>" +
                    "<li>All autograph requests to {0} will be deleted, and inaccessible</li>" +
                    "<li>All autographs already signed by {0} will remain intact</li>" +
                    "<li>There is no way to undo this action</li>" +
                    '</ol> You still want to continue?').format(name),
            buttons: [
                {
                    text: 'Yes, delete star »',
                    action: function () {
                        li.addClass('deleting');
                        dialog.close();
                        
                        // Delete
                        $.ajax({
                            type: 'GET',
                            url: action,
                            dataType: 'json',
                            error: function () {
                                var dlg = Meeveep.dialog.create({
                                    title: 'Error deleting star',
                                    message: 'A network error has occured while trying to delete the star. Please check your Internet connection and try again.',
                                    buttons: [
                                        {
                                            text: 'Okay »',
                                            action: 'close'
                                        },
                                        {
                                            text: 'Retry',
                                            action: function () {
                                                me.click();
                                                dlg.close();
                                            }
                                        }
                                    ]
                                });
                                
                                li.removeClass('deleting')
                            },
                            success: function (data) {
                                if(data.error) {
                                    var dlg = Meeveep.dialog.create({
                                        title: 'Error deleting star',
                                        message: 'Could not delete star due to the following error: ' + (data.error.message || data.error),
                                        buttons: [
                                            {
                                                text: 'Okay »',
                                                action: 'close'
                                            },
                                            {
                                                text: 'Retry',
                                                action: function () {
                                                    me.click();
                                                    dlg.close();
                                                }
                                            }
                                        ]
                                    });

                                    li.removeClass('deleting');
                                    return;
                                }
                                
                                if(data.success) {
                                    li.animate({height: 0}, {complete: function () {
                                        li.remove();
                                    }})
                                }
                            }
                        });
                    }
                },
                {
                    text: 'Joking, never mind',
                    action: 'close'
                }
            ],
            width: 600
        });
    });
});
