jQuery(function ($) {
    var PICTURE_UPLOAD_URL = 'star/upload/image';
    var PICTURE_DELETE_URL = 'star/upload/image/remove/{0}/{1}';
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
                    contentType: 'multipart/form-data',
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
                    me.off('upload');
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
                }).error(function () {
                    li.remove();
                    alert('Upload failed. Please check network connection');
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
});
