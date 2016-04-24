WebRtcJingle = function () {
    this.remoteOffer = null;
    this.localStream = null;
    this.callback = null;
    this.pc = null;
    this.sid = null;
    this.farParty = null;
    this.interval = null;
    this.inviter = false;
    this.peerConfig = null;
    this.jid = null;
    this.roomJid = null;
};

WebRtcJingle.prototype.startApp = function (callback, peerConfig) {
    this.callback = callback;
    this.peerConfig = peerConfig;
};


WebRtcJingle.prototype.stopApp = function () {
    this.jingleTerminate();

    if (this.pc != null) this.pc.close();
    this.pc = null;
};

WebRtcJingle.prototype.getUserMedia = function (roomJid) {
    this.roomJid = roomJid;
    navigator.webkitGetUserMedia({ audio: true, video: true }, this.onUserMediaSuccess.bind(this), this.onUserMediaError.bind(this));
};

WebRtcJingle.prototype.onUserMediaSuccess = function (stream) {
    var url = webkitURL.createObjectURL(stream);
    this.localStream = stream;

    if (this.callback != null) {
        this.callback.startLocalMedia(url, this.roomJid);
    }
};

WebRtcJingle.prototype.onUserMediaError = function (error) {
    console.log("onUserMediaError ");
};


WebRtcJingle.prototype.onMessage = function (packet) {
    var elem = this.textToXML(packet);

    if (elem.nodeName == "iq") {
        if (elem.getAttribute("type") == "result") {
            var channels = elem.getElementsByTagName("channel");

            if (channels.length > 0) {
                var relayHost = channels[0].getAttribute("host");
                var relayLocalPort = channels[0].getAttribute("localport");
                var relayRemotePort = channels[0].getAttribute("remoteport");

                this.sendTransportInfo("0", "a=candidate:3707591233 1 udp 2113937151 " + relayHost + " " + relayRemotePort + " typ host generation 0");

                var candidate = new RTCIceCandidate({ sdpMLineIndex: "0", candidate: "a=candidate:3707591233 1 udp 2113937151 " + relayHost + " " + relayLocalPort + " typ host generation 0" });
                this.pc.addIceCandidate(candidate);
            }

        } else if (elem.getAttribute("type") != "error") {

            var jingle = elem.firstChild;
            this.sid = jingle.getAttribute("sid");

            if (jingle.nodeName == "jingle" && jingle.getAttribute("action") != "session-terminate") {
                if (this.pc == null) {
                    this.createPeerConnection();
                }

                if (jingle.getAttribute("action") == "transport-info") {
                    if (jingle.getElementsByTagName("candidate").length > 0) {
                        var candidate = jingle.getElementsByTagName("candidate")[0];
                        var ice = { sdpMLineIndex: candidate.getAttribute("label"), candidate: candidate.getAttribute("candidate") };
                        this.pc.addIceCandidate(new RTCIceCandidate(ice));
                    }

                } else {

                    if (jingle.getElementsByTagName("webrtc").length > 0) {
                        var sdp = jingle.getElementsByTagName("webrtc")[0].firstChild.data;

                        if (jingle.getAttribute("action") == "session-initiate") {
                            this.inviter = false;
                            this.remoteOffer = new RTCSessionDescription({ type: "offer", sdp: sdp });

                            // hwcho 2014-06-10 remoteOffer 저장.
                            console.log("inviter => true");
                            RTCSessionArray[this.farParty.split("@")[0]] = this.remoteOffer;
                            if (this.callback != null) {
                                this.callback.incomingCall(elem.getAttribute("from"), this.roomJid, elem.getAttribute("chatnick"));
                            }

                        } else {

                            this.inviter = true;
                            this.pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sdp }));

                            // hwcho 2014-06-10 remoteOffer 저장.
                            console.log("inviter => false");
                            RTCSessionArray[this.farParty.split("@")[0]] = this.pc;
                            this.addJingleNodesCandidates();
                        }
                    }
                }

            } else {
                this.doCallClose();
            }
        }
    }

};

WebRtcJingle.prototype.acceptCall = function (farParty) {
    this.farParty = farParty;
    this.pc.setRemoteDescription(this.remoteOffer);
};

WebRtcJingle.prototype.onConnectionClose = function () {
    this.doCallClose();
};


WebRtcJingle.prototype.jingleInitiate = function (farParty) {
    this.farParty = farParty;
    this.inviter = true;
    this.sid = "webrtc-initiate-" + Math.random().toString(36).substr(2, 9);
    sIdCounter[farParty.split("@")[0]] = this.sid;

    this.createPeerConnection();

    if (this.pc != null) {
        var webrtc = this;

        this.pc.createOffer(function (desc) {
            webrtc.pc.setLocalDescription(desc);
            webrtc.sendJingleIQ(desc.sdp);

        });
    }
};

WebRtcJingle.prototype.jingleTerminate = function (remoteParty) {
    

    // hwcho 2014-06-10 sid 찾기
    this.farParty = remoteParty;

    for (var i in sIdCounter) {
        if (i == (this.farParty).split("@")[0]) {
            this.sid = sIdCounter[i];
            this.pc = RTCSessionArray[i];
        }
    }

    this.sendJingleTerminateIQ();
    this.doCallClose();
};

