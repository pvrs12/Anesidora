chrome.extension.onRequest.addListener(
        function (request, sender, sendResponse) {
            if (request == "getKeys") {
                sendResponse(GetJSONHotKeys());
            }
            else {
                sendResponse({}); // snub them.
            }
        });

function GetJSONHotKeys() {
    // Setup Play HotKey Option
    var playJSON;
    if (localStorage.hotkeyPlay) playJSON = localStorage.hotkeyPlay;
    else playJSON = '{"ctrl":false,"alt":false,"shift":false,"code":0}';

    // Setup Skip HotKey Option
    var skipJSON;
    if (localStorage.hotkeySkip) skipJSON = localStorage.hotkeySkip;
    else skipJSON = '{"ctrl":false,"alt":false,"shift":false,"code":0}';

    // Setup Like HotKey Option
    var likeJSON;
    if (localStorage.hotkeyLike) likeJSON = localStorage.hotkeyLike;
    else likeJSON = '{"ctrl":false,"alt":false,"shift":false,"code":0}';

    // Setup DisLike HotKey Option
    var dislikeJSON;
    if (localStorage.hotkeyDisLike) dislikeJSON = localStorage.hotkeyDisLike;
    else dislikeJSON = '{"ctrl":false,"alt":false,"shift":false,"code":0}';

    // Setup tired HotKey Option
    var tiredJSON;
    if (localStorage.hotkeyTired) tiredJSON = localStorage.hotkeyTired;
    else tiredJSON = '{"ctrl":false,"alt":false,"shift":false,"code":0}';

    var jsonObject = JSON.parse(
                '{' +
                '"play" : ' + playJSON + ',' +
                '"skip" : ' + skipJSON + ',' +
                '"like" : ' + likeJSON + ',' +
                '"dislike" : ' + dislikeJSON + ',' +
                '"tired" : ' + tiredJSON +
                '}');

    return jsonObject;
}