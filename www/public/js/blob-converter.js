(function (){
    function toBlob(dataURI, type, identifier) {
        var ords = Array.prototype.map.call(dataURI, function (x) {
            return x.charCodeAt(0) & 0xff;
        });
        
        var ui8a = new Uint8Array(ords);
        var blob = new Blob([ui8a], {type: type});
        postMessage({blob: blob, id: identifier});
    }
    
    self.onmessage = function (msg) {
        var data = msg.data.data,
            id = msg.data.id,
            type = msg.data.type;
        
        if(data) {
            toBlob(data, type, id);
        }
    };
})();