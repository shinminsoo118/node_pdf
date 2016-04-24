// JavaScript source code
var PORT = 5555;
var CLIENT_COUNTER = 1;
var io = require("socket.io").listen(PORT);

io.sockets.on("connection", function (socket) {
    console.log("no." + (CLIENT_COUNTER++) + " connected");

    // 사용자 접속 시 확인
    socket.emit("con_sussces");

    // 관리자가 화이트보드 기능 작동 시
    socket.on("canvasOn", function (data) {
        socket.broadcast.emit("recive_canvasOn");
    });

    // 그리기 데이터 전달
    socket.on("canvasDrawing", function (data) {
        console.log("canvasDrawing\nsX => ", data.sX, " sY => ", data.sY, " eX => ", data.eX, " eY => ", data.eY, " width => ", data.WIDTH, " alpha => ", data.ALPHA, " style => ", data.STYLE);

        io.sockets.emit("recive_drawing", { sX: data.sX, sY: data.sY, eX: data.eX, eY: data.eY, WIDTH: data.WIDTH, ALPHA: data.ALPHA, STYLE: data.STYLE });
    });

    // 전체 지우기
    socket.on("canvasClean", function (data) {
        io.sockets.emit("canvasClean");
    });

    // 지우개
    socket.on("canvasEraser", function (data) {
        io.sockets.emit("recive_eraser", { sX: data.sX, sY: data.sY, eX: data.eX, eY: data.eY, WIDTH: data.WIDTH });
    });

    // 화이트보드 기능 종료
    socket.on("canvasOff", function (data) {
        socket.broadcast.emit("recive_canvasEnd")
    });
    
    //pdf 1:n
    socket.on("pdfgo", function (data) {
    	console.log("[serverStart]"+data);
        //io.sockets.emit("recive_eraser", { sX: data.sX, sY: data.sY, eX: data.eX, eY: data.eY, WIDTH: data.WIDTH });
    	io.sockets.emit("pdf_Viewer",data );
    });

    // 문서공유 종료
    socket.on("docOff", function (data) {
        console.log("doc share end");

        io.sockets.emit("recive_docEnd");
    });
	socket.on("pageprev",function(data){
    	io.sockets.emit("pageprevView");
    });
    
    socket.on("pagenext",function(data){
    	io.sockets.emit("pagenextView");
    });
});
