/*globals $, chrome, alert*/

var min_width = 310;
var min_height = 50;
var min_history = 1;

var default_width = 350;
var default_height = 100;
var default_history = 5;

function initBodySize() {
    'use strict';
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    if (localStorage.historyNum === undefined || localStorage.historyNum === 0) {
        localStorage.historyNum = default_history;
    }

    $('#bodyWidth').val(localStorage.bodyWidth);
    $('#bodyHeight').val(localStorage.bodyHeight);
    $('#historyNum').val(localStorage.historyNum);
}

$(document).ready(function () {
    'use strict';
    var background = chrome.extension.getBackgroundPage();
    if (localStorage.notifications === "true") {
        $('#notifications').attr('checked', true);
    }
    if (localStorage.autostations === "true") {
        $('#autostations').attr('checked', true);
    }

    initBodySize();
    $('#bodyWidth').change(function () {
        if ($('#bodyWidth').val() < min_width) {
            localStorage.bodyWidth = min_width;
            alert('The width must be greater than or equal to ' + min_width + '!');
            $('#bodyWidth').val(min_width);
        } else {
            localStorage.bodyWidth = $('#bodyWidth').val();
        }
    });
    $('#bodyHeight').change(function () {
        if ($('#bodyHeight').val() < min_height) {
            localStorage.bodyHeight = min_height;
            alert('The height must be greater than or equal to ' + min_height + '!');
            $('#bodyHeight').val(min_height);
        } else {
            localStorage.bodyHeight = $('#bodyHeight').val();
        }
    });
    $('#historyNum').change(function () {
        if ($('#historyNum').val() < min_history) {
            localStorage.historyNum = min_history;
            alert('You must have at least ' + min_history + ' item' + min_history > 1
                ? 's'
                : '' + ' in history');
            $('#historyNum').val(min_history);
        } else {
            localStorage.historyNum = $('#historyNum').val();
        }
    });

    $('#refresh').bind('click', function () {
        background.getStationList();
    });
    $('#reset').bind('click', function () {
        localStorage.username = '';
        localStorage.password = '';
        localStorage.lastStation = '';
    });
    $('#notifications').bind('change', function () {
        if ($('#notifications').attr('checked')) {
            localStorage.notifications = true;
        } else {
            localStorage.notifications = false;
        }
    });
    $('#autostations').bind('change', function () {
        if ($('#autostations').attr('checked')) {
            localStorage.autostations = true;
        } else {
            localStorage.autostations = false;
        }
    });
});
