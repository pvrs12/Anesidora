/*globals defaults*/

function init() {
    "use strict";

    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = defaults.width[localStorage.player || defaults.player];
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = defaults.height[localStorage.player || defaults.player];
    }
    document.body.style.width = localStorage.bodyWidth + "px";
    document.body.style.height = localStorage.bodyHeight + "px";
    document.querySelector(".full").width = localStorage.bodyWidth + "px";
    document.querySelector(".full").height = localStorage.bodyHeight + "px";
    
    document.querySelector(".full").src = (localStorage.whichPlayer || "new") + ".htm";
    document.querySelector(".full").addEventListener("load", () => {
        document.body.style.opacity = 1;
    });
}
init();
