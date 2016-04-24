// JavaScript source code

$(function () {
    // 뒤로가기 방지
    window.history.forward(1);

    // 키 방지
    $(document).keydown(doNotReload);

    // 마우스 오른쪽버튼 막기
//    $(document)[0].oncontextmenu = function () {
//        return false;
//    };

    // 드레그 방지
    $(document).on("contextmenu", function () {
        return false;
    });

    $(document).on("mousedown", function () {
        return false;
    });

    // 화면 크기 변경 시 canvas 좌표 리사이즈
    $(window).resize(function () {
        canvasResize();
    });

    //// 지도 표시
    //$("#map_show").click(map_show);

    //// 검색버튼을 눌렀을 때
    //$("#map_search").click(map_search);

    //// 텍스트 상자에서 enter를 눌렀을 때
    //$("#map_text").keydown(function (key) {
    //    // 눌린키가 enter일 경우
    //    if (key.keyCode == "13") {
    //        map_search();
    //    }
    //});

    //// 맵 축소
    //$("#map_scale_min").click("min", map_scale);

    //// 맵 확대
    //$("#map_scale_plus").click("max", map_scale);

    //// 스트리트 뷰
    //$("#map_save").click(map_save);

    //그림판 표시
    $("#canvas_show").click(function () {
        if (!CANVAS_ON_CHECK) {
            $("#canvas_view").css("cursor", "url(./image/icon02.cur), url(./image/icon02.png), pointer");
            canvasShow();
            startCanvas();
            buttonShow();
            CANVAS_ON_CHECK = true;
        } else {
        	buttonHide();
            canvasEnd();
            CANVAS_ON_CHECK = false;
        }
    });

    // 브러쉬 변경
    $("#pen").click(function () {
        if (CANVAS_ON_CHECK) {
            ERASER_CHECK = false;
            $("#canvas_view").css("cursor", "url(./image/icon02.cur), url(./image/icon02.png), pointer");
        }
    });

    // 사이즈 변경
    $("#size").slider({
        range: "min",
        min: 10,
        max: 100,
        step: 10,
        value: 10,
        slide: function (event, ui) {
            toolChange($("#color").val(), ui.value, $("#tool").val());
        }
    });

    // 브러쉬 변경
    $("#tool").change(function () {

    });

    // 지우개
    $("#eraser").click(function () {
        if (CANVAS_ON_CHECK) {
            ERASER_CHECK = true;
            $("#canvas_view").css("cursor", "url(./image/icon03.cur), url(./image/icon03.png), pointer");
        }
    });

    // 모두 지우기
    $("#eraser").dblclick(function () {
        if (CANVAS_ON_CHECK) {
            sendClean();
        }
    });

    // 지우개 사이즈 변경
    $("#eraser_size").slider({
        range: "min",
        min: 10,
        max: 50,
        step: 10,
        value: 10,
        slide: function (event, ui) {
            eraserSize = ui.value;
        }
    });

    // 마우스 누름
    $("#canvas_view").mousedown(function (event) {
        startPoint = getPosition(event);

        prevent = true;

        // attach event handlers
        $(this).mousemove(function (event) { // 마우스 이동
            draw(event);
        }).mouseup(function (event) { // 마우스 띔
            finishDrawing(event);
        }).mouseout(function (event) { // 영역 밖으로 나감
            finishDrawing(event);
        });
    });

    document.addEventListener('touchmove', function (event) {
        if (prevent) {
            event.preventDefault();
        }

        return event;
    }, false);


    // 문서 공유
    $("#fileUpload").click(function () {
        if (!CANVAS2_ON_CHECK) {
            $(".inputBox").show();
            CANVAS2_ON_CHECK = true;
        } else {
        	buttonHide();
            sendDocEnd();
            CANVAS2_ON_CHECK = false;
        }
    });

    // 문서공유 OK
    $("#sendDoc").click(function () {
        $(".loading").show();
        pdfcoverting();
    });

    // 문서공유 Cancel
    $("#closeDoc").click(function () {
        $(".inputBox").hide();
        CANVAS2_ON_CHECK = false;
    });
});

// 버튼 보이기
function buttonShow() {
    $(".curColorPicker").show();
    $(".btnGrp .left").show();
}

// 버튼 숨기기
function buttonHide() {
	console.log("버튼 안녕");
	
    $(".curColorPicker").hide();
    $(".btnGrp .left").hide();
    $("#canvas_view").hide();
}

// 사용자 canvas 숨기기
function canvasHide() {
    console.log("canvas 종료");

    $("#canvas_view").hide();
    $("#the_canvas").hide();
    $("#pdfview_one").hide();
}

function doNotReload() {
    if ((event.ctrlKey == true && (event.keyCode == 78 || event.keyCode == 82)) //ctrl+N , ctrl+R 
        || (event.keyCode >= 112 && event.keyCode <= 123)) // function F5
    {
        event.keyCode = 0;
        event.cancelBubble = true;
        event.returnValue = false;
    }
}