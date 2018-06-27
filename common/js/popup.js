/*globals $, chrome, default_width, default_height*/

//https://stackoverflow.com/questions/10073699/pad-a-number-with-leading-zeros-in-javascript#answer-10074204
function zeroPad(num, places) {
    "use strict";
    if (num.toString().length >= places) {
        return num;
    }
    return String(Math.pow(10, places) + Math.floor(num)).substring(1);
}

var currentPanel = null;

var background = chrome.extension.getBackgroundPage();

function initBodySize() {
    "use strict";
    if (localStorage.bodyWidth === undefined || localStorage.bodyWidth === 0) {
        localStorage.bodyWidth = default_width;
    }
    if (localStorage.bodyHeight === undefined || localStorage.bodyHeight === 0) {
        localStorage.bodyHeight = default_height;
    }
    $("#bodyWidth").val(localStorage.bodyWidth);
    $("#bodyHeight").val(localStorage.bodyHeight);
}

function goToPanel(id) {
    "use strict";
    var panel = $(id);
    if (currentPanel !== null) {
        if (currentPanel.attr("id") === panel.attr("id")) {
            return;
        }
        //hide the other panel
        currentPanel.hide();
    }
    currentPanel = panel;
    currentPanel.show();
}

function goToLogin() {
    "use strict";
    goToPanel("#rightPanel");
}

function goToStations() {
    "use strict";
    goToPanel("#midPanel");
}

function goToPlayer() {
    "use strict";
    goToPanel("#leftPanel");
}

function clearHistory() {
    "use strict";
    var historyList = document.getElementById("historyList");
    while (historyList.hasChildNodes()) {
        historyList.removeChild(historyList.firstChild);
    }
}

function downloadSong(url, title) {
    "use strict";
    //making an anchor tag and clicking it allows the download dialog to work and save the file with the song"s name

    //trim the title of the song to 15 characters... not a perfect solution, but there were issues with it at full length
    title = title.substring(0, 15);
    var a = $("<a href=\"" + url + "\" download=\"" + title + ".mp4\">HELLO</a>");
    a.appendTo("body");
    a[0].click();
    a.remove();
}

function updateHistory() {
    "use strict";
    clearHistory();

    var history = document.getElementById("historyList");
    background.prevSongs.reverse().forEach(function (song, i) {
        var row = history.insertRow();

        var imgCell = row.insertCell();
        var image = document.createElement("img");
        image.setAttribute("src", song.albumArtUrl);
        image.setAttribute("class", "historyCoverArt historyInfoLink");
        image.setAttribute("data-history", i);
        imgCell.appendChild(image);

        var nameCell = row.insertCell();
        nameCell.noWrap = true;
        nameCell.style = "max-width:" + ($("body").width() * 0.5) + "px";

        var name = document.createElement("span");
        name.setAttribute("data-history", i);
        name.setAttribute("class", "historyInfoLink historyTitle");
        nameCell.appendChild(name);

        var nameText = document.createTextNode(song.songName);
        name.appendChild(nameText);

        var likeCell = row.insertCell();
        var likeImage = document.createElement("img");
        likeImage.setAttribute("src", "images/thumbup.png");
        likeImage.setAttribute("data-history", i);
        likeImage.setAttribute("class", "hoverImg historyLike");
        likeCell.appendChild(likeImage);

        var dlCell = row.insertCell();
        var dlImage = document.createElement("img");
        dlImage.setAttribute("src", "images/download.png");
        dlImage.setAttribute("data-history", i);
        dlImage.setAttribute("class", "hoverImg historyDownload");
        dlCell.appendChild(dlImage);
    });

    $(".historyInfoLink").bind("click", function (e) {
        var historyNum = e.target.dataset.history;
        var song = background.prevSongs[historyNum];
        chrome.tabs.create({
            "url": song.songDetailUrl
        });
    });
    $(".historyLike").bind("click", function (e) {
        var historyNum = e.target.dataset.history;
        background.addFeedback(historyNum, true);

        $(e.target).unbind("click").attr("src", "images/thumbUpCheck.png");
    });
    $(".historyDownload").bind("click", function (e) {
        var historyNum = e.target.dataset.history;
        var song = background.prevSongs[historyNum];

        downloadSong(song.audioUrlMap.highQuality.audioUrl, song.songName);
    });
}

