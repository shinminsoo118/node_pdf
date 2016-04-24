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

function cloneVideoUp(domId, socketId) {
    var video = document.getElementById(domId);
    var clone = video.cloneNode(false);
    clone.id = "remote" + socketId;

    document.getElementById('link' + socketId).appendChild(clone);
    //document.getElementById('big');
    videos.push(clone);

    return clone;
}
function cloneVideo(domId, socketId) {
    var video = document.getElementById(domId);
    var clone = video.cloneNode(false);
    clone.id = "remote" + socketId;
    $("#video_teacher").attr("socketid", socketId);

    document.getElementById('videosul').appendChild(li);
    videos.push(clone);
    console.log("cloneVideo.. clone.id1 -> " + clone.id);

    ////////////////////////
    var li = document.createElement("li");
    li.id = "li" + socketId;
    var linkYou = document.createElement("a");
    /* linkYou.href = 'javascript:refresh("'+URLEncode(clone.src)+'");'; */
    linkYou.href = "#";
    linkYou.id = "link" + socketId;
    li.appendChild(linkYou);
    document.getElementById('videosul').appendChild(li);
    videos.push(clone);

    document.getElementById('link' + socketId).appendChild(clone);
    /////////////////////
    videos.push(clone);

    var aYou = document.createElement("span");
    aYou.innerHTML = '&nbsp;';
    document.getElementById('videos').appendChild(aYou);
    videos.push(clone);

    /* $("#link" + socketId).toggle(
            function(){
                $("#remote" + socketId).css({"width":"316px","height":"240"});
            },
            function(){
                $("#remote" + socketId).css({"width":"154px","height":"120"});
            }
    ); */

    $("#link" + socketId).toggle(

      function () {
          $("#big").animate({
              width: "0",
              height: "0",
              opacity: 0,
              marginLeft: "313px",
              fontSize: "3em",
              borderWidth: "10px",
              marginTop: "450px"
          }, 700);
          $("#big").attr("src", clone.src);
          $("#big").animate({
              width: "416",
              height: "320",
              opacity: 1,
              marginLeft: "0px",
              fontSize: "3em",
              borderWidth: "10px",
              marginTop: "0px"
          }, 700);
      },
      function () {
      }
    );
    return clone;
}

function removeVideo(socketId) {
    var video = document.getElementById('li' + socketId);
    if (video) {
        videos.splice(videos.indexOf(video), 1);
        video.parentNode.removeChild(video);
    }
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
    /*
            button.addEventListener('click', function(event) {
                var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
                var string_length = 8;
                var randomstring = '';
                for (var i=0; i<string_length; i++) {
                  var rnum = Math.floor(Math.random() * chars.length);
                  randomstring += chars.substring(rnum,rnum+1);
                }
                
                window.location.hash = randomstring;
                location.reload();
            });
    */
}

function initChat() {
    var input = document.getElementById("chatinput");
    //var room = window.location.hash.slice(1);
    var room = 1;
    var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

    rtc.on('receive_chat_msg', function (data) {
        console.log(data.color);
        addToChat(data.messages, data.color.toString(16));
    });
}

