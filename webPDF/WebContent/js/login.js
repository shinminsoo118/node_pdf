// JavaScript Document
/* ###################### drag & drop ################ */
var JudoongeUrl = "knowledgepoint.co.kr";

// 로컬이나 Judoonge 에서 접속 하면 Judoonge TB 로 연결하고 나머지는 DKI TB 로 연결 
var lHostname = window.location.hostname;
var lHostname = Judoonge.serverInfo.connectUrl;
$(function () {
    Judoonge.Util.ClearStorage();
    if (lHostname == "127.0.0.1" || lHostname == "localhost" || lHostname == "124.194.123.243" || lHostname == "knowledgepoint.co.kr") {
        Judoonge.init('http://knowledgepoint.co.kr:7070/http-bind/', {
            core: { debug: true, autojoin: ['test@conference.knowledgepoint.co.kr'] },
            view: { resources: 'res/' }
        });
        Judoonge.Core.connect();
    }
});