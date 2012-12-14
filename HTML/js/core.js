jQuery(function ($) {
	// Start the scrollbar
	$(".scrolling").mCustomScrollbar({
		scrollButtons:{
			enable: false
		}
	});
	
	$('select').selectbox();
	$('input[type="checkbox"]').uniform();
	
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
});
