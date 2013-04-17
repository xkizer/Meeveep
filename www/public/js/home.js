jQuery(function ($) {
    /*
     * This is an ad-hoc function to handle the order confirmation on the home
     * page. Ideally, the order confirmation should be handled by the server.
     */
	var query = location.search.substr(1).split('&'),
        params = {};
    
    query.forEach(function (e) {
        e = e.split('=');
        
        if(!e[0]) {
            return;
        }
        
        params[e[0]] = e[1];
    });

    if(params.orderComplete) {
        // Order is complete
        var div = $('<div>')
            .appendTo('body')
            .text('Order complete. Order number is ' + params.orderComplete)
            .css({
                position: 'fixed',
                width: '100%',
                height: '20px',
                background: '#FB6',
                top: '0',
                left: 0,
                'text-align': 'center',
                'line-height': '20px'
            });
    }
    
    // Show the login screen if user is not logged in
    var userIcon = $('#icon-nav-profile'),
        loginBox = $('#user-info-box');
    
    if(loginBox.find('#login-form').length) {
        userIcon.click();
    }
    
    // When a category is selected in the search form...
    $('#personal-autographs-search [name="category"]').on('change', function (e) {
        $(this).closest('form').submit();
    });
});