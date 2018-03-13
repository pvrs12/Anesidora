/*globals InputKey, OutputKey*/
/*exported decrypt, encrypt*/

var mod = Math.pow(2, 32);

function decrypt(string) {
    var dec = decodeFromHex(string);
    var ret = [];
    for (var i = 0; i < (dec.length); i += 8) {
        var l = ((dec.charCodeAt(i) << 24) | (dec.charCodeAt(i + 1) << 16) | (dec.charCodeAt(i + 2) << 8) | (dec.charCodeAt(i + 3))) >>> 0;
        var r = ((dec.charCodeAt(i + 4) << 24) | (dec.charCodeAt(i + 5) << 16) | (dec.charCodeAt(i + 6) << 8) | (dec.charCodeAt(i + 7))) >>> 0;
        for (var j = InputKey["n"] + 1; j > 1; j--) {
            l = (l ^ InputKey["p"][j]) >>> 0;
            var a = (l & 0xFF000000) >>> 24;
            var b = (l & 0x00FF0000) >>> 16;
            var c = (l & 0x0000FF00) >>> 8;
            var d = (l & 0x000000FF);
            var f = (InputKey["s"][0][a] + InputKey["s"][1][b]) % mod;
            f = (f ^ InputKey["s"][2][c]) >>> 0;
            f = f + InputKey["s"][3][d];
            f = ((f % mod) & 0xFFFFFFFF) >>> 0;
            r = r ^ f;
            var temp = l;
            l = r;
            r = temp;
        }
        temp = l;
        l = r;
        r = temp;

        r = r ^ InputKey["p"][1];
        l = l ^ InputKey["p"][0];

        ret += String.fromCharCode((l / Math.pow(2, 24)) & 0xff);
        ret += String.fromCharCode((l / Math.pow(2, 16)) & 0xff);
        ret += String.fromCharCode((l / Math.pow(2, 8)) & 0xff);
        ret += String.fromCharCode(l & 0xff);

        ret += String.fromCharCode((r / Math.pow(2, 24)) & 0xff);
        ret += String.fromCharCode((r / Math.pow(2, 16)) & 0xff);
        ret += String.fromCharCode((r / Math.pow(2, 8)) & 0xff);
        ret += String.fromCharCode(r & 0xff);

    }
    return ret;
}

function encrypt(string) {
    var blocks = (string.length / 8);
    var ret = [];
    for (var h = 0; h < blocks; h++) {
        var i = h << 3; //h << 3;
        var l = ((string.charCodeAt(i) << 24) | (string.charCodeAt(i + 1) << 16) | (string.charCodeAt(i + 2) << 8) | (string.charCodeAt(i + 3))) >>> 0;
        var r = ((string.charCodeAt(i + 4) << 24) | (string.charCodeAt(i + 5) << 16) | (string.charCodeAt(i + 6) << 8) | (string.charCodeAt(i + 7))) >>> 0;
        for (var j = 0; j < OutputKey["n"]; j++) {
            l = (l ^ OutputKey["p"][j]) >>> 0;
            var a = (l & 0xFF000000) >>> 24;
            var b = (l & 0x00FF0000) >>> 16;
            var c = (l & 0x0000FF00) >>> 8;
            var d = (l & 0x000000FF);
            var f = (OutputKey["s"][0][a] + OutputKey["s"][1][b]) % mod;
            f = (f ^ OutputKey["s"][2][c]) >>> 0;
            f = f + OutputKey["s"][3][d];
            f = ((f % mod) & 0xFFFFFFFF) >>> 0;
            r = (r ^ f) >>> 0;
            var temp = l;
            l = r;
            r = temp;
        }
        temp = l;
        l = r;
        r = temp;
        r = (r ^ OutputKey["p"][OutputKey["n"]]) >>> 0;
        l = (l ^ OutputKey["p"][OutputKey["n"] + 1]) >>> 0;

        ret += String.fromCharCode((l / Math.pow(2, 24) & 0xff));
        ret += String.fromCharCode((l / Math.pow(2, 16) & 0xff));
        ret += String.fromCharCode((l / Math.pow(2, 8) & 0xff));
        ret += String.fromCharCode((l & 0xff));

        ret += String.fromCharCode((r / Math.pow(2, 24) & 0xff));
        ret += String.fromCharCode((r / Math.pow(2, 16) & 0xff));
        ret += String.fromCharCode((r / Math.pow(2, 8) & 0xff));
        ret += String.fromCharCode((r & 0xff));
    }
    return encodeToHex(ret);
}
function encodeToHex(str) {
    var r = "";
    var e = str.length;
    var c = 0;
    var h;
    while (c < e) {
        h = str.charCodeAt(c++).toString(16);
        while (h.length < 2) h = "0" + h;
        r += h;
    }
    return r;
}
function decodeFromHex(str) {
    var r = "";
    for (var i = str.length; i >= 1; i -= 2) {
        r = String.fromCharCode("0x" + str.substring(i - 2, i)) + r;
    }
    return r;
}
