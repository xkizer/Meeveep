// Pre-configs
(function () {
    jQuery.mobile.defaultPageTransition = 'slide';
})();

jQuery(function ($) {
    var doc = $(document);
    
    function showError(message, duration) {
        $( "<div class='ui-loader ui-overlay-shadow ui-body-e ui-corner-all'><h3>" + message + "</h3></div>" )
            .css({ "display": "block", position: 'static', "opacity": 0.96, left: 0, padding: '10px' })
            .appendTo( $('<div>').appendTo($.mobile.pageContainer).css({'padding': '0 20px', position: 'fixed', "top": 100}) )
            .delay( duration || 2200 )
            .fadeOut( 400, function() {
                $( this ).remove();
            });
    }
    
    function buildQuery(obj) {
        var urlData = [];

        for(var i in obj) {
            if(obj.hasOwnProperty(i)) {
                urlData.push(i + '=' + obj[i]);
            }
        }
        
        return urlData.join('&');
    }
    
    // pagechange events
    var pageChangeEvents = {
        order: function (data) {
            // Process query string, and form submission
            var query = $(data.toPage).data('pageData'),
                productId = query.productId;
            
            if(!productId) {
                // No product ID provided, go back to the list
                $.mobile.changePage('#autographs-list');
                return;
            }
            
            $.mobile.showPageLoadingMsg();
            
            // Get the cards associated with the star associated with the card
            $.ajax({
                url: '/product/{0}/getCards'.format(productId),
                type: 'get',
                dataType: 'json',
                error: function () {
                    showError('Unable to load cards. Please try again later.');
                },
                success: function (data) {
                    var cardsViewport = $('#order-choose-card'),
                        ul = cardsViewport.find('ul');
                    
                    data.forEach(function (dt) {
                        var li = $('<li data-card-id="{0}"><img src="{1}" /></li>'.format(dt.cardId, dt['340x227']));
                        li.appendTo(ul);
                    });
                },
                complete: function () {
                    $.mobile.hidePageLoadingMsg();
                }
            });
            
            $(data.toPage).find('.next').off('click').on('click', function (e) {
                // Get current card
                var card = $('#order-choose-card li.active');
                
                if(card.length !== 1) {
                    // No card selected
                    return;
                }
                
                query.cardId = card.attr('data-card-id');
                var qry = buildQuery(query);
                $.mobile.changePage('#order-2?' + qry);
            });
        },

        'order-2': function (data) {
            var page = $(data.toPage),
                query = page.data('pageData'),
                productId = query.productId;
            
            if(!productId) {
                // No product ID provided, go back to the list
                $.mobile.changePage('#autographs-list');
                return;
            }
            
            page.find('.pen-color').each(function () {
                var me = $(this);
                me.height(me.width());
            });
            
            page.find('.next').off('click').on('click', function (e) {
                var _for = page.find('[name="for"]').val(),
                    msg = page.find('textarea[name="message"]').val(),
                    color = page.find('.pen-color.active').attr('data-color');
                
                if(_for.length < 2) {
                    page.find('[name="for"]').parent('.ui-input-text').addClass('invalid');
                    return;
                } else {
                    page.find('[name="for"]').parent('.ui-input-text').removeClass('invalid');
                }
                
                if(msg.length < 10) {
                    page.find('textarea[name="message"]').addClass('invalid');
                    return;
                } else {
                    page.find('textarea[name="message"]').removeClass('invalid');
                }
                                
                
                query['pen-color'] = color;
                query['name'] = _for;
                query['msg'] = msg;
                
                // Next
                var qry = buildQuery(query);
                $.mobile.changePage('#order-3?' + qry);
            });
        },
        
        'order-3': function (data) {
            var page = $(data.toPage),
                query = page.data('pageData'),
                productId = query.productId,
                price = query.price;
            
            if(!productId) {
                // No product ID provided, go back to the list
                $.mobile.changePage('#autographs-list');
                return;
            }
            
            page.find('.price').text(Number(price).toFixed(2));
            
            page.find('button').off('click').on('click', function (e) {
                var paymentMethod = page.find('select[name="payment-method"]').val(),
                    termsAccepted = page.find('input[name="terms-accepted"]'),
                    receiveNlt = page.find('input[name="newsletter"]');
                
                query['payment-method'] = paymentMethod;
                query['accepted-terms'] = termsAccepted[0].checked;
                query['newsletter'] = receiveNlt[0].checked;
                
                if(!query['accepted-terms']) {
                    // Terms needs to be accepted
                    termsAccepted.closest('.ui-checkbox').addClass('invalid');
                    return;
                }
                
                termsAccepted.closest('.ui-checkbox').removeClass('invalid');
                
                $.mobile.showPageLoadingMsg();
                
                // Submit data
                $.ajax({
                    url: '/order/place',
                    type: 'post',
                    dataType: 'json',
                    data: query,
                    error: function () {
                        showError('Unable to place order. Please try again later.');
                    },
                    success: function (data) {
                        if(data.error) {
                            alert(data.error);
                        } else {
                            alert('Order placed');
                            $.mobile.changePage('#home?orderId=data.orderId');
                        }
                    },
                    complete: function () {
                        $.mobile.hidePageLoadingMsg();
                    }
                });
            });
        }
    };
    
    // pagebeforechange events
    var beforePageChangeEvents = {
        
    };
    
    // pagebeforecreate events
    var pageBeforeCreateEvents = {
        
    };
    
    var pageCreateEvents = {
        'autographs-list': function (e) {
            // Attach the events for the search box
            var catSelector = $('#autographs-list-category-selector'),
                searchBox = $('#autographs-list-search'),
                updateTimeout, waitTime = 400;
            
            catSelector.on('change', updateResultsTimeout);
            searchBox.on('keyup', updateResultsTimeout);
            
            function updateResultsTimeout () {
                if(updateTimeout) {
                    window.clearTimeout(updateTimeout);
                }
                
                updateTimeout = window.setTimeout(updateResults, waitTime);
            }
            
            function updateResults () {
                // Build query
                var qry = {
                    limit: 30
                };
                
                if(searchBox.val().trim()) {
                    qry['q'] = searchBox.val().trim();
                }
                
                if(catSelector.val()) {
                    qry['category'] = catSelector.val();
                }
                
                $.mobile.showPageLoadingMsg();
                
                $.ajax({
                    url: '/search?' + buildQuery(qry),
                    type: 'get',
                    dataType: 'json',
                    error: function () {
                        showError('Unable to load search results. Please try again later.');
                    },
                    success: function (data) {
                        var ul = $('#autographs-list-items');
                        
                        ul.find('li').each(function () {
                            $(this).remove();
                        });
                        
                        var media = ['video', 'audio', 'hq'];
                        
                        data.forEach(function (dt) {
                            var li = $('<li class="stripe dark"><img class="left" src="{0}"><div class="left"><h3>{1}</h3><h4>%.02f€</h4><div class="includes"></div><a class="book ui-link" href="#order?productId={2}&price=%.02f"></a></div><span class="cl"></span></li>'
                                        .format(dt.thumbnail, dt.name, dt.productId).printf(dt.price, dt.price));
                            
                            var inc = li.find('.includes'),
                                incls = dt.includes;
                            
                            incls.forEach(function (medium) {
                                if(media.indexOf(medium)) {
                                    inc.append('<span class="' + medium + '">');
                                }
                            });
                            
                            li.appendTo(ul);
                        });
                    },
                    complete: function () {
                        $.mobile.hidePageLoadingMsg();
                    }
                });
            }
            
            // Update the star list once when the page is loaded
            updateResults();
        },
        
        'order-2': function (e) {
            var penColors = $(e.target).find('.pen-color');
            
            penColors.click(function (e) {
                penColors.not(this).removeClass('active');
                $(this).addClass('active');
                e.stopPropagation();
            });
        },
        
        order: function (e) {
            var ul = $(e.target).find('#order-choose-card ul');
            ul.delegate('li', 'click', function (e) {
                ul.find('li').not(this).removeClass('active');
                $(this).addClass('active');
                e.stopPropagation();
            });
        }
    };
    
    // Page init events
    var pageInitEvents = {
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
                return pageBeforeCreateEvents[pageName](data);
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
    
    // Before page create
    (function () {
        function pageCreate (e) {
            var page = e.target;
            var pageId = $(page).attr('id');
            
            if(pageCreateEvents[pageId]) {
                return pageCreateEvents[pageId](e);
            }
        }

        doc.bind('pagecreate', pageCreate);
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
            
