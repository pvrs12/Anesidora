$(document).ready(function () {
    var background = chrome.extension.getBackgroundPage();
    $('#lastFmStatus').hide();
    $('#lastFmLogin').hide();
    if (localStorage.notifications == "true") {
        $('#notifications').attr('checked', true);
    }
    if (localStorage.autostations == "true") {
        $('#autostations').attr('checked', true);
    }
    if (localStorage.lastFm == "true") {
        $('#lastFmToggle').attr('checked', true);
        if (localStorage.lastFmSession) {
            $('#lastFmStatus').text("Scrobbling as " + localStorage.lastFmUsername).show();
        }
        else {
            $('#lastFmLogin').show();
        }
    }
    $('#reset').bind('click', function () {
        localStorage.username = '';
        localStorage.password = '';
        localStorage.lastStation = '';
    });
    $('#notifications').bind('change', function () {
        if ($(this).attr('checked')) {
            localStorage.notifications = true;
        }
        else {
            localStorage.notifications = false;
        }
    });
    $('#autostations').bind('change', function () {
        if ($(this).attr('checked')) {
            localStorage.autostations = true;
        }
        else {
            localStorage.autostations = false;
        }
    });
    $('#lastFmToggle').bind('change', function () {
        if ($(this).attr('checked')) {
            localStorage.lastFm = true;
            if (localStorage.lastFmSession) {
                $('#lastFmStatus').text("Scrobbling as " + localStorage.lastFmUsername).show();
            }
            else {
                $('#lastFmLogin').show();
            }
        }
        else {
            localStorage.lastFm = false;
            $('#lastFmStatus').hide();
            $('#lastFmLogin').hide();
        }
    });
    $('#lastFmForm').bind('submit', function () {
        background.lastFmSession($('#lastFmUsername').val(), $('#lastFmPassword').val());
        if (localStorage.lastFmSession) {
            $('#lastFmLogin').hide();
            $('#lastFmStatus').text("Scrobbling as " + localStorage.lastFmUsername).show();
        }
        else {
            $('#lastFmLogin').show();
        }
        return false;
    });
    $('#facebookForm').bind('submit', function () {
        localStorage.facebookUsername = $('#facebookUsername').val();
        window.open("https://www.facebook.com/dialog/oauth?client_id=124332377700986&response_type=token&scope=publish_stream&redirect_uri=https://www.facebook.com/connect/login_success.html");
    });

    // Setup Play HotKey Option
    if (localStorage.hotkeyPlay) LoadHotKeyTextValue($('#play'), JSON.parse(localStorage.hotkeyPlay));
    $('#play').bind('keydown', function (e) {
        localStorage.hotkeyPlay = SetHotKey($('#play'), e);
    });

    // Setup Skip HotKey Option
    if (localStorage.hotkeySkip) LoadHotKeyTextValue($('#skip'), JSON.parse(localStorage.hotkeySkip));
    $('#skip').bind('keydown', function (e) {
        localStorage.hotkeySkip = SetHotKey($('#skip'), e);
    });

    // Setup Like HotKey Option
    if (localStorage.hotkeyLike) LoadHotKeyTextValue($('#like'), JSON.parse(localStorage.hotkeyLike));
    $('#like').bind('keydown', function (e) {
        localStorage.hotkeyLike = SetHotKey($('#like'), e);
    });

    // Setup DisLike HotKey Option
    if (localStorage.hotkeyDisLike) LoadHotKeyTextValue($('#dislike'), JSON.parse(localStorage.hotkeyDisLike));
    $('#dislike').bind('keydown', function (e) {
        localStorage.hotkeyDisLike = SetHotKey($('#dislike'), e);
    });

    // Setup tired HotKey Option
    if (localStorage.hotkeyTired) LoadHotKeyTextValue($('#tired'), JSON.parse(localStorage.hotkeyTired));
    $('#tired').bind('keydown', function (e) {
        localStorage.hotkeyTired = SetHotKey($('#tired'), e);
    });

});

function LoadHotKeyTextValue(inputBox, keyCodes) {
    if (!keyCodes) return;
    var text = "";
    if (keyCodes.ctrl) {
        text += "Ctrl + ";
    }
    if (keyCodes.alt) {
        text += "Alt + ";
    }
    if (keyCodes.shift) {
        text += "Shift + ";
    }
    text += String.fromCharCode(keyCodes.code);
    inputBox.val(text);
}

function IsValidKeyCode(keyCode) {
    if (keyCode == 0 || keyCode == 16 || keyCode == 17 || keyCode == 18) return false;
    return true;
}

function SetHotKey(inputBox, keyCodes) {
    keyCodes.preventDefault();
    if (!IsValidKeyCode(keyCodes.keyCode)) return "";

    var text = "";
    if (keyCodes.ctrlKey) {
        text += "Ctrl + ";
    }
    if (keyCodes.altKey) {
        text += "Alt + ";
    }
    if (keyCodes.shiftKey) {
        text += "Shift + ";
    }
    text += String.fromCharCode(keyCodes.keyCode);
    inputBox.val(text);
    
    return JSON.stringify({ ctrl: keyCodes.ctrlKey, alt: keyCodes.altKey, shift: keyCodes.shiftKey, code: keyCodes.keyCode });
}