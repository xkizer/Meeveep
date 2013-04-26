jQuery(function ($) {
    var book1Ul = $('#book-select-star-img'),
        book1Li = book1Ul.find('li'),
        book1BigUl = $('#preview-slideshow .viewport ul'),
        book1BigLi = book1BigUl.find('li'),
        book1BigLiWidth = book1BigLi.width(),
        currentIndex = 0;
    
    // Process query string
    var queryString = location.search.substr(1),
            urlObj = {};
    
    queryString.split('&').forEach(function (pair) {
        if(!pair) {
            return;
        }

        pair = pair.split('=');
        urlObj[pair[0]] = pair[1] || '';
    });
    
    // Card selection
    book1Li.each(function (i) {
        $(this).data('id', i);
    }).click(function () {
        var me = $(this),
            id = me.data('id');
        
        switchTo(id);
    });
    
    book1BigLi.each(function (i) {
        $(this).data('id', i);
    });
    
    book1BigUl.scroll = function (i) {
        if(i < 0 || i >= book1BigLi.length) {
            return false;
        }
        
        var me = $(this);
        me.animate({left: i * book1BigLiWidth * -1}, {duration: 400})
        $('#book1-card-number').text(i+1);
		
		// Shoot out an event
		book1BigUl.trigger($.Event('scrolled', {position: i}));
		
		return true;
    };
    
    book1Ul.activate = function (i) {
        if(i < 0 || i >= book1Li.length) {
            return false;
        }
        
        book1Li.removeClass('current');
        $(book1Li[i]).addClass('current');
    };
    
    function switchTo(i) {
        // Scroll the big preview
        var t = book1BigUl.scroll(i);
        var p = book1Ul.activate(i);
        
        // If at least one succeeded...
        if(t !== false || p !== false) {
            currentIndex = i;
        }
    }

    $('#preview-slideshow .nav a').click(function (e) {
        e.preventDefault();
        var direction = $(this).attr('rel') === 'prev' ? -1 : 1;
        switchTo(currentIndex + direction);
    });
    
    if(book1BigUl.length) {
        book1BigUl[0].recalculate = function () {
            // Take care of the container's width
            book1BigLi = book1BigUl.find('li');
            var numLis = book1BigLi.length;
            book1BigUl.width(book1BigLiWidth * numLis);
            $('#book1-card-total').text(numLis);
        };

        book1BigUl[0].recalculate();
    }
    
    // Activate an initial card
    var cardId = urlObj.cardId || null;
    
    if(cardId) {
        var card = $('#preview-slideshow li[data-id="' + cardId + '"]');
        
        if(card.length === 1) {
            currentIndex = card.data('id');
        }
    }
    
    (function () {switchTo(currentIndex);}).defer(100);
    
    // Step 1 submission
    $('#book1-next, #book1-prev').click(function (e) {
        e.preventDefault();
        
        var selectedId = $(book1BigLi[currentIndex]).attr('data-id'),
            next = $(this).attr('data-next') || 'step-2';
        
        urlObj['cardId'] = selectedId;
        
        // Build url
        var search = [];
        
        for(var i in urlObj) {
            if(urlObj.hasOwnProperty(i)) {
                search.push(i + '=' + urlObj[i]);
            }
        }
        
        location.href = next + '?' + search.join('&');
    });

    $(window).resize(function () {
        book1BigLiWidth = book1BigLi.width();
    });
    
    // Setp 2
    
    // Pen color switching
    var penColors = $('#book2-side-form .pen-color');
    
    penColors.click(function (e) {
        var target = $(e.target);
        penColors.removeClass('active');
        target.addClass('active');
    });

    function showError(element) {
        var fn = function () {
            // No check for validity. Once element is changed, remove error
            element.removeClass('has-error');
        };
        
        element = $(element);
        element.addClass('has-error');
        element.on('change', fn);
    }
    
    // Page 2 submit
    $('#book2-next,#book2-prev').click(function (e) {
        e.preventDefault();
        
        var name = $('#book2-name').val(),
            msg = $('#book2-msg').val(),
            penColor = $('#book2-side-form .pen-color.active').attr('data-color'),
            next = $(this).attr('data-next') || 'step-3';
        
        // A little validation
        if(!name.trim()) {
            return showError('#book2-name');
        }
    
        if(msg.itrim().length < 10) {
            return showError('#book2-msg');
        }
    
        urlObj['name'] = encodeURIComponent(name);
        urlObj['msg'] = encodeURIComponent(msg);
        urlObj['pen-color'] = encodeURIComponent(penColor);
        
        // Build url
        var search = [];
        
        for(var i in urlObj) {
            if(urlObj.hasOwnProperty(i)) {
                search.push(i + '=' + urlObj[i]);
            }
        }
        
        location.href = next + '?' + search.join('&');
    });

    // Third and final step
    $('#order-checkout, #book3-next, #book3-prev').click(function(e) {
        e.preventDefault();
        
        var paymentMethod = $('#payment-method select').val(),
            termsAgreed = $('#payment-method2 [name="terms_agree"]')[0].checked,
//            receiveNlt = $('#payment-method2 [name="recieve_newsletter"]')[0].checked,
            next = $(this).attr('data-next') || 'step-4';
        
        if(!termsAgreed && next === 'step-4') {
            showError($('#payment-method2 [name="terms_agree"]').closest('label').closest('span'));
            return;
        }
        
        urlObj['payment-method'] = encodeURIComponent(paymentMethod);
        urlObj['accepted-terms'] = encodeURIComponent(termsAgreed);
        //urlObj['newsletter'] = encodeURIComponent(receiveNlt);
        
        // Build url
        var search = [];
        
        for(var i in urlObj) {
            if(urlObj.hasOwnProperty(i)) {
                search.push(i + '=' + urlObj[i]);
            }
        }
        
        location.href = next + '?' + search.join('&');
    });
    
    // Edit billing address
    $('#billing-edit').click(function (e) {
        e.preventDefault();
        
        var currentUrl = location.pathname + location.search;
        window.location = '/account/billing/edit?done=' + encodeURIComponent(currentUrl);
    });
    
    // Check if the user has billing information set
    if(!$('#billing-info-address').text().trim()) {
        // User has no billing information, force billing information edit
        $('#billing-edit').click();
    }
});
