/*globals defaults*/

var previewLoaded = false;
var preview = document.getElementById("preview");
// var localStorage = get_browser().extension.getBackgroundPage().localStorage;

var themeInfo = (localStorage.themeInfo !== undefined ? JSON.parse(localStorage.themeInfo) : undefined);
if (themeInfo === undefined) {
    themeInfo = defaults.theme;
    localStorage.themeInfo = JSON.stringify(themeInfo);
}

function initPreview() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = defaults.width[localStorage.player || defaults.player];
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = defaults.height[localStorage.player || defaults.player];
    }
    preview.style.width = localStorage.bodyWidth * 4 + "px";
    preview.style.height = localStorage.bodyHeight + "px";
    preview.style.transform = "scale("+ (window.innerWidth * 0.8)/(localStorage.bodyWidth * 4) + ")";
    
    preview.src = "new.htm";
    preview.addEventListener("load", () => {
        preview.style.opacity = 1;
        previewLoaded = true;
        setTimeout(() => {
            preview.contentWindow.goToPanel(0);
        }, 0);
    });
    
}

var controls = {};
function initControls() {
    for (let i = 0; i < themeItems.length; i++) {
        let a = {};
        a.elem = document.createElement("div");
        a.elem.classList.add("themeControl");
        document.getElementById("themeControlsHolder").appendChild(a.elem);
        a.label = document.createElement("label");
        a.elem.appendChild(a.label);
        a.label.innerText = themeItems[i].name;
        a.desc = document.createElement("span");
        a.desc.innerText = themeItems[i].desc;
        a.elem.appendChild(a.desc);
        a.input = document.createElement("input");
        a.elem.appendChild(a.input);
        if (themeItems[i].type && themeItems[i].type !== "") {
            a.input.setAttribute("type", themeItems[i].type);
        }
        let currItem = themeItems[i];
        a.input.value = themeInfo[themeItems[i].property];
        a.input.addEventListener("input", () => {
            setVar(currItem.property, currItem.func(a.input.value));
            themeInfo[currItem.property] = a.input.value;
        });
        a.item = themeItems[i];
        controls[a.item.property] = a;
    }

    document.getElementById("default").addEventListener("click", () => {
        themeInfo = defaults.theme;
        for (let key in themeInfo) {
            setVar(key, themeInfo[key]);
            controls[key].input.value = themeInfo[key];
        }
    });

    document.getElementById("save").addEventListener("click", () => {
        localStorage.themeInfo = JSON.stringify(themeInfo);
    });
}

function setVar(cssVar, value) {
    if (!previewLoaded) {
        return;
    }
    preview.contentDocument.documentElement.style.setProperty("--" + cssVar, value);
}

var themeItems = [
    {
        "name": "Background",
        "desc": "The background of the player.",
        "property": "background",
        "type": "color",
        "func": function(a) { return a; }
    },
    {
        "name": "Font",
        "desc": "What font will be used through the player.",
        "property": "font-family",
        "func": function(a) { return a.trim(); }
    },
    {
        "name":"Font Size",
        "desc": "The size of the font used in the player.",
        "property": "font-size",
        "func": function(a) { return a; }
    },
    {
        "name": "Text Color",
        "desc": "The color of the text in the player.",
        "type": "color",
        "property": "text-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Secondary Text Color",
        "desc": "The color of the text used in low-contrast areas.",
        "type": "color",
        "property": "inverse-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Accent Color",
        "desc": "The color used in accents in the player.",
        "type": "color",
        "property": "accent-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Focused Input Accent Color",
        "desc": "The color of borders of focused inputs.",
        "type": "color",
        "property": "accent-color-darker",
        "func": function(a) { return a; }
    },
    {
        "name": "Tab Size",
        "desc": "The width of the buttons used to switch which panel you\"re on.",
        "property": "tabSize",
        "func": function(a) { return a; }
    },
    {
        "name": "Warning Color",
        "desc": "The color of the text used for warnings in the player.",
        "type": "color",
        "property": "warning-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Warning Background",
        "desc": "The background used for warnings in the player.",
        "type": "color",
        "property": "warning-bgcolor",
        "func": function(a) { return a; }
    },
    {
        "name": "Album Background",
        "desc": "The background for albums that use the default cover image.",
        "type": "color",
        "property": "album-bg",
        "func": function(a) { return a; }
    },
    {
        "name": "Button Color",
        "desc": "The color of the buttons on the player.",
        "type": "color",
        "property": "button-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Active Button Color",
        "desc": "The color of active buttons - for example, if a song is liked, the like button will be this color.",
        "type": "color",
        "property": "active-button-color",
        "func": function(a) { return a; }
    },
    {
        "name": "Default Album Color",
        "desc": "The color of the default album cover.",
        "type": "color",
        "property": "album-color",
        "func": function(a) { return a; }
    }
];

function export2json() {
    let data = JSON.parse(JSON.stringify(themeInfo)); // dereference
    data["A comment to power-users"] = "You can set backgrounds to an image by setting 'background' or 'album-bg' to \"url('/path-to-image')\".";    
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
    }));
    a.setAttribute("download", "theme.json");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
document.getElementById("import").addEventListener("change", handleFileSelect, false);
document.getElementById("export").addEventListener("click", export2json);

function handleFileSelect(event){
    const reader = new FileReader();
    reader.onload = handleFileLoad;
    reader.readAsText(event.target.files[0]);
}

function handleFileLoad(event){
    //verify file
    let res = event.target.result;
    try {
        JSON.parse(res);
    } catch(e) {
        alert("Invalid file: " + e);
        return;
    }
    let resParsed = JSON.parse(res);
    for (let key in themeInfo) {
        if (!Object.prototype.hasOwnProperty.call(resParsed, key)) {
            alert("File is missing property: " + key);
            return;
        }
        if (themeInfo[key].type && themeInfo[key].type == "color" && !(/^#([0-9A-F]{3}){1,2}$/i.test(resParsed[key]))) {
            alert(`${key}: Please use hex color codes, not "${resParsed[key]}"`);
            return;
        }
    }

    // update the page inputs and the CSS variables
    for (let key in themeInfo) {
        setVar(key, resParsed[key]);
        controls[key].input.value = resParsed[key];
    }
    themeInfo = resParsed;
}

initPreview();
initControls();