function goToHistory() {
    "use strict";
    goToPanel("#historyPanel");
    updateHistory();
}

function addStations() {
    "use strict";
    background.stationList.forEach(function (station) {
        $("#stationList").append(new Option(station.stationName, station.stationToken));
    });
}

function updatePlayer() {
    "use strict";
    if (background.currentSong) {
        $("#coverArt").unbind().bind("click", function () {
            chrome.tabs.create({
                "url": background.currentSong.albumDetailUrl
            });
        }).attr("src", background.currentSong.albumArtUrl);
        $("#artistLink").unbind().text(background.currentSong.artistName);
        $("#titleLink").unbind().text(background.currentSong.songName);
        $("#artistLink").unbind().bind("click", function () {
            chrome.tabs.create({
                "url": background.currentSong.artistDetailUrl
            });
        }).text(background.currentSong.artistName);
        $("#titleLink").unbind().bind("click", function () {
            chrome.tabs.create({
                "url": background.currentSong.songDetailUrl
            });
        }).text(background.currentSong.songName);
        $("#dash").text(" - ");
        if (background.currentSong.songRating) {
            $("#tUpButton").unbind("click").attr("src", "images/thumbUpCheck.png");
        } else {
            $("#tUpButton").attr("src", "images/thumbup.png");
            $("#tUpButton").click(function () {
                background.addFeedback(-1, true);
                $("#tUpButton").attr("src", "images/thumbUpCheck.png");
                $("#tUpButton").unbind("click");
            });
        }
    }

    if (background.mp3Player.paused) {
        $("#playButton").show();
        $("#pauseButton").hide();
    } else {
        $("#playButton").hide();
        $("#pauseButton").show();
    }

    $(".scrollerText").hover(function (e) {
        if ($(e.target).width() > $(e.target).parent().width()) {
            var newLeft = $(e.target).parent().width() - ($(e.target).width());
            var speed = Math.round(($(e.target).width() - $(e.target).parent().width() + $(e.target).position().left) * 10);
            $(e.target).stop().delay(500).animate({
                left: newLeft
            }, speed);
        }
    }, function (e) {
        //move it to left immediately
        $(e.target).stop().css({
            left: 0
        });
    });
    $("#scrubber").slider({
        value: 0
    });
}

function drawPlayer() {
    "use strict";
    var curMinutes = Math.floor(background.mp3Player.currentTime / 60),
        curSecondsI = Math.ceil(background.mp3Player.currentTime % 60),
        curSeconds = zeroPad(curSecondsI.length === 1
            ? "0" + curSecondsI
            : curSecondsI, 2),
        totalMinutes = Math.floor(background.mp3Player.duration / 60),
        totalSecondsI = Math.ceil(background.mp3Player.duration % 60),
        totalSeconds = zeroPad(totalSecondsI.length === 1
            ? "0" + totalSecondsI
            : totalSecondsI, 2);

    $("#scrubber").slider({
        value: (background.mp3Player.currentTime / background.mp3Player.duration) * 100
    }).attr("title", curMinutes + ":" + curSeconds + "/" + totalMinutes + ":" + totalSeconds);
}

