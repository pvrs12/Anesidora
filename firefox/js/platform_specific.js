/*globals browser*/
/*exported platform_specific, get_browser*/

function platform_specific(browser) {
    var platform_promise = browser.runtime.getPlatformInfo();
    platform_promise.then(function (info) {
        var isAndroid = info.os === "android";
        if (!isAndroid) {
            browser.browserAction.setPopup({popup: "/popup.htm"});
        }
    });
    browser.browserAction.onClicked.addListener(() => {
        browser.tabs.create({
            url: "/popup.htm"
        });
    });
}

function get_browser() {
    return browser;
}