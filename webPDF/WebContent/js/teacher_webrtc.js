var videos = [];
var bigVideos = [];
var rooms = [1, 2, 3, 4, 5];
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection;

function getNumPerRow() {
    var len = videos.length;
    var biggest;

    // Ensure length is even for better division.
    if (len % 2 === 1) {
        len++;
    }

    biggest = Math.ceil(Math.sqrt(len));
    while (len % biggest !== 0) {
        biggest++;
    }
    return biggest;
}

function subdivideVideos() {
    var perRow = getNumPerRow();
    var numInRow = 0;
    //var bigVideo = videos[0];
    //setBigWH(bigVideo, 0);
    for (var i = 0, len = videos.length; i < len; i++) {
        var video = videos[i];
        setWH(video, i);
        numInRow = (numInRow + 1) % perRow;
    }
}

function setWH(video, i) {
    var perRow = getNumPerRow();
    var perColumn = Math.ceil(videos.length / perRow);
    var width = Math.floor((window.innerWidth) / perRow);
    var height = Math.floor((window.innerHeight - 190) / perColumn);
    video.width = 98;
    video.height = 80;
}




function addToChat(msg, color) {
    var messages = document.getElementById('messages');
    msg = sanitize(msg);
    if (color) {
        msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
    } else {
        msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
    }
    messages.innerHTML = messages.innerHTML + msg + '<br>';
    messages.scrollTop = 10000;
}

function sanitize(msg) {
    return msg.replace(/</g, '&lt;');
}

function initNewRoom() {
    var button = document.getElementById("newRoom");
}

function initChat() {
    rtc.on('receive_chat_msg', function (data) {
        console.log(data.color);
        addToChat(data.messages, data.color.toString(16));
    });
}

function refresh(u) {
    $("#video_teacher").empty();
    var videosContainer = document.getElementById("video_teacher");

    var htmlElement = document.createElement('video');
    htmlElement.setAttribute('id', "tVideo");
    htmlElement.setAttribute('autoplay', true);
    htmlElement.setAttribute('width', '100%');
    htmlElement.setAttribute('height', '100%');
    htmlElement.setAttribute('src', u);
    htmlElement.setAttribute('volume', 0.5);
    
    //need to modify
    videosContainer.insertBefore(htmlElement, videosContainer.firstChild);
    //        bigVideos.push(document.getElementById('big'));
}

function URLEncode(clearString) {
    var output = '';
    var x = 0;
    clearString = clearString.toString();
    var regex = /(^[a-zA-Z0-9_.]*)/;
    while (x < clearString.length) {
        var match = regex.exec(clearString.substr(x));
        if (match != null && match.length > 1 && match[1] != '') {
            output += match[1];
            x += match[1].length;
        } else {
            if (clearString[x] == ' ')
                output += '+';
            else {
                var charCode = clearString.charCodeAt(x);
                var hexVal = charCode.toString(16);
                output += '%' + hexVal.toUpperCase();
            }
            x++;
        }
    }
    return output;
}

function init() {
    sFlag = 0;
    if (PeerConnection) {
        rtc.createStream({ "video": true, "audio": true }, function (stream) {

            var u = URL.createObjectURL(stream);
            refresh(u);
            subdivideVideos();
        });
    } else {
        alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
    }

    var room = 1;

    rtc.connect("ws://knowledgepoint.co.kr:5501/", room, sFlag);

    rtc.on('disconnect stream', function (data) {
        console.log('remove ' + data);
    });
    initNewRoom();
    initChat();
}

window.onresize = function (event) {
    subdivideVideos();
};

//hana
$("#movIcon02").click(function () {
    window.close();
});
