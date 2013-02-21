
var nodemailer = require("nodemailer"),
    senders = require('./senders'),
    util    = require('./util');

/**
 * Creates a new mailer object. A mailer object is simply a nodemailer transport with additional methods.
 * @param {string} senderId The sender ID is used to get the information about the sender of the mail. Please see the file senders.js
 * @returns {nodemailer.Transport} Returns a new nodemailer transport object
 */
module.exports = function () {
    var tp = nodemailer.createTransport("SMTP", {
        host: "email-smtp.us-east-1.amazonaws.com", // hostname
        secureConnection: true, // use SSL
        port: 465, // port for secure SMTP
        auth: {
            user: "AKIAIXTAB4M7NGEVFXGQ",
            pass: "Ah3oJ4GwezJzR0kTxwyooZL5bMmpz1RLCyhmPAX5pYVi"
        }
    });
    
    var sendMail = tp.sendMail;
    delete tp.sendMail;
    
    tp.send = function (senderId, mail, callback) {
        // Look for the sender
        var sender = senders[senderId],
            options;
        
        // Verify sender is permitted
        if(!sender) {
            return callback(0xB3A0);
        }
        
        // Verify we have all necessary stuff in the mail
        if(!mail.to || !mail.subject || (!mail.html && !mail.text)) {
            return callback(0xB3A1);
        }
        
        var msgId = '{0}.{1}@meeveep.dev'.format(util.generateKey(14), util.generateKey(24));
        
        options = {
            from: '{0} <{1}>'.format(sender.name, sender.email),
            forceEmbeddedImages: true,
            messageId: msgId
        };
        
        options.extendIfNotExists(mail);
        
        sendMail.call(tp, options, function (err, status) {
            if(err) {
                return callback(0xB3A2, err);
            }
            
            console.log(status);
            callback(null, status);
        });
    };
    
    return tp;
};

