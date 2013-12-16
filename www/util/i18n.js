var error = require('../util/error.js')
    ;

// Available languages
var langPacks = {
    'en-us': 'English (US)',
    'en-gb': 'English (UK)',
    'de'   : 'German',
    'ig-ng': 'Igbo (Nigeria)',
};

/**
 * Get a list of all available language packs
 */
function getAvailableLaguages () {
    var langs = [];
    
    for(var i in langPacks) {
        if(langPacks.hasOwnProperty(i)) {
            langs.push({code: i, name: langPacks[i]});
        }
    }
    
    return langs;
}

/**
 * Get the content of the language file for the specified language
 * @param {string} lang The ID of the language
 * @param {function} callback The callback receives an error object and the language file
 */
function getLangFile (lang, callback) {
    if(!langExists(lang)) {
    //    return callback(error(0x3401));
        lang = "en-us";
    }
    
    var langFile = require('../lang/' + lang + '.js');
    return callback(null, langFile);
}

/**
 * Translate a text from one language to another
 * @param {string} text The text to translate
 * @param {string} fromLang The ID of the language to translate from
 * @param {string} toLang The ID of the language to translate to
 * @param {function} callback The callback receives an error object and the
 * translation results
 */
function translate (text, fromLang, toLang, callback) {
    getLangFile(fromLang, function (err, fromLang) {
        if(err) {
            return callback(err);
        }
        
        getLangFile(toLang, function (err, toLang) {
            if(err) {
                return callback(err);
            }
            
            var txtId = fromLang.indexOf(text);
            
            if(txtId.length > 0) {
                // Found
                return callback(null, toLang[txtId[0]]);
            }
            
            return callback(error(0x3405));
        });
    });
}

/**
 * Get a text content of a text ID in a language
 * Please avoid using this method unless you are retrieving a single text
 */
function getText (textId, lang, callback) {
    getLangFile(lang, function (err, lang) {
        if(err) {
            return callback(err);
        }
        
        return callback(null, lang[textId]);
    });
}

/**
 * Get a batch of language texts
 */
function getBatch(batch, lang, callback) {
    getLangFile(lang, function (err, lang) {
        if(err) {
            return callback(err);
        }
        
        var text = [];
        
        batch.forEach(function (e) {
            text.push(lang[e]);
        });
        
        return callback(null, text);
    });
}

/**
 * Check if a language exists
 */
function langExists (langId) {
    return (typeof langPacks[langId] !== 'undefined');
}

module.exports = {
    getAvailableLaguages: getAvailableLaguages,
    getLangFile: getLangFile,
    translate: translate,
    getText: getText,
    langExists: langExists,
    getBatch: getBatch
};

