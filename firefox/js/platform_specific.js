/*globals browser*/
/*exported platform_specific, get_browser, is_android*/

var isAndroid = false;

get_is_android();

function is_android() {
    return isAndroid;
}

function get_is_android() {
    let platform_promise = get_browser().runtime.getPlatformInfo();
    platform_promise.then(function (info) {
        isAndroid = info.os === "android";
    });
}

function is_chrome() {
    return false;
}

function platform_specific() {
    if (!is_android) {
        get_browser().browserAction.setPopup({popup: "/popup.htm"});
    }

    get_browser().browserAction.onClicked.addListener(() => {
        get_browser().tabs.create({
            url: "/popup.htm"
        });
    });
}

function get_browser() {
    return browser;
}