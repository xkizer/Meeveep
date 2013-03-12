jQuery(function ($) {
    // Validation
    var validators = {
        firstName:  /^[a-z][a-z\-'\s]*$/i,
        lastName:   /^[a-z][a-z\-'\s]*$/i,
        password:   /^.{6,32}$/,
        email:      /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
        terms:      function () {return this.checked;},
        day:        bdayValidator,
        month:      bdayValidator,
        year:       bdayValidator
    };
    
    /**
     * Validates the birthday
     * @returns {Boolean}
     */
    function bdayValidator () {
        var day = form.find('[name="day"]').val(),
            month = form.find('[name="month"]').val(),
            year = form.find('[name="year"]').val();
        
        if(!day && !month && !year) {
            // None was filled...
            return true;
        }
        
        if(!day || !month || !year) {
            // Only some were filled
            return false;
        }
        
        var bday = parseInt(day),
            bmonth = parseInt(month),
            byear = parseInt(year);
        
        if(bday != day || bmonth != month || byear != year) {
            // At least one has an invalid value
            return false;
        }
        
        // Age check
        var now = new Date();
        
        if(byear > (now.getFullYear() - 8) || byear < (now.getFullYear() - 100)) {
            return false;
        }
        
        // Final validation
        var date = new Date();
        date.setDate(bday);
        date.setMonth(bmonth -1);
        date.setYear(byear);
        
        return (date.getDate() === bday && date.getMonth() === (bmonth - 1) && date.getFullYear() === byear);
    }
    
    var form = $('#personal-autograph-register form'),
        inputs = form.find(':input');
    
    inputs.on('blur keyup change', function () {
        var me = $(this),
            name = me.attr('name'),
            value = me.val();
        
        // Check if a validator exists
        if(validators[name]) {
            var validator = validators[name];
            
            if(validator instanceof RegExp) {
                if(!validator.test(value)) {
                    // Failed test
                    me.closest('form > div > div').addClass('invalid').removeClass('valid');
                } else {
                    me.closest('form > div > div').addClass('valid').removeClass('invalid');
                }
            } else if ('function' === typeof validator) {
                if(!validator.call(this, value)) {
                    // Failed test
                    me.closest('form > div > div').addClass('invalid').removeClass('valid');
                } else {
                    me.closest('form > div > div').addClass('valid').removeClass('invalid');
                }
            }
        }
    });
    
    // When the form is submitted, we do a general validation too
    form.on('submit', function () {
        inputs.trigger('change');
        
        // Check for invalid fields
        if(form.find('.invalid').length > 0) {
            // Form not properly filled...
            return false;
        }
    
        // Else, do some other things...
    });
});