$(document).ready(function () {
    "use strict";
    $("body").bind("click", function (e) {
        if (e.target.id !== "artistLink" && e.target.id !== "titleLink") {
            $(".details").hide();
        }
    });
    initBodySize();
    $("body").width(localStorage.bodyWidth);
    $("body").height(localStorage.bodyHeight);

    var scrollerWidth = $("body").width() * 0.6;
    $(".scrollerContainer").width(scrollerWidth);

    $(".panel,#historyDiv").css({
        "height": $("body").height(),
        "width": $("body").width()
    });
    $("#historyDiv,#historyList").css({
        "width": $("body").width() - 20
    });
    $("#volume").css({
        "height": $("body").height() - 5
    });
    $("#coverArt").css({
        "min-width": Math.min($("body").height() * 0.75, $("body").width() * 0.1)
    });

    if (background.mp3Player.paused) {
        $("pauseButton").hide();
        $("playButton").show();
    } else {
        $("pauseButton").show();
        $("playButton").hide();
    }
    $(".panel").hide();

    $("#scrubber").slider({
        range: "min",
        min: 0,
        slide: function (ignore, ui) {
            background.mp3Player.currentTime = background.mp3Player.duration * (ui.value / 100);
        },
        change: function (ignore, ui) {
            $(ui.handle).removeClass("ui-state-focus");
        }
    });

    $("#playButton").bind("click", function () {
        play_audio();
    });
    $("#pauseButton").bind("click", function () {
        pause_audio();
    });
    $("#skipButton").bind("click", background.nextSong);
    $("#tUpButton").bind("click", function () {
        background.addFeedback(-1, true);
        if (background.currentSong.songRating === true) {
            $("#tUpButton").unbind("click").attr("src", "images/thumbUpCheck.png");
        }
    });
    $("#tDownButton").bind("click", function () {
        background.addFeedback(-1, false);
        setTimeout(function () {
            background.nextSong();
        }, 1000); // Small delay to stop extension from freezing for some reason
    });
    $("#sleepButton").bind("click", function () {
        background.sleepSong();
        background.nextSong();
    });
    $("#downloadButton").bind("click", function () {
        background.downloadSong();
    });
    $("#moreInfoButton").bind("click", function () {
        window.open("options.htm", "_blank");
    });
    $("#volume").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: 70,
        value: (localStorage.volume)
            ? localStorage.volume * 100
            : 20,
        slide: function (ignore, ui) {
            background.mp3Player.volume = ui.value / 100;
        },
        stop: function (ignore, ui) {
            $(ui.handle).removeClass("ui-state-focus");
            localStorage.volume = ui.value / 100;
        }
    });
    $("#nextButton").bind("click", function () {
        //move to midpanel
        goToStations();
    });
    $("#stationList").bind("change", function () {
        background.play($("#stationList").val());
        goToPlayer();
    });
    $("#unWarning").hide();
    $("#pwWarning").hide();
    $("#rightWarnRow").hide();
    $("#login").bind("submit", function () {
        localStorage.username = $("#username").val();
        localStorage.password = $("#password").val();
        background.partnerLogin();
        if (background.userAuthToken === "") {
            $("#unWarning").show();
            $("#pwWarning").show();
            $("#rightWarnRow").show();
            $("#username").css({
                "padding-left": "16px",
                "width": "216px"
            });
            $("#password").css({
                "padding-left": "16px",
                "width": "216px"
            });
            return false;
        } else {
            addStations();
            //move to mid panel
            goToStations();
            return false;
        }
    });

    if (background.stationList !== undefined) {
        addStations();
    }
    if (localStorage.username === undefined
            || localStorage.password === undefined
            || background.userAuthToken === undefined
            || localStorage.username.length === 0
            || localStorage.password.length === 0
            || background.userAuthToken.length === 0) {
        goToLogin();
    } else {
        if (!localStorage.lastStation) {
            goToStations();
        }
        if (localStorage.lastStation) {
            goToPlayer();
        }
    }

    $("#prevButton").bind("click", function () {
        goToPlayer();
    });
    $("#history").bind("click", function () {
        goToHistory();
    });
    $("#noHistory").bind("click", function () {
        goToPlayer();
    });

    if (background.mp3Player.src !== "") {
        if (background.mp3Player.currentTime > 0) {
            updatePlayer();
            drawPlayer();
        }
    } else {
        updatePlayer();
    }
});

function pause_audio () {
    background.mp3Player.pause();
    $("#pauseButton").hide();
    $("#playButton").show();
}

function play_audio () {
    background.play(localStorage.lastStation);
    $("#playButton").hide();
}

background.setCallbacks(updatePlayer, drawPlayer, downloadSong);