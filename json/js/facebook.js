$('#fbCanDie').bind('load', function(){
    getAccessToken($(this).attr('src'));
}
chrome.tabs.onUpdated.addListener(
    function onTabUpdated(tabId, changeInfo, tab) {
        if (changeInfo.url && changeInfo.url.indexOf('https://www.facebook.com/connect/login_success.html') == 0) {
            getAccessToken(changeInfo.url);
            if (localStorage.facebookId == "") {
                $.ajax({
                    async: false,
                    url: "https://graph.facebook.com/" + localStorage.facebookUsername + "?" + localStorage.accessToken,
                    dataType: "json",
                    success: function (data) {
                        localStorage.facebookId = data.id;
                    }
                });
            }
            chrome.tabs.remove(tabId);
        }
    });
function getAccessToken(url) {
    var hashSplit = changeInfo.url.split('#');
    if (hashSplit.length > 1) {
        var paramsArray = hashSplit[1].split('&');
        for (var i = 0; i < paramsArray.length; i++) {
            var paramTuple = paramsArray[i].split('=');
            if (paramTuple.length > 1 && paramTuple[0] == 'access_token') {
                localStorage.accessToken = paramTuple[1];
                
            }
        }
    }
}
                        

 
