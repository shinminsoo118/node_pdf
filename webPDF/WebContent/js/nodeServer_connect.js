// JavaScript source code
//var socket = io.connect("http://knowledgepoint.co.kr:5555");
//shinminsoo openoffice
var socket = io.connect("http://106.240.247.43:5555");

socket.on("con_sussces", function (data) {
    console.log("server connected ");
});

socket.on("recive_drawing", function (data) {
    reciveDrawing(data);
});

socket.on("recive_canvasOn", function (data) {
    console.log("recive canvas on");
    $("#canvas_div").show();
    canvasShow();
});

socket.on("canvasClean", function (data) {
    cleanCanvas();
});

socket.on("recive_eraser", function (data) {
    reciveEraser(data);
});

socket.on("recive_canvasEnd", function (data) {
    console.log("문서공유 종료");
    canvasHide();
});

//shinminsoo pdf socket.io//
socket.on("pdf_Viewer", function (data) {
	console.log("reciver::::"+data);
	pdf_ss(data);
});

socket.on("recive_docEnd", function (data) {
    console.log("doc share end");

    canvasHide();
});

function sUrl(){
	var pdf_data = document.getElementById("pdf_data").value;
	console.log("[pdfgo].............>"+pdf_data);
	//var data = pdf_data;
	socket.emit("pdfgo",pdf_data);
}
//shinminsoo pdf socket.io//

function startCanvas() {
    console.log("sendMessage canvas_on");

    socket.emit("canvasOn");
}

function sendDrawing(startPostion, endPosition) {
    console.log("sX => ", startPostion.X, " sY => ", startPostion.Y, "eX => ", endPosition.X, " eY => ", endPosition.Y, " width => ", brushSize, " alpha => ", alpha, " style => ", brushColor);

    socket.emit("canvasDrawing", { sX: startPostion.X, sY: startPostion.Y, eX: endPosition.X, eY: endPosition.Y, WIDTH: brushSize, ALPHA: alpha, STYLE: brushColor });
}

function sendClean() {
    socket.emit("canvasClean");
}

function sendEraser(startPostion, endPosition) {
    console.log("sX => ", startPostion.X, " sY => ", startPostion.Y, "eX => ", endPosition.X, " eY => ", endPosition.Y, " width => ", eraserSize);

    socket.emit("canvasEraser", { sX: startPostion.X, sY: startPostion.Y, eX: endPosition.X, eY: endPosition.Y, WIDTH: eraserSize });
}

function canvasEnd() {
    console.log("sendMessage canvas_end");

    socket.emit("canvasOff");
}

function sendDocEnd() {
    console.log("send docOff Server");

    socket.emit("docOff");
}