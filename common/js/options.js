/*globals alert, get_browser*/

var min_width = 310;
var min_height = 50;
var min_history = 1;

var default_width = 350;
var default_height = 100;
var default_history = 5;

var refresh_button;
var default_button;
var logout_button;
var save_button;

var forceSecure;
var httpWarning_label;

var bodyWidth;
var bodyHeight;
var historyNum;

function secureWarning() {
    if (forceSecure.checked) {
        httpWarning_label.style.display = "none";
    } else {
        httpWarning_label.style.display = "block";
    }
}

function initBodySize() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    if (localStorage.historyNum === undefined || localStorage.historyNum === 0) {
        localStorage.historyNum = default_history;
    }
    if (localStorage.forceSecure === undefined) {
        localStorage.forceSecure = true;
    }

    bodyWidth.value = localStorage.bodyWidth;
    bodyHeight.value = localStorage.bodyHeight;
    historyNum.value = localStorage.historyNum;

    forceSecure.checked = localStorage.forceSecure !== "false" && localStorage.forceSecure;
    secureWarning();
}

document.addEventListener("DOMContentLoaded", function() {
    "use strict";

    refresh_button = document.getElementById("refresh");
    logout_button = document.getElementById("logout");
    default_button = document.getElementById("default");
    save_button = document.getElementById("save");

    forceSecure = document.getElementById("forceSecure");
    httpWarning_label = document.getElementById("httpWarning");

    bodyWidth = document.getElementById("bodyWidth");
    bodyHeight = document.getElementById("bodyHeight");
    historyNum = document.getElementById("historyNum");

    var background = get_browser().extension.getBackgroundPage();
    initBodySize();

    if (!forceSecure) {
        // only run the following when on options.htm
        return;
    }

    forceSecure.addEventListener("change", secureWarning);
    refresh_button.addEventListener("click", function () {
        background.getStationList();
    });
    default_button.addEventListener("click", function () {
        localStorage.bodyWidth = default_width;
        localStorage.bodyHeight = default_height;
        localStorage.historyNum = default_history;
        localStorage.forceSecure = true;
    
        bodyWidth.value = localStorage.bodyWidth;
        bodyHeight.value = localStorage.bodyHeight;
        historyNum.value = localStorage.historyNum;
        forceSecure.checked = localStorage.forceSecure;
    });
    logout_button.addEventListener("click", function () {
        localStorage.username = "";
        localStorage.password = "";
        localStorage.lastStation = "";
    });

    save_button.addEventListener("click", function () {
        if (bodyWidth.value < min_width) {
            localStorage.bodyWidth = min_width;
            alert("The width must be greater than or equal to " + min_width + "!");
            bodyWidth.value = min_width;
        } else {
            localStorage.bodyWidth = bodyWidth.value;
        }
        if (bodyHeight.value < min_height) {
            localStorage.bodyHeight = min_height;
            alert("The height must be greater than or equal to " + min_height + "!");
            bodyHeight = min_height;
        } else {
            localStorage.bodyHeight = bodyHeight.value;
        }
        if (historyNum.value < min_history) {
            localStorage.historyNum = min_history;
            alert("You must have at least " + min_history + " item" + min_history > 1
                ? "s"
                : "" + " in history");
            historyNum.value = min_history;
        } else {
            localStorage.historyNum = historyNum.value;
        }

        localStorage.forceSecure = forceSecure.checked;
    });
});
