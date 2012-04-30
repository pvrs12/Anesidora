chrome.extension.sendRequest("getKeys", function (response) {
    document.addEventListener("keydown", function (e) {
        var request = '';

        switch (e.keyCode) {
            case response.play.code:
                if (e.ctrlKey == response.play.ctrl && e.altKey == response.play.alt && e.shiftKey == response.play.shift) {
                    request = "play";
                }
                break;
            case response.skip.code:
                if (e.ctrlKey == response.skip.ctrl && e.altKey == response.skip.alt && e.shiftKey == response.skip.shift) {
                    request = "skip";
                }
                break;
            case response.like.code:
                if (e.ctrlKey == response.like.ctrl && e.altKey == response.like.alt && e.shiftKey == response.like.shift) {
                    request = "like";
                }
                break;
            case response.dislike.code:
                if (e.ctrlKey == response.dislike.ctrl && e.altKey == response.dislike.alt && e.shiftKey == response.dislike.shift) {
                    request = "dislike";
                }
                break;
            case response.tired.code:
                if (e.ctrlKey == response.tired.ctrl && e.altKey == response.tired.alt && e.shiftKey == response.tired.shift) {
                    request = "tired";
                }
                break;
            default:
                return;
        }
        
	if (request!=''){
	   // alert(request);
 	       chrome.extension.sendRequest(request);
	}
    });

});