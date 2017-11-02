var min_width=310;
var min_height=50;
var min_history=1;

var default_width=350;
var default_height=100;
var default_history=5;

$(document).ready(function () {
	var background = chrome.extension.getBackgroundPage();
	if (localStorage.notifications == "true") {
		$('#notifications').attr('checked', true);
	}
	if (localStorage.autostations == "true") {
		$('#autostations').attr('checked', true);
	}

	initBodySize();
	$('#bodyWidth').change(function(){
		if($(this).val()<min_width){
			localStorage.bodyWidth=min_width;
			alert('The width must be greater than or equal to '+min_width+'!');
			$(this).val(min_width);
		} else {
			localStorage.bodyWidth=$(this).val();
		}
	});
	$('#bodyHeight').change(function(){
		if($(this).val()<min_height){
			localStorage.bodyHeight=min_height;
			alert('The height must be greater than or equal to '+min_height+'!');
			$(this).val(min_height);
		} else {
			localStorage.bodyHeight=$(this).val();
		}
	});
	$('#historyNum').change(function(){
		if($(this).val()<min_history){
			localStorage.historyNum=min_history;
			alert('You must have at least '+min_history+' item'+min_history>1?'s':''+' in history');
			$(this).val(min_history);
		} else {
			localStorage.historyNum=$(this).val();
		}
	});

	$('#refresh').bind('click',function(){
		background.getStationList();
	});
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
});

function initBodySize(){
	if(localStorage.bodyWidth===undefined
			|| localStorage.bodyWidth===0){
		localStorage.bodyWidth=default_width;
	}
	if(localStorage.bodyHeight===undefined
			|| localStorage.bodyHeight===0){
		localStorage.bodyHeight=default_height;
	}
	if(localStorage.historyNum===undefined
			|| localStorage.historyNum===0){
		localStorage.historyNum=default_history;
	}

	$('#bodyWidth').val(localStorage.bodyWidth);
	$('#bodyHeight').val(localStorage.bodyHeight);
	$('#historyNum').val(localStorage.historyNum);

}