WebRtcJingle.prototype.doCallClose = function () {
    if (this.pc != null) this.pc.close();
    this.pc = null;

    if (this.callback != null) {
        this.callback.terminatedCall();
    }
};


WebRtcJingle.prototype.createPeerConnection = function () {
    this.pc = new window.webkitRTCPeerConnection(this.peerConfig);
    this.pc.onicecandidate = this.onIceCandidate.bind(this);
    this.pc.onstatechange = this.onStateChanged.bind(this);
    this.pc.onopen = this.onSessionOpened.bind(this);
    this.pc.onaddstream = this.onRemoteStreamAdded.bind(this);
    this.pc.onremovestream = this.onRemoteStreamRemoved.bind(this);
    this.pc.addStream(this.localStream);
};

WebRtcJingle.prototype.onIceCandidate = function (event) {
    if (event.candidate && this.callback != null) {
        this.sendTransportInfo(event.candidate.sdpMLineIndex, event.candidate.candidate);
    }
};


WebRtcJingle.prototype.sendTransportInfo = function (sdpMLineIndex, candidate) {
    var id = "webrtc-jingle-" + Math.random().toString(36).substr(2, 9);
    var jingleIq = "<iq type='set' to='" + this.farParty + "' id='" + id + "'>";
    jingleIq = jingleIq + "<jingle xmlns='urn:xmpp:jingle:1' action='transport-info' initiator='" + this.jid + "' sid='" + this.sid + "'>";
    jingleIq = jingleIq + "<transport xmlns='http://phono.com/webrtc/transport'><candidate label='" + sdpMLineIndex + "' candidate='" + candidate + "' /></transport></jingle></iq>";
    this.callback.sendPacket(jingleIq);
};

WebRtcJingle.prototype.onSessionOpened = function (event) {
};

WebRtcJingle.prototype.onRemoteStreamAdded = function (event) {
    var url = webkitURL.createObjectURL(event.stream);

    if (this.inviter == false) {
        var webrtc = this;

        this.pc.createAnswer(function (desc) {
            webrtc.pc.setLocalDescription(desc);
            webrtc.sendJingleIQ(desc.sdp);
        });
    }

    if (this.callback != null) {
        this.callback.startRemoteMedia(url, this.farParty, this.roomJid);
    }
};

WebRtcJingle.prototype.onRemoteStreamRemoved = function (event) {
    var url = webkitURL.createObjectURL(event.stream);
};

WebRtcJingle.prototype.onStateChanged = function (event) {
    console.log("onStateChanged", event);
};


WebRtcJingle.prototype.sendJingleTerminateIQ = function () {
    if (this.callback != null) {
        var id = "webrtc-jingle-" + Math.random().toString(36).substr(2, 9);
        var jIQ = "<iq type='set' to='" + this.farParty + "' id='" + id + "'>";
        jIQ = jIQ + "<jingle xmlns='urn:xmpp:jingle:1' action='session-terminate' initiator='" + this.jid + "' sid='" + this.sid + "'>";
        jIQ = jIQ + "<reason><success/></reason></jingle></iq>";

        console.log("jiq => ", jIQ);
        this.callback.sendPacket(jIQ);

        this.farParty = null;
    }
};


WebRtcJingle.prototype.sendJingleIQ = function (sdp) {
    if (this.callback == null) {
        return;
    }

    var action = this.inviter ? "session-initiate" : "session-accept";
    var iq = "";
    var id = "webrtc-jingle-" + Math.random().toString(36).substr(2, 9);
    var jidsplit = this.farParty.split("/");
    var getjid = jidsplit[1];
    var chatnick = $("#myprofileTxt").data("name");


    iq += "<iq type='set' to='" + this.farParty + "' id='" + id + "' chatnick='" + chatnick + "'>";
    iq += "<jingle xmlns='urn:xmpp:jingle:1' action='" + action + "' initiator='" + this.jid + "' sid='" + this.sid + "'>";
    iq += "<webrtc xmlns='http://webrtc.org'>" + sdp + "</webrtc>";
    iq += "</jingle></iq>";

    this.callback.sendPacket(iq);
};


WebRtcJingle.prototype.textToXML = function (text) {
    var doc = null;

    if (window['DOMParser']) {
        var parser = new DOMParser();
        doc = parser.parseFromString(text, 'text/xml');
    } else if (window['ActiveXObject']) {
        var doc = new ActiveXObject("MSXML2.DOMDocument");
        doc.async = false;
        doc.loadXML(text);
    } else {
        throw Error('No DOMParser object found.');
    }

    return doc.firstChild;
};

WebRtcJingle.prototype.addJingleNodesCandidates = function () {
    var iq = "";
    var id = "jingle-nodes-" + Math.random().toString(36).substr(2, 9);

    iq += "<iq type='get' to='" + "relay." + window.location.hostname + "' id='" + id + "'>";
    iq += "<channel xmlns='http://jabber.org/protocol/jinglenodes#channel' protocol='udp' />";
    iq += "</iq>";

    this.callback.sendPacket(iq);
};