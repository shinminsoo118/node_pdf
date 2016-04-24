<%@ page language="java" contentType="text/html; charset=utf-8"	pageEncoding="UTF-8"%>
<%
	String sid = (String)request.getParameter("uID");
%>

<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<title>Student</title>
	<link rel="stylesheet" type="text/css" href="css/common.css" />
	<link rel="stylesheet" href="css/jquery-ui.css">
    <link rel="stylesheet" href="css/colorpicker.css" type="text/css" />
    <link rel="stylesheet" media="screen" type="text/css" href="css/layout.css" />

	<script src="http://mozilla.github.io/pdf.js/build/pdf.js"></script>
	<script src="js/jquery-1.10.2.min.js"></script>
	<script src="js/lib/socket.io.js"></script>
	<script src="js/action.js"></script>
	<script src="js/jquery-1.8.3.min.js"></script>
	<script src="js/libs.bundle.js"></script>
	<script src="js/lib/webrtc.io.js"></script>
	<script src="js/student_webrtc-jingle.js"></script>
	<script src="js/judoonge.bundle_student.js"></script>
	<script src="js/login.js"></script>
	<script src="js/student_webrtc.js"></script>
	<script src="js/student_view.js"></script>
	<script src="js/lib/jquery.js"></script>
    <script src="js/lib/jquery-ui.js"></script>
    <script src="js/lib/colorpicker.js"></script>
    <script src="js/lib/eye.js"></script>
    <script src="js/lib/utils.js"></script>
    <script src="js/lib/layout.js?ver=1.0.2"></script>
    <script src="js/buttonControl.js"></script><!-- 버튼 컨트롤 -->
    <script src="js/drawing.js"></script> <!--그림판-->
    <script src="js/pdfupload.js"></script> <!-- pdf control -->
    <script src="js/nodeServer_connect.js"></script><!-- node Server와 연결-->
	<script type="text/javascript">
	
	window.onload = function() { //$('head').append('<link />');			
		var username = "<%=sid%>";
		var password = "1234";
		console.log("loginName -> ", username);
		connect(username, password);
		username += "@" + Judoonge.serverInfo.basicDomain;
		Judoonge.Core.connect(username, password);

		return false;
	};

	//140609
	document.onkeydown = doNotReload;

	function doNotReload() {
		if ((event.ctrlKey == true && (event.keyCode == 78 || event.keyCode == 82))
				|| (event.keyCode == 116)) {
			event.keyCode = 0;
			event.cancelBubble = true;
			event.returnValue = false;
		}
	}

	function openfire_id_check(sid) {
		$.ajax({
			type : "POST",
			url : "getid.jsp",
			data : "id=" + sid,
			dataType : "json",
			contentType : "application/x-www-form-urlencoded; charset=UTF-8",
			success : function(resText, status, request) {
				console.log(resText);
				//var resText = JSON.parse(1response);
				console.log("nananan ", resText.id);

				if (resText.status == 1) {
					var username = resText.id;
					var password = "1234";
					//location.href = "student.jsp?student=" + username;
					connect(username, password);
					username += "@" + Judoonge.serverInfo.basicDomain;
					Judoonge.Core.connect(username, password);
				} else if (resText.status == 0) {
					console.log("존재하지 않는 아이디입니다.");
					alert("존재하지 않는 아이디입니다.");
				} else if (resText.status > 1) {
					console.log("아이디가 하나 이상 존재합니다.");
					alert("아이디가 하나 이상 존재합니다.");
				} else {
					console.log("아이디가 하나 이상 존재합니다.");
					alert("아이디가 하나 이상 존재합니다.");
				}
			},
			error : function(xhr, status, error) {
				console.log(xhr);
			}
		});
	}
</script>
</head>
<body>
	<div class="loading">
	</div>
	<div class="aside">
		<div class="aside_content" id="video_page">
			<div class="video_secton">
				<div class="video_position">
					<span class="video_teacher" id="video_teacher"></span>
				</div>
				<!-- video_position end -->
				<span class="alert_popup">학생 화면 전송 중</span>
			</div>
			<!-- video_secton end -->
			<div class="student_section">
				<strong>학생</strong> <span class="accept" id="accept">수락</span>
				<div class="sectionBox">
					<div class="sectionBox">
						<ol class="student_list" id="student_list"></ol>
					</div>
				</div>
				<!-- student_scroll end -->
				<video id="myVideo" style="display: none; muted"></video>
			</div>
			<!-- student_section end -->
		</div>
		<!-- // aside_content end // -->
	</div>
	<div class="centerContent">
		<div class="inputBox">
			<dl>
				<dt>파일올리기</dt>
				<dd>
					<div>파일을 선택해 주세요</div>
					<div class="inputBg"><input type="file"></div>
					<div><a href="#" class="dBtn">파일올리기</a> <a href="#" class="dBtn closeBtn">창닫기</a></div>
				</dd>
			</dl>
		</div>
		<div class="roomTitle">
			WebRTC 강의
		</div>
		<div class="btnGrp">
		</div>
		<div class="canvasArea">
			<div class="canvasWrapper" id="canvas_div">
				<div id="pdfview_one">
					<div class="student_none">
						<button id="prev">Previous</button>
				    	<button id="next">Next</button>
					</div>
				    <span>Page: <span id="page_num"></span> / <span id="page_count"></span></span>
				</div>
				<canvas id="the_canvas"></canvas>
				<canvas id="canvas_view">
				당신의 브라우저가 Html5 Canvas를 지원하지 않습니다!
				</canvas>
			</div>
		</div>
	</div>
</body>
</html>