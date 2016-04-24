// JavaScript Document$
// hwcho 2014-05-29 대화 상대 저장
window.connectId = null;
window.beforeTarget = null;
var teacherId = null;
var TIMMER = null;

$(function () {
    $(".tab ul li").on("click", function () {
        $(".tab ul li").css('background-position-y', 'top');
        $(this).css('background-position-y', 'bottom');
        sideMenuOpen();

        if ($(this).attr('class') == 'aside_menu3') {
            allHide();
            $("#video_page").show();
        } else if ($(this).attr('class') == 'aside_menu2') {
            allHide();
            $("#gap_page").show();
        }

    });

    // hwcho 2014-05-29 연결 종료.
    $(".video_position ul li span.hover_image").click(function () {
        var $video = $(this).prev();
        console.log($video.attr("id"));

        if ($video.attr("status") == "on") {
            // hwcho 2014-05-30 학생 이미지 변경.
            $video.attr("status", "off");
            $("#" + $video.attr("id")).hide();

            var end = $video.attr("id").split("_");
            var roomJidAll = end[1] + "@" + Judoonge.serverInfo.conferenDomain;

            if ($("#studentList-" + $video.attr("student")).attr("status") == "on") {
                $("#studentList-" + $video.attr("student") + " a img").attr("src", "image/student_on_image.png");
            } else if ($("#studentList-" + $video.attr("student")).attr("status") == "off") {
                $("#studentList-" + $video.attr("student") + " a img").attr("src", "image/student_off_image.png");
            }

            Judoonge.Core.Action.Jabber.Room.Leave(roomJidAll);
            bye($video.attr("student") + "@" + Judoonge.serverInfo.basicDomain + "/" + $video.attr("student"));
            $video.attr("student", "");
            $video.attr("src", "");
        }
    });


    // hwcho 2014-05-29 student 수락
    $("#accept").click(function () {
        $("#accept").hide();
        $("#studentList-" + teacherId + " a img").attr("src", "image/student_connect_image.png");
        webrtc.acceptCall(remoteParty);
    });


    // VIDEO SECTION IMAGE EVENT
    $(".video_position ul li").click(function () {

    });

    // STUDENT SECTION IMAGE EVENT
    $(".student_scroll ol li").click(function () {

    });
});

function sideMenuOpen() {
    $('.aside').animate({
        right: '0%'
    }, 500);
}

function allHide() {
    $("#video_page").hide();
    $("#gap_page").hide();
}

// --------------------------------- IMAGE CHANGE ACTION
// -------------------------------------- //
function videoSectionImg_off() {
    $(".video_position ul li img").attr('src', 'image/video_OFF_image.png');
}
function videoSectionImg_on() {
    $(".video_position ul li img").attr('src', 'image/video_ON_image.png');
}
function videoSectionImg_connect() {
    $(".video_position ul li img").attr('src', 'image/video_CONNECT_image.png');
}
function videoSectionImg_hover() {
    $(".video_position ul li img").attr('src', 'image/video_BYE_image.png');
}

// ----------------------------------------------------
function studentSectionImg_off() {
    $(".student_scroll ol li img").attr('src', 'image/student_OFF_image.png');
}
function studentSectionImg_on() {
    $(".student_scroll ol li img").attr('src', 'image/student_ON_image.png');
}
function studentSectionImg_connect() {
    $(".student_scroll ol li img").attr('src',
			'image/student_CONNECT_image.png');
}