function refresh(u, socketId) {
    console.log("refresh u");
    $("#video_teacher").empty();
    var videosContainer = document.getElementById("video_teacher");

    var htmlElement = document.createElement('video');
    htmlElement.setAttribute('autoplay', true);
    htmlElement.setAttribute('width', '100%');
    htmlElement.setAttribute('height', '100%');
    htmlElement.setAttribute('src', u);
    htmlElement.setAttribute('socket_id', socketId);
    htmlElement.setAttribute('volume', 0.5);
    //need to modify
    videosContainer.insertBefore(htmlElement, videosContainer.firstChild);
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
    console.log("student start init()....");

    sFlag = 1; // student flag set
    sStreamInfo = new Array(); // stream info
    endTimer();
    startTimer();

    if (PeerConnection) {
        console.log("student PeerConnection Start....");
        //rtc.createStream({"video": true, "audio": true}, function(stream) {
        rtc.createStream({ "video": true, "audio": false }, function (stream) {
            console.log("student createStream Start....");
        });
    } else {
        alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
    }

    //var room = window.location.hash.slice(1);
    var room = 1;

    //When using localhost
    //rtc.connect("ws://203.216.164.178:5500/", room);
    rtc.connect("ws://knowledgepoint.co.kr:5501/", room, sFlag);
    //rtc.connect("ws://localhost:5500/", room);
    //rtc.connect("http://knowledgepoint.co.kr:5500/", room);

    rtc.on('add remote stream', function (stream, socketId) {
        console.log("--------ADDING REMOTE STREAM... socketId -> " + socketId+" stream id .... -> " + stream.id);
        /*
                  var clone = cloneVideo('you', socketId);
                  console.log('clone id -> ' + clone.id);
                  document.getElementById(clone.id).setAttribute("class", "");
                  rtc.attachStream(stream, clone.id);
                  subdivideVideos();
        */
        //localMediaStream.stop();
        var tCheckVal = rtc.getTeacherStreamId(socketId, stream.id);
        sStreamInfo.push(stream);
        //console.log(" stream info .... -> " + stream + " ended -> " + stream.ended);
        console.log(" stream id .... -> " + stream.id);
        if (stream) {
        	console.log("스트림 있음");
//            var uBig = URL.createObjectURL(stream);
//            refresh(uBig, stream.id);
        }else{
        	console.log("스트림 없음");
        }
        /*
                  if(localMediaStream) {  
                    localMediaStream.stop();
                    localMediaStream = false;
        console.log("localMediaStream stop....");
                  }
        */
    });

    //this! problem
    rtc.on('get_stream_id', function(data) {
			for(i in sStreamInfo){
				console.log(i+'    >>>>recv get_stream_id -> ' + data.teacher_stream_id + " temp id -> " + sStreamInfo[i].id  + " socket_id -> " + data.socket_id);
				if( data.teacher_stream_id == sStreamInfo[i].id ) {
		            console.log('>>>>recv mainview get_stream_id -> ' + data.teacher_stream_id + " temp id -> " + sStreamInfo[i].id);
		            var uBig = URL.createObjectURL(sStreamInfo[i]);
		            refresh(uBig, data.teacher_stream_id);
		            
		          for (var i = 0; i < rtc.streams.length; i++) {
		            console.log('>>>>rtc.streams -> ' + i + " id -> " + rtc.streams[i].id);
		            if( rtc.streams[i].id == data.teacher_stream_id ) {
		              var uBig = URL.createObjectURL(rtc.streams[i]);
		              refresh(uBig, data.teacher_stream_id);
		              break;
		            }
		          }
		        }
			}
    });
    


    rtc.on('disconnect stream', function (data) {
        console.log('remove1' + data);
    });
    //initNewRoom();
    //initChat();
}

window.onresize = function (event) {
    subdivideVideos();
};

$("#movIcon02").click(function () {
    window.close();
});

var secondTime = 0; var timer; var sec = 0; var min = 0; var hours = 0; var days = 0;

function startTimer() {
    secondTime = 0; timer = null; sec = 0; min = 0; hours = 0; days = 0;
    timer = setInterval(function () {

        secondTime += 1000;
        sec = Math.floor(secondTime / 1000);
        min = Math.floor(sec / 60);
        hours = Math.floor(min / 60);
        days = Math.floor(hours / 24);
        $("#timer").text(zeroText((hours % 24) + (days * 24)) + ":" + zeroText(min % 60) + ":" + zeroText(sec % 60));
    }, 1000);
    function zeroText(value) {
        if (value < 10) {
            return "0" + value;
        } else {
            return value;
        }
    }
};

function endTimer() {
    clearInterval(timer);
    secondTime = 0;
    sec = 0;
    min = 0;
    hours = 0;
    days = 0;
    $("#timer").text("00:00:00");
};