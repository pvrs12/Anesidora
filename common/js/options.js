if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
function init() {
    if (!document.location.href.endsWith("options.htm")) {
        return;
    }
    if (localStorage.themeInfo && localStorage.themeInfo !== "") {
        for (let key in JSON.parse(localStorage.themeInfo)) {
            document.documentElement.style.setProperty("--" + key, JSON.parse(localStorage.themeInfo)[key]);
        }
    }

    /** @type {HTMLIFrameElement} */
    const newView = document.getElementById("newView");
    /** @type {HTMLIFrameElement} */
    const oldView = document.getElementById("oldView");

    newView.width =
        oldView.width = "350px";
    newView.height = "450px";
    oldView.height = "100px";
    newView.addEventListener("load", () => {
        newView.contentDocument.documentElement.style.setProperty("--width", "350px");
        newView.contentDocument.documentElement.style.setProperty("--height", "450px");
    });
    oldView.addEventListener("load", () => {
        oldView.contentWindow.forceWidth = "350px";
        oldView.contentWindow.forceHeight = "350px";
        oldView.contentDocument.body.style.setProperty("--width", "350px");
        oldView.contentDocument.body.style.setProperty("--height", "100px");
        oldView.contentDocument.body.style.width = "350px";
        oldView.contentDocument.body.style.height = "100px";
    });
}
