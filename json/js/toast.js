var background = chrome.extension.getBackgroundPage();
background.toastCallback = updateToast;
var closeTimer;
function loadToast() {
    //////////////////////////////
    //  Load jQuery bindings    //
    //////////////////////////////
    $('img:gt(0)')
        .mouseover(function () {
            var src = $(this).attr("src").replace(".png", "hover.png");
            $(this).attr("src", src);
        })
        .mouseout(function () {
            var src = $(this).attr("src").replace("hover", "");
            $(this).attr("src", src);
        });
    $('#nowPlaying').hoverIntent({
        over: function () {
            if ($(this).width() > 172) {
                var newLeft = 172 - ($(this).width());
                var speed = Math.round(($(this).width() - 170 + $(this).position().left) * 10);
                $(this).stop().delay(500).animate({ left: newLeft }, speed);
            }
        },
        out: function () {
            var speed = Math.round($(this).position().left * (-10));
            $(this).stop().delay(500).animate({ left: '0' }, speed);
        },
        interval: 500
    });
    $('#skipButton').bind('click', background.nextSong);
    $('#tDownButton').bind('click', function () {
        background.addFeedback("0", "-1");
        setTimeout(background.nextSong(), 1000); // Small delay to stop extension from freezing for some reason
//        background.rateSong(background.curSong.stationId, background.curSong.musicId, background.curSong.userSeed, background.curSong.testStrategy, "0", background.curSong.songType);
//        background.nextSong();
    });
    $('#sleepButton').bind('click', function () {
        background.sleepSong(); background.nextSong();
    });
    $('#dash').text(" - ");
    if (background.curSong.rating != '1') {
        $('#tUpButton').bind('click', function () {
            background.addFeedback("1", "-1");
            if (background.curSong.rating == "1") {
                $(this).unbind('click').attr('src', 'images/thumbUpCheck.png');
            }
        }).attr('src', 'images/thumbup.png');
    }
    else {
        $('#tUpButton').unbind().attr('src', 'images/thumbUpCheck.png');
    }
    closeTimer = setTimeout(function () {
        background.toastCallback = null;
        window.close();
    }, 7000);
    $(window)
    .bind('mouseover', function () {
        clearTimeout(closeTimer);
    })
    .bind('mouseout', function (e) {
        if (e.toElement == null) {
            closeTimer = setTimeout(function () {
                background.toastCallback = null;
                window.close();
            }, 5000);
        }
    });
    updateToast();
}
function updateToast() {
    $('#coverArt').unbind().bind('click', function () {
        chrome.tabs.create({ "url": background.curSong.albumUrl });
    }).attr('src', background.curSong.art);
    $('#artistLink').unbind().bind('click', function () {
        chrome.tabs.create({ "url": background.curSong.artistUrl });
    }).text(background.curSong.artist);
    $('#titleLink').unbind().bind('click', function () {
        chrome.tabs.create({ "url": background.curSong.titleUrl });
    }).text(background.curSong.title);
}