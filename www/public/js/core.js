jQuery(function ($) {
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
});
