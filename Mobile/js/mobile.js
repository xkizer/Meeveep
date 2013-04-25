// Pre-configs
(function () {
	jQuery.mobile.defaultPageTransition = 'slide';
})();

jQuery(function ($) {
    var doc = $(document);
    
    // pagechange events
    var pageChangeEvents = {
        order: function () {
            var cardsViewport = $('#order-choose-card');
            var lis = cardsViewport.find('li');
            var liCount = lis.length;
            var width = cardsViewport.outerWidth();
            lis.width(width);
            cardsViewport.find('ul').width(liCount * width);
        },

        'order-2': function () {
            $('.pen-color').each(function () {
                var me = $(this);
                me.height(me.width());
            });
        }
    };
    
    // pagebeforechange events
    var beforePageChangeEvents = {
        
    };
    
    // pagebeforecreate events
    var pageBeforeCreateEvents = {
        
    };
    
    // Page init events
    var pageInitEvents = {
        order: function (data) {
            console.log(data);
        }
    };
    
    // Login box
    (function () {
        $('body').delegate('a[href="#login"]', 'click', function (e) {
            var loginBox = $('#login-box');

            if(loginBox.css('display') === 'none') {
                loginBox.css('display', 'block');
            } else {
                loginBox.css('display', 'none');
            }

            return false;
        });
    })();
    
    // Page before create events
    (function (win) {
        // We hold the header and footer in memory and duplicate for every new page
        var $header = $('#header-main');
        var $footer = $('#footer-main');
        $header.remove();
        $footer.remove();

        var changePage = function(e, data) {
            // Configure the header
            var page = e.target,
                pageName = page.id;
                
            $header.clone().attr('id', 'header-' + pageName).prependTo(page);
            $footer.clone().attr('id', 'footer-' + pageName).appendTo(page);
            
            // Process event listeners
            if(pageBeforeCreateEvents[pageName]) {
                return pageChangeEvents[pageName](data);
            }
        };

        doc.bind('pagebeforecreate', changePage);
    })(this);
    
    // Page change events
    (function () {
        function pageChanged (e, data) {
            var pageId = data.toPage.attr('id');

            if(pageChangeEvents[pageId]) {
                return pageChangeEvents[pageId](data);
            }
        }

        doc.bind('pagechange', pageChanged);
    })();
    
    // Page before change events
    (function () {
        function beforePageChanged (e, data) {
            var page = data.toPage;
            
            if(!page.attr) { // Not what we're seeking
                return;
            }
            
            var pageId = page.attr('id');
            
            if(beforePageChangeEvents[pageId]) {
                return pageChangeEvents[pageId](data);
            }
        }

        doc.bind('pagebeforechange', beforePageChanged);
    })();
    
    // Page init events
    (function () {
        function pageInit (e, data) {
            var pageId = $(e.target).attr('id');
            
            if(pageInitEvents[pageId]) {
                return pageInitEvents[pageId].call(e.target, e);
            }
        }

        doc.bind('pageinit', pageInit);
    })();
});
			
