var currentPanel = null

var background = chrome.extension.getBackgroundPage();
background.setCallbacks(updatePlayer, drawPlayer,downloadSong);
$(document).ready(
function () {
		currentPanel=$('#leftPanel');
		$('#rightPanel').hide();
		$('#midPanel').hide();
		$('#leftPanel').hide();
		goToPlayer();
    //////////////////////////////
    //  Load jQuery bindings    //
    //////////////////////////////
    $('body').bind('click', 
			function (e) { 
				if (e.target.id != 'artistLink' && e.target.id != 'titleLink') { 
					$('.details').hide() 
				} 
			});
		$('body').css({
			'min-width':currentPanel.width(),
			'max-width':currentPanel.width(),
			'width':currentPanel.width(),
			
			'min-height':currentPanel.height(),
			'max-height':currentPanel.height(),
			'height':currentPanel.height()
		});
		$('#stationList').css({
			'max-width':currentPanel.width()-30
		});
		
		if(background.mp3Player.paused){
			$('pauseButton').hide();
			$('playButton').show();
		} else {
			$('pauseButton').show();
			$('playButton').hide();
		}

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

    $('#playButton').bind('click', function () { background.play(localStorage.lastStation); $(this).hide(); });
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
		$('#downloadButton').bind('click',function(){ background.downloadSong(); });
		$('#moreInfoButton').bind('click',function(){ window.open('options.htm','_blank');	});
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
				//move to midpanel
				goToStations();

    });
    $('#stationList').bind('dblclick keyup', function (e) {
        if (e.type == "dblclick" || e.keyCode == "13") {
            background.play($(this).val());
            goToPlayer();
        }
    });
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
								//move to mid panel	
								goToStations();

                $('#anesidora').animate({ left: '-'+(294+winShift)+'px' }, 500);
                $(this).remove();
                return false;
            }
        });

    ///////////////////
    //  Misc loads   //
    ///////////////////
		goToStations();
    if (typeof background.stationList != "undefined") {
        for (i = 0; i < background.stationList.length; i++) {
            $('#stationList').append(new Option(background.stationList[i].stationName, background.stationList[i].stationToken));
        }
    }
    if (localStorage.username && localStorage.password) {
        $('#login').remove();
    }
    else {
			goToLogin();
       // $('#anesidora').css('left', '-'+(594+winShift*2)+'px');
    }
    if (background.userAuthToken && !localStorage.lastStation) {
			goToStations();
        //$('#anesidora').css('left', '-'+(294+winShift)+'px');
    }
		$('#prevButton').bind('click', function () { goToPlayer(); });
    if (background.mp3Player.src != "") {
			if (background.mp3Player.currentTime > 0) {
				updatePlayer();
				drawPlayer();
			}
    }
    else {
			updatePlayer();
    }
});
function goToPanel(id){
	var panel = $(id);
	if(currentPanel !== null){
		if(currentPanel.attr('id') === panel.attr('id')){
			return;
		}
		//hide the other panel
		currentPanel.hide();
	}
	currentPanel = panel;
	currentPanel.show();
	$('body').css({
		'width':currentPanel.width(),
		'height':currentPanel.height()
	});
	/*$('body').animate({
		width:currentPanel.width(),
		height:currentPanel.height()
	},500);*/
}

function goToLogin(){
	goToPanel('#rightPanel');
}
function goToStations(){
	goToPanel('#midPanel');
}
function goToPlayer() {
	goToPanel('#leftPanel');
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
//    if ($('#moreInfoToggle').attr('checked')) {
////        if (background.curSong.narrative) {
////            $('#narrative').text(background.curSong.narrative);
////        }
////        else {
////            $('#narrative').html('<a id="narrativeLink" href="#">Why was this song played?</a>');
////        }
//        $('body').height($('#moreInfo').height() + 50);
//    }
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
        zeroPad(
            (Math.ceil(background.mp3Player.currentTime % 60).length == 1 ? '0' + Math.ceil(background.mp3Player.currentTime % 60) : Math.ceil(background.mp3Player.currentTime % 60)),
            2) +
    "/" +
    Math.floor(background.mp3Player.duration / 60) +
    ":" +
        zeroPad(
            (Math.ceil(background.mp3Player.duration % 60).length == 1 ? '0' + Math.ceil(background.mp3Player.duration % 60) : Math.ceil(background.mp3Player.duration % 60)),
            2)
    );
}
function downloadSong(url,title){
	var a = $('<a href="'+url+'" download="'+title+'.mp4">HELLO</a>');
	a.appendTo('body');
	a[0].click();
	a.remove();
	
}
//function for adding leading zeros. took from here: http://stackoverflow.com/a/2998874 [BukeMan]
function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-43432184-3']);
_gaq.push(['_trackPageview']);
(function () {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
