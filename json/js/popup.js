var background = chrome.extension.getBackgroundPage();
background.setCallbacks(updatePlayer, drawPlayer);
$(document).ready(
function () {
    //////////////////////////////
    //  Load jQuery bindings    //
    //////////////////////////////
    $('body').bind('click', function (e) { if (e.target.id != 'artistLink' && e.target.id != 'titleLink') { $('.details').hide() } });
    $('img:gt(0)')
        .mouseover(function () {
            if ($(this).attr('id') == 'prevButton' && !localStorage.lastStation) {
                return false;
            }
            else {
                var src = $(this).attr("src").replace(".png", "hover.png");
                $(this).attr("src", src);
            }
        })
        .mouseout(function () {
            var src = $(this).attr("src").replace("hover", "");
            $(this).attr("src", src);
        });
    $('.details').hide();
    $('#scrubber').slider({
        range: "min",
        min: 0,
        slide: function (event, ui) {
            background.mp3Player.currentTime = background.mp3Player.duration * (ui.value / 100);
        },
        change: function (event, ui) {
            $(ui.handle).removeClass('ui-state-focus');
        }
    });

    $('#playButton').bind('click', function () { background.play(localStorage.lastStation) });
    $('#pauseButton').bind('click', function () { background.mp3Player.pause(); $(this).hide(); $('#playButton').show(); });
    $('#skipButton').bind('click', background.nextSong);
    $('#tUpButton').bind('click', function () {
        background.addFeedback(-1, true);
        if (background.currentSong.songRating == true) {
            $(this).unbind('click').attr('src', 'images/thumbUpCheck.png');
        }
    });
    $('#tDownButton').bind('click', function () {
        background.addFeedback(-1, false);
        setTimeout(background.nextSong(), 1000); // Small delay to stop extension from freezing for some reason
    });
    $('#sleepButton').bind('click', function () { background.sleepSong(); background.nextSong(); });
    $('#moreInfoToggle')
    .button()
    .bind('click', function () {
        if ($(this).is(':checked')) {
            if (background.currentSong) {
                //                if (background.currentSong.narrative) {
                //                    $('#narrative').text(background.curSong.narrative);
                //                    $('body').animate({ height: $('#moreInfo').height() + 45 }, 300);
                //                }
                //                else {
                //                    $('#narrative').html('<a id="narrativeLink" href="#">Why was this song played?</a>');
                //                    $('body').animate({ height: $('#moreInfo').height() + 45 }, 300);
                //                }

                if (background.prevSongs.length > 0) {
                    $('body').animate({ height: $('#moreInfo').height() + 50 }, 300);
                }
            }
            else {
                $('#moreInfoToggle').attr('checked', false).button('refresh');
            }
        }
        else {
            $('body').animate({ height: 44 }, 300);
        }
    });
    $('#narrativeLink').live('click', function () {
        background.narrative(background.curSong.stationId, background.curSong.musicId);
        $('#narrative').text(background.curSong.narrative);
        $('body').animate({ height: 50 + $('#moreInfo').height() });

    });
    $('.prevSongArtist').live('click', function () {
        chrome.tabs.create({ "url": background.prevSongs[$(this).parents('.prevSong').attr('songNum')].artistDetailUrl })
    });
    $('.prevSongTitle').live('click', function () {
        chrome.tabs.create({ "url": background.prevSongs[$(this).parents('.prevSong').attr('songNum')].songDetailUrl })
    });
    $('.prevSongLike').live('click', function () {
        background.addFeedback(background.prevSongs[(this).attr('songNum')].trackToken, true);
        $(this).parent().replaceWith('<span style="font-weight:bold">Liked</span>');
    });
    $('.prevSongDislike').live('click', function () {
        background.addFeedback(background.prevSongs[(this).attr('songNum')].trackToken, false);
        $(this).parent().replaceWith('<span style="font-weight:bold">Disliked</span>');
    });
    $('#volume').slider({
        orientation: 'vertical',
        range: 'min',
        min: 0,
        max: 70,
        value: (localStorage.volume) ? localStorage.volume * 100 : ".2",
        slide: function (event, ui) {
            background.mp3Player.volume = ui.value / 100;
        },
        stop: function (event, ui) {
            $(ui.handle).removeClass('ui-state-focus');
            localStorage.volume = ui.value / 100;
        }
    });
    $('#nextButton').bind('click', function () {
        $('#moreInfoToggle').attr('checked', false).button('refresh');
        $('body').animate({ height: 44 }, 200);
        $('#anesidora').animate({ left: '-294px' }, 500);
        if (localStorage.autostations == "true") {
            if ($('#stationList').attr('scrollHeight') <= 224) {
                $('body').delay(100).animate({ height: $('#stationList').attr('scrollHeight') - 6 }, 300);
            }
            else {
                $('body').animate({ height: 219 }, 300);
            }
            if ($('#stationList').height() != $('#stationList').attr('scrollHeight') && $('#stationList').attr('scrollHeight') <= 224) {
                $('#stationList').animate({ height: $('#stationList').attr('scrollHeight') + 2 }, 300).delay(350).queue(function () {
                    $('#stationList').val(localStorage.lastStation).focus();
                    $(this).dequeue();
                });
            }
            else {
                $('#stationList').animate({ height: 227 }, 300).delay(350).queue(function () {
                    $('#stationList').val(localStorage.lastStation).focus();
                    $(this).dequeue();
                });
            }
        }

    });
    $('#stationList').bind('dblclick keyup', function (e) {
        if (e.type == "dblclick" || e.keyCode == "13") {
            background.play($(this).val());
            goToPlayer();
        }
    });
    $('#searchResults')
    .bind('dblclick', function (e) {
        if (e.type == "dblclick" || e.keyCode == "13") {
            background.createStation($(this).val());
            background.getStations();
            $('#stationList').empty();
            for (i = 0; i < background.userStations.length; i++) {
                $('#stationList').append(new Option(background.userStations[i].name, background.userStations[i].id));
            }
            background.play($('#stationList option:contains(' + $('#searchResults option:selected').text() + ')').val());
            goToPlayer();
        }
    })
    .hide();
    $('#quickMixToggle')
    .button({
        icons: {
            primary: "ui-icon-shuffle"
        },
        text: false
    })
    .bind('click', function () {
        if ($(this).is(':checked')) {
            $(':checkbox').not($(this)).attr('checked', false).button('refresh');
            $('#search').hide();
            $('#searchResults').hide();
            if ($('#stationList').attr('scrollHeight') <= 224) {
                $('body').animate({ height: $('#stationList').attr('scrollHeight') - 6 }, 300);
            }
            else {
                $('body').animate({ height: 219 }, 300);
            }
            if ($('#stationList').height() != $('#stationList').attr('scrollHeight') && $('#stationList').attr('scrollHeight') <= 224) {
                $('#stationList').animate({ height: $('#stationList').attr('scrollHeight') + 2 }, 300);
            }
            else {
                $('#stationList').animate({ height: 227 }, 300);
            }
            $('#okayButton')
            .button({
                icons: {
                    primary: "ui-icon-check"
                },
                text: false
            })
            .css('top', function () {
                if ($('#stationList').attr('scrollHeight') <= 224) {
                    return $('#stationList').attr('scrollHeight') - 10;
                } else {
                    return 214;
                }
            })
            .unbind()
            .bind('click', function () {
                if ($('#stationList :selected').length > 1) {
                    var mixStations = new Array();
                    $('#stationList :selected').each(function (i, selected) { mixStations[i] = $(selected).val(); });
                    background.setQuickMix(mixStations);
                    background.play(localStorage.userStation);
                    goToPlayer();
                }
            })
            .show();
        }
        else {
            $('#stationList').animate({ height: 52 }, 200);
            $('body').delay(20).animate({ height: 44 }, 200);
        }
    });
    $('#newStationToggle').button({
        icons: {
            primary: "ui-icon-plus"
        },
        text: false
    })
    .bind('click', function () {
        if ($(this).is(':checked')) {
            $(':checkbox').not($(this)).attr('checked', false).button('refresh');
            $('#searchResults').css('height', $('#stationList').attr('scrollHeight') + 2).empty().show();
            if ($('#stationList').height() != $('#stationList').attr('scrollHeight')) {
                $('#stationList').animate({ height: $('#stationList').attr('scrollHeight') + 2 }, 300);
            }
            $('body').animate({ height: $('#stationList').attr('scrollHeight') + 15 }, 300);
            $('#search').css('top', $('#stationList').attr('scrollHeight') + 3).val('').show().delay(500).queue(function () { $(this).focus() });
            $('#okayButton')
            .button({
                icons: {
                    primary: "ui-icon-search"
                },
                text: false
            })
            .css('top', $('#stationList').attr('scrollHeight') + 11)
            .unbind()
            .bind('click', function () {
                background.musicSearch($('#search').val());
                $('#searchResults').empty();
                if (background.searchResults.songs.length) {
                    $('#searchResults').append('<optgroup label=\'Songs\'></optgroup>');
                    for (x = 0; x < background.searchResults.songs.length; x++) {
                        $('#searchResults optgroup[label=Songs]').append(new Option(background.searchResults.songs[x].name, background.searchResults.songs[x].value));
                    }

                }
                if (background.searchResults.stations.length) {
                    $('#searchResults').append('<optgroup label=\'Stations\'></optgroup>');
                    for (x = 0; x < background.searchResults.stations.length; x++) {
                        $('#searchResults optgroup[label=Stations]').append(new Option(background.searchResults.stations[x].name, background.searchResults.stations[x].value));
                    }

                }
                if (background.searchResults.artists.length) {
                    $('#searchResults').append('<optgroup label=\'Artists\'></optgroup>');
                    for (x = 0; x < background.searchResults.artists.length; x++) {
                        $('#searchResults optgroup[label=Artists]').append(new Option(background.searchResults.artists[x].name, background.searchResults.artists[x].value));
                    }

                }

            })
            .show();
        }
        else {
            $('#searchResults').hide()
            $('#stationList').animate({ height: 52 }, 200);
            $('body').delay(20).animate({ height: 44 }, 200);
        }
    });
    $('#deleteStationToggle')
    .button({
        icons: {
            primary: "ui-icon-trash"
        },
        text: false
    })
    .bind('click', function () {
        if ($(this).is(':checked')) {
            $(':checkbox').not($(this)).attr('checked', false).button('refresh');
            $('#search').hide();
            $('#searchResults').hide();
            $('#stationList')
            .unbind()
            .bind('dblclick', function () {
                $('#okayButton').click();
            });
            if ($('#stationList').attr('scrollHeight') <= 224) {
                $('body').animate({ height: $('#stationList').attr('scrollHeight') - 6 }, 300);
            }
            else {
                $('body').animate({ height: 219 }, 300);
            }
            if ($('#stationList').height() != $('#stationList').attr('scrollHeight') && $('#stationList').attr('scrollHeight') <= 224) {
                $('#stationList').animate({ height: $('#stationList').attr('scrollHeight') + 2 }, 300);
            }
            else {
                $('#stationList').animate({ height: 227 }, 300);
            }
            $('#okayButton')
            .button({
                icons: {
                    primary: "ui-icon-check"
                },
                text: false
            })
            .css('top', function () {
                if ($('#stationList').attr('scrollHeight') <= 224) {
                    return $('#stationList').attr('scrollHeight') - 10;
                } else {
                    return 214;
                }
            })
            .unbind()
            .bind('click', function () {
                $('#confirmDelete').dialog({
                    resizable: false,
                    width: 200,
                    minHeight: 16,
                    modal: true,
                    buttons: {
                        "Yes": function () {
                            if ($('#stationList :selected').val() == localStorage.lastStation) {
                                background.play(localStorage.userStation);
                            }
                            background.removeStation($('#stationList :selected').val());
                            background.getStations();
                            $('#stationList').empty();
                            for (i = 0; i < background.userStations.length; i++) {
                                $('#stationList').append(new Option(background.userStations[i].name, background.userStations[i].id));
                            }
                            if ($('#stationList').attr('scrollHeight') <= 224) {
                                $('body').animate({ height: $('#stationList').attr('scrollHeight') - 6 }, 300);
                            }
                            else {
                                $('body').animate({ height: 219 }, 300);
                            }
                            if ($('#stationList').height() != $('#stationList').attr('scrollHeight') && $('#stationList').attr('scrollHeight') <= 224) {
                                $('#stationList').animate({ height: $('#stationList').attr('scrollHeight') + 2 }, 300);
                            }
                            else {
                                $('#stationList').animate({ height: 227 }, 300);
                            }
                            $(this).dialog("close");
                        },
                        Cancel: function () {
                            $(this).dialog("close");
                        }
                    }
                });
                $('#confirmDelete').text($('#stationList :selected').text());
            })
            .show();
        }
        else {
            $('#stationList')
            .unbind()
            .bind('dblclick', function () {
                background.play($(this).val());
                goToPlayer();
            })
            .delay(180)
            .animate({ height: 52 }, 200);
            $('body').delay(180).animate({ height: 44 }, 200);
        }
    });
    $('#searchForm')
        .bind('submit', function () {
            $('#searchResults').empty();
            background.musicSearch($('#search').val());
            if (background.searchResults.songs.length) {
                $('#searchResults').append('<optgroup label=\'Songs\'></optgroup>');
                for (x = 0; x < background.searchResults.songs.length; x++) {
                    $('#searchResults optgroup[label=Songs]').append(new Option(background.searchResults.songs[x].name, background.searchResults.songs[x].value));
                }

            }
            if (background.searchResults.stations.length) {
                $('#searchResults').append('<optgroup label=\'Stations\'></optgroup>');
                for (x = 0; x < background.searchResults.stations.length; x++) {
                    $('#searchResults optgroup[label=Stations]').append(new Option(background.searchResults.stations[x].name, background.searchResults.stations[x].value));
                }

            }
            if (background.searchResults.artists.length) {
                $('#searchResults').append('<optgroup label=\'Artists\'></optgroup>');
                for (x = 0; x < background.searchResults.artists.length; x++) {
                    $('#searchResults optgroup[label=Artists]').append(new Option(background.searchResults.artists[x].name, background.searchResults.artists[x].value));
                }
            }
            return false;
        });
    $('#search').hide();
    $('#okayButton').hide();
    $('#unWarning').hide();
    //    $('#username').keypress(function (event) {
    //        if (event.keyCode == 9) {
    //            $('#password').focus();
    //            return false;
    //        }
    //    });
    $('#pwWarning').hide();
    $('#login')
        .bind('submit', function () {
            localStorage.username = $('#username').val();
            localStorage.password = $('#password').val();
            background.partnerLogin();
            if (background.userAuthToken == "") {
                $('#unWarning').show();
                $('#pwWarning').show();
                $('#username').css({ 'padding-left': '16px', 'width': '216px' });
                $('#password').css({ 'padding-left': '16px', 'width': '216px' });
                return false;
            }
            else {
                for (i = 0; i < background.stationList.length; i++) {
                    $('#stationList').append(new Option(background.stationList[i].stationName, background.stationList[i].stationToken));
                }
                $('#anesidora').animate({ left: '-294px' }, 500);
                return false;
            }
        });

    ///////////////////
    //  Misc loads   //
    ///////////////////
    if (typeof background.stationList != "undefined") {
        for (i = 0; i < background.stationList.length; i++) {
            $('#stationList').append(new Option(background.stationList[i].stationName, background.stationList[i].stationToken));
        }
    }
    if (!localStorage.password) {
        $('#anesidora').css('left', '-594px');
    }
    else if (!localStorage.lastStation) {
        $('#anesidora').css('left', '-294px');
    }
    else {
        $('#prevButton').bind('click', function () { goToPlayer(); });
    }
    if (background.mp3Player.src != "") {
        if (background.mp3Player.currentTime > 0) {
            updatePlayer();
            drawPlayer();
        }
    }
    else {
        updatePlayer();
        $('#moreInfoToggle').button('enable');
    }
    $('body').delay(100).height('44px');
});
function goToPlayer() {
    $(':checkbox').attr('checked', false).button('refresh');
    $('#search').empty().hide();
    $('#searchResults').empty().hide();
    if ($('body').height() > 44) {
        $('#quickMix').fadeOut(1000);
        $('#stationList').delay(180).animate({ height: 52 }, 200);
        $('body').delay(180).animate({ height: 44 }, 200);
        $('#anesidora').delay(500).animate({ left: '8px' }, 500);
    }
    else {
        $('#anesidora').animate({ left: '8px' }, 500);
    }
    $('#stationList').val('');
}
function toggleDetails(source, position) {
    if ($('.details').is(':hidden')) {
        if (source == "artist") {
            $('.details>a:first').text('Artist Details').unbind().bind('click', function () { chrome.tabs.create({ "url": background.currentSong.artistDetailUrl }); $('.details').hide(); });
//            $('.details>a:last').text('Share Artist').unbind().bind('click', function () { background.bookmarkArtist(background.curSong.artistId); $('.details').hide(); });
        }
        else {
            $('.details>a:first').text('Song Details').unbind().bind('click', function () { chrome.tabs.create({ "url": background.currentSong.songDetailUrl }); $('.details').hide(); });
            if (localStorage.accessToken && localStorage.facebookUsername) {
                $('.details>a:last').text('Share Song').unbind().bind('click', function () { background.shareSong(); $('.details').hide(); });
            }
        }
        $('.details').css('left', position - 22);
        $('.details').show();
    }
    else {
        $('.details').hide();
    }
}
function updatePlayer() {
    if (background.currentSong) {
        $('#coverArt').unbind().bind('click', function () { chrome.tabs.create({ "url": background.currentSong.albumDetailUrl }) }).attr('src', background.currentSong.albumArtUrl);
        $('#artistLink').unbind().bind('click', function (e) { toggleDetails("artist", e.pageX); /*chrome.tabs.create({ "url": background.curSong.artistUrl }) */ }).text(background.currentSong.artistName);
        $('#titleLink').unbind().bind('click', function (e) { toggleDetails("song", e.pageX); /* chrome.tabs.create({ "url": background.curSong.titleUrl }) */ }).text(background.currentSong.songName);
        $('#dash').text(" - ");
        if (background.currentSong.songRating==false) {
            $('#tUpButton').unbind('click').bind('click', function () { background.addFeedback(-1, true); $(this).attr('src', 'images/thumbUpCheck.png'); }).attr('src', 'images/thumbup.png');
        }
        else {
            $('#tUpButton').unbind('click').attr('src', 'images/thumbUpCheck.png');
        }
    }
    if (background.mp3Player.paused) {
        $('#playButton').show();
        $('#pauseButton').hide();
    }
    else {
        $('#playButton').hide();
        $('#pauseButton').show();
    }
    $('.prevSong').remove();
    if (background.prevSongs.length > 0) {
        for (x = background.prevSongs.length - 1; x >= 0; x--) {
            var html = '<div class="prevSong" songNum="'+x+'">';
            html += '<img style="height:24px; width:24px; margin:2px 6px 0px 0px; border: 1px solid #8397aa; float:left; position:relative;" src="' + background.prevSongs[x].albumArtUrl + '" />';
            html += '<div class="scrollerContainer" style="position:relative; width:254px;">';
            html += '<div class="scrollerText">';
            html += '<a class="prevSongArtist" href="#">' + background.prevSongs[x].artistName + '</a>';
            html += ' - ';
            html += '<a class="prevSongTitle" href="#">' + background.prevSongs[x].songName + '</a>';
            html += '</div>';
            html += '</div>';
            if (background.prevSongs[x].songRating) {
                html += '<span style="font-weight:bold">Liked</span>';
            }
            else if (background.prevSongs[x].disliked) {
                html += '<span style="font-weight:bold">Disliked</span>';
            }
            else {
                html += '<div class="prevSongRating" style="position:relative;">';
                html += '<a class="prevSongLike" songNum="' + x + '" href="#">Like</a>';
                html += ' - ';
                html += '<a class="prevSongDislike" songNum="' + x + '" href="#">Dislike</a>';
                html += '</div>';
            }
            html += '</div>';
            $('#moreInfo').append(html);
        }
    }
    if ($('#moreInfoToggle').attr('checked')) {
//        if (background.curSong.narrative) {
//            $('#narrative').text(background.curSong.narrative);
//        }
//        else {
//            $('#narrative').html('<a id="narrativeLink" href="#">Why was this song played?</a>');
//        }
        $('body').height($('#moreInfo').height() + 50);
    }
    $('.scrollerText').hoverIntent({
        over: function () {
            if ($(this).width() > $(this).parent().width()) {
                var newLeft = $(this).parent().width() - ($(this).width());
                var speed = Math.round(($(this).width() - $(this).parent().width() + $(this).position().left) * 10);
                $(this).stop().delay(500).animate({ left: newLeft }, speed);
            }
        },
        out: function () {
            var speed = Math.round($(this).position().left * (-10));
            $(this).stop().delay(500).animate({ left: '0' }, speed);
        },
        interval: 500
    });
    $('#scrubber')
    .slider({
        value: 0
    })
}
function drawPlayer() {
    $('#scrubber')
    .slider({
        value: (background.mp3Player.currentTime / background.mp3Player.duration) * 100
    })
    .attr("title",
    Math.floor(background.mp3Player.currentTime / 60) +
    ":" +
    (Math.ceil(background.mp3Player.currentTime % 60).length == 1 ? '0' + Math.ceil(background.mp3Player.currentTime % 60) : Math.ceil(background.mp3Player.currentTime % 60)) + 
    "/" +
    Math.floor(background.mp3Player.duration / 60) +
    ":" +
    (Math.ceil(background.mp3Player.duration % 60).length == 1 ? '0' + Math.ceil(background.mp3Player.duration % 60) : Math.ceil(background.mp3Player.duration % 60)) + 
     );
}