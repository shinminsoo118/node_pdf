//CLIENT

// Fallbacks for vendor-specific variables until the spec is finalized.

var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection;
var URL = window.URL || window.webkitURL || window.msURL || window.oURL;
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
var sFlag = 1; //student flag
var localMediaStream = false;
var localMediaStreamTeacher = false;

(function () {

    var rtc;
    if ('undefined' === typeof module) {
        rtc = this.rtc = {};
    } else {
        rtc = module.exports = {};
    }


    // Holds a connection to the server.
    rtc._socket = null;

    // Holds identity for the client
    rtc._me = null;

    // Holds callbacks for certain events.
    rtc._events = {};

    rtc.on = function (eventName, callback) {
        rtc._events[eventName] = rtc._events[eventName] || [];
        rtc._events[eventName].push(callback);
    };

    rtc.fire = function (eventName, _) {
        var events = rtc._events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);

        if (!events) {
            return;
        }

        for (var i = 0, len = events.length; i < len; i++) {
            events[i].apply(null, args);
        }
    };

    // Holds the STUN/ICE server to use for PeerConnections.
    rtc.SERVER = { iceServers: [{ url: "stun:stun.l.google.com:19302" }] };

    // Referenc e to the lone PeerConnection instance.
    rtc.peerConnections = {};

    // Array of known peer socket ids
    rtc.connections = [];
    // Stream-related variables.
    rtc.streams = [];
    rtc.numStreams = 0;
    rtc.initializedStreams = 0;

    /**
     * Connects to the websocket server.
     */
    //rtc.connect = function(server, room) {
    rtc.connect = function (server, room, studFlag) {
        room = room || ""; // by default, join a room called the blank string
        rtc._socket = new WebSocket(server);

        rtc._socket.onopen = function () {

            rtc._socket.send(JSON.stringify({
                "eventName": "join_room",
                "data": {
                    "room": room,
                    "flag": studFlag
                }
            }));

            rtc._socket.onmessage = function (msg) {
                var json = JSON.parse(msg.data);
                //debug
//                console.log("onmessage -> " + msg.data);
                rtc.fire(json.eventName, json.data);
//                console.log("onmessage json.data -> " + json.data);

                //        if(json.eventName == "add remote stream") {
                //          console.log(">>>>>>>>>>>>>>eventName -> " + json.eventName);
                //        }
            };

            rtc._socket.onerror = function (err) {
                console.error('onerror');
                console.error(err);
            };

            rtc._socket.onclose = function (data) {
                rtc.fire('disconnect stream', rtc._socket.id);
                delete rtc.peerConnections[rtc._socket.id];
            };

            rtc.on('get_peers', function (data) {
            	console.log("get_peers", data);
                rtc.connections = data.connections;
                rtc._me = data.you;
                
                //하나 
//                if(sFlag){
//                	console.log('get_peers connections push');
//                	rtc.connections.push(data.you);
//                	rtc.fire('ready');
//                }
                
                // fire connections event and pass peers
                rtc.fire('connections', rtc.connections);
            });

            rtc.on('receive_ice_candidate', function (data) {
                var candidate = new RTCIceCandidate(data);
                rtc.peerConnections[data.socketId].addIceCandidate(candidate);
                rtc.fire('receive ice candidate', candidate);
            });

            rtc.on('new_peer_connected', function (data) {

                //data.socketId = data.socketId + studFlag; 
                rtc.connections.push(data.socketId);
                //console.log("new_peer_connected....-> " + data.socketId);

                //var pc = rtc.createPeerConnection(data.socketId);
                var pc = rtc.createPeerConnection(data.socketId, studFlag);
                for (var i = 0; i < rtc.streams.length; i++) {
                    var stream = rtc.streams[i];
                    pc.addStream(stream);
                }
            });

            rtc.on('remove_peer_connected', function (data) {
            	var videoid = $("#video_teacher video").attr("socket_id");

            	console.log(">>>remove_peer_connected....-> " + data.socketId);
            	console.log("video id ", videoid);
            	
//        		if(videoid == data.socketId){
//        			$("#video_teacher").empty();
//            	 	delete rtc.peerConnections[data.socketId];
//        		}
        		
                if (sFlag == 1) {
                    rtc.fire('disconnect stream', data.socketId);
                    delete rtc.peerConnections[data.socketId];
                }
            });

            rtc.on('receive_offer', function (data) {
                console.log(">>>receive_offer....-> ", data.sdp);
                rtc.receiveOffer(data.socketId, data.sdp);
                rtc.fire('receive offer', data);
            });

            rtc.on('receive_answer', function (data) {
                console.log(">>>receive_answer....-> " + data.socketId);
                rtc.receiveAnswer(data.socketId, data.sdp);
                rtc.fire('receive answer', data);
            });

            rtc.fire('connect');
        };
    };


    rtc.sendOffers = function () {
        for (var i = 0, len = rtc.connections.length; i < len; i++) {
            var socketId = rtc.connections[i];
            rtc.sendOffer(socketId);
        }
    };

    rtc.onClose = function (data) {
        rtc.on('close_stream', function () {
            rtc.fire('close_stream', data);
        });
    };

    rtc.createPeerConnections = function () {
        for (var i = 0; i < rtc.connections.length; i++) {
            console.log(">>>rtc.createPeerConnections...i  -> " + i + " connection -> " + rtc.connections[i]);
            rtc.createPeerConnection(rtc.connections[i]);
        }
    };

    rtc.createPeerConnection = function (id) {
    	console.log("createPeerConnection", id);
        console.log(">>>createPeerConnection.. rtc.SERVER -> " + rtc.SERVER);
        var pc = rtc.peerConnections[id] = new PeerConnection(rtc.SERVER);
        pc.onicecandidate = function (event) {
            if (event.candidate) {
                rtc._socket.send(JSON.stringify({
                    "eventName": "send_ice_candidate",
                    "data": {
                        "label": event.candidate.label,
                        "candidate": event.candidate.candidate,
                        "socketId": id
                    }
                }));
            }
            rtc.fire('ice candidate', event.candidate);
        };

        pc.onopen = function () {
            console.log(">>>peer connection opened....");
            // TODO: Finalize this API
            rtc.fire('peer connection opened');
        };

        pc.onaddstream = function (event) {
            console.log(">>>add remote stream.... id -> " + id);

            // student check
            //    for (var i = 0; i < rtc.connections.length; i++) {
            //console.log(">>>connect check...i  -> " + i + " connection -> " + rtc.connections[i]);
            //    }

            // TODO: Finalize this API
            rtc.fire('add remote stream', event.stream, id);
            //rtc.fire('add remote stream', rtc.streams[0], id);
            //rtc.fire('add remote stream', event.stream, id, sFlag);
            //if( !sFlag ) rtc.fire('add remote stream', event.stream, id);
        };
        return pc;
    };

    rtc.sendOffer = function (socketId, sFlagParam) {
        var pc = rtc.peerConnections[socketId];
        pc.createOffer(function (session_description) {
            pc.setLocalDescription(session_description);
            rtc._socket.send(JSON.stringify({
                "eventName": "send_offer",
                "data": {
                    "socketId": socketId,
                    "sdp": session_description
                }
            }));
            rtc._socket.send(JSON.stringify({
                "eventName": "send_offer2",
                "data": {
                    "socketId": socketId,
                    "sFlagParam": sFlagParam
                }
            }));
        });
    };
    rtc.sendOffer = function (socketId) {
        var pc = rtc.peerConnections[socketId];
        pc.createOffer(function (session_description) {
            pc.setLocalDescription(session_description);
            rtc._socket.send(JSON.stringify({
                "eventName": "send_offer",
                "data": {
                    "socketId": socketId,
                    "sdp": session_description
                }
            }));
            rtc._socket.send(JSON.stringify({
                "eventName": "send_offer2",
                "data": {
                    "socketId": socketId,
                    "sFlag": sFlag
                }
            }));
        });
    };



    rtc.receiveOffer = function (socketId, sdp) {
    	console.log("receiveoffer peerconection", socketId);
        var pc = rtc.peerConnections[socketId];
        pc.setRemoteDescription(new RTCSessionDescription(sdp));
        rtc.sendAnswer(socketId);
    };


    rtc.sendAnswer = function (socketId) {
    	console.log("sendAnswer", socketId);
        var pc = rtc.peerConnections[socketId];
        pc.createAnswer(function (session_description) {
            pc.setLocalDescription(session_description);
            rtc._socket.send(JSON.stringify({
                "eventName": "send_answer",
                "data": {
                    "socketId": socketId,
                    "sdp": session_description
                }
            }));
            var offer = pc.remoteDescription;
        });
    };


    rtc.receiveAnswer = function (socketId, sdp) {
        var pc = rtc.peerConnections[socketId];
        pc.setRemoteDescription(new RTCSessionDescription(sdp));
    };


    rtc.createStream = function (opt, onSuccess, onFail) {
        var options;
        onSuccess = onSuccess ||
        function () { };
        onFail = onFail ||
        function () { };

        if (opt.audio && opt.video) {
            options = {
                video: true,
                audio: true
            };
        } else if (opt.video) {
            options = {
                video: true,
                audio: false
            };
        } else if (opt.audio) {
            options = {
                video: false,
                audio: true
            };
        } else {
            options = {
                video: false,
                audio: false
            };
        }

        console.log("sFlag -> " + sFlag);
        //if (getUserMedia && sFlag) {
//        if(sFlag){
//            rtc.numStreams++;
//            rtc.initializedStreams++;
//            onSuccess();
////            if (rtc.initializedStreams === rtc.numStreams) {
////                rtc.fire('ready');
////            }
//        }else 
        	if (getUserMedia) {
            rtc.numStreams++;
            getUserMedia.call(navigator, options, function (stream) {
                console.log("rtc.streams.push() start... ");
                rtc.streams.push(stream);
                if (sFlag) {
                    localMediaStream = stream;
                    //stream.id = 1;
                    stream.stop();
                    //stream.removeTrack(1);
                    //stream = null;
                    //stream.pause();
                } else {
                    //stream.id = 2;
                    //stream.stop();
                    //localMediaStreamTeacher = stream;     
                    // teacher stream id send
                    rtc._socket.send(JSON.stringify({
                        "eventName": "teacher_id",
                        "data": {
                            "stream_id": stream.id
                        }
                    }));
                }
                rtc.initializedStreams++;
                onSuccess(stream);
                if (rtc.initializedStreams === rtc.numStreams) {
                    rtc.fire('ready');
                }
            }, function () {
                alert("Could not connect stream.");
                onFail();
            });
        } else {
            //alert('webRTC is not yet supported in this browser.');
        }
    };


    rtc.addStreamsUp = function () {
        var stream = rtc.streams[0];
        rtc.peerConnections[0].addStream(stream);
    };
    rtc.addStreams = function () {
        for (var i = 0; i < rtc.streams.length; i++) {
            var stream = rtc.streams[i];
            for (var connection in rtc.peerConnections) {
                rtc.peerConnections[connection].addStream(stream);
            }
        }
    };


    rtc.attachStream = function (stream, domId) {
        document.getElementById(domId).src = URL.createObjectURL(stream);
    };

    rtc.getTeacherStreamId = function (reqSocket, tStreamId) {
        console.log("rtc.getTeacherStreamId.. start.. reqSocket  -> " + reqSocket + " tStreamId -> " + tStreamId);

        //rtc._socket.send(reqSocket, JSON.stringify({
        rtc._socket.send(JSON.stringify({
            "eventName": "get_teacher_id",
            "data": {
                "stream_id": tStreamId
            }
        }));
    };


    rtc.on('ready', function () {
        console.log("rtc.on ready..start...sFlag -> " + sFlag);
        rtc.createPeerConnections();
        rtc.addStreams();
        //if(!sFlag) rtc.addStreamsUp();
        rtc.sendOffers();
    });

}).call(this);
