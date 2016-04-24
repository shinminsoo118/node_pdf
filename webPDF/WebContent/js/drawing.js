// JavaScript source code

// 캔버스 지정.
var canvas; 
// 캔버스 라인 색상
var brushColor = "rgba(0,0,0,1)";
// 캔버스 라인 사이즈
var brushSize = 10;
// 캔버스 라이 투명도 
var alpha = 1;
// 캔버스 라인 블러 크기
var blur = 0;
// Marker 옵션
var comPostition = "source-over";
// 마우스를 사용하는지 체크
var prevent = false;
// 현재 포인트와 과거 포인트
var startPoint, endPoint;
// canvas on/off 체크
var CANVAS_ON_CHECK = false;
var CANVAS2_ON_CHECK = false;

// 지우개 온/오프
var ERASER_CHECK = false;
// 지우개 크기
var eraserSize = 10;

// 마우스 좌표 리턴
function getPosition(event) {
    var rect = canvas.getBoundingClientRect();

    return {
        X: event.clientX - rect.left,
        Y: event.clientY - rect.top
    };
}

function canvasShow() {
    $("#canvas_view").show();
    // canvas 지원여부 확인
    canvasCheck();
    console.log("canvas run");
    canvas = document.getElementById("canvas_view");
    var context = canvas.getContext("2d");

    context.canvas.width = $("#canvas_view").width();
    context.canvas.height = $("#canvas_view").height();
}

function draw(event) {
    if (prevent) {
        endPoint = getPosition(event);

        console.log("draw ERASER_CHECK => ", ERASER_CHECK);
        if (ERASER_CHECK) {
            sendEraser(startPoint, endPoint);
        } else {
            if (CANVAS_ON_CHECK) {
                sendDrawing(startPoint, endPoint);
            }
        }
    }
    startPoint = endPoint;
}

function finishDrawing(event) {
    var context = canvas.getContext("2d");

    // draw the line to the finishing coordinates
    context.closePath();

    // unbind any events which could draw
    $(canvas).unbind("mousemove")
              .unbind("mouseup")
              .unbind("mouseout");
    prevent = false;
}

function toolChange(color, size, tool) {
    //console.log("1. color => " + color + " size => " + size + " tool => " + tool);

    if (tool == "0.2") {
        alpha = 0.2;
        comPostition = 'lighter';
    } else if (tool == "20") {
        alpha = 1;
    } else {
        alpha = 1;
    }

    brushSize = size;

    console.log("2. brushColor => " + brushColor + " brushSize => " + brushSize + " comPostition => " + comPostition);
}

function canvasCheck() {
    if (!canvasSupport) {
        return;
    }
}

function canvasSupport() {
    return !!document.createElement('canvas_view').getContext;
}

function reciveDrawing(data) {
    console.log("reciveDrawing\nsX => ", data.sX, " sY => ", data.sY, " eX => ", data.eX, " eY => ", data.eY, " width => ", data.WIDTH, " alpha => ", data.ALPHA, " style => ", data.STYLE);

    var context = canvas.getContext("2d");

    context.beginPath();
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = data.WIDTH;
    context.globalCompositeOperation = comPostition;
    context.strokeStyle = data.STYLE;
    context.moveTo(data.sX, data.sY);
    context.lineTo(data.eX, data.eY);
    context.stroke();

    alpha = data.ALPHA;
    brushSize = data.WIDTH;
    brushColor = data.STYLE;
}

// 전체 지우기
function cleanCanvas() {
    // context
    canvas = document.getElementById("canvas_view");
    var context = canvas.getContext('2d');

    context.canvas.width = $("#canvas_view").width();
    context.canvas.height = $("#canvas_view").height();

    // 픽셀 정리
    context.clearRect(0, 0, canvas.width, canvas.height);
    // 컨텍스트 리셋
    context.beginPath();
}

function reciveEraser(data) {
    console.log("reciveEraser\nsX => ", data.sX, " sY => ", data.sY, " eX => ", data.eX, " eY => ", data.eY, " width => ", data.WIDTH);
    var context = canvas.getContext("2d");

    context.beginPath();
    context.globalCompositeOperation = "destination-out";
    context.arc(data.sX, data.sY, data.WIDTH, 0, Math.PI * 2, true);
    context.moveTo(data.eX, data.eY);
    context.fill();
    context.stroke();
}

function canvasResize() {
    if (CANVAS_ON_CHECK) {
        canvas = document.getElementById("canvas_view");
        var context = canvas.getContext("2d");

        // 현재 화면 이미지 저장
        var imgData = context.getImageData(0, 0, canvas.width, canvas.height);

        context.canvas.width = $("#canvas_view").width();
        context.canvas.height = $("#canvas_view").height();

        // 현재화면 이미지 출력
        context.putImageData(imgData, 0, 0);
    }
}

