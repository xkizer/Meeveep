jQuery(function ($) {
    var book1Ul = $('#book-select-star-img'),
        book1Li = book1Ul.find('li'),
        book1BigUl = $('#preview-slideshow .viewport ul'),
        book1BigLi = book1BigUl.find('li'),
        book1BigLiWidth = book1BigLi.width(),
        currentIndex = 0;
    
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
    
    $('#book1-next').click(function () {
        // Get the picture ID of the selected picture
        var selectedId = $(book1BigLi[currentIndex]).attr('data-id');
        window.location = 'step-2?cardId=' + selectedId;
    });

    $(window).resize(function () {
        book1BigLiWidth = book1BigLi.width();
    });
    
    book1BigUl.width(book1BigLiWidth * book1BigLi.length);
    switchTo(currentIndex);
});