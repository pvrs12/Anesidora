/*globals chrome*/
/*exported platform_specific, get_browser, is_android*/

function is_android() {
    return false;
}

function platform_specific() {
    return undefined;
}

function get_browser() {
    return chrome;
}