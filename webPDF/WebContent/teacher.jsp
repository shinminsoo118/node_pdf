<%@ page language="java" contentType="text/html; charset=utf-8"	pageEncoding="UTF-8"%>
<%
	String sid = (String)request.getParameter("uID");
%>
<%@ page import ="java.util.*" %>
<%-- <%@ page import ="com.kpoint.Dao.*" %> --%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ page import="java.io.*;"%>
<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<title>Teacher</title>
	<link rel="stylesheet" type="text/css" href="css/common.css" />
	<link rel="stylesheet" href="css/jquery-ui.css">
    <link rel="stylesheet" type="text/css" media="screen" href="css/colorpicker.css"  />
    <link rel="stylesheet" media="screen" type="text/css" href="css/layout.css" />

	<script src="http://mozilla.github.io/pdf.js/build/pdf.js"></script>
	<script src="js/jquery-1.10.2.min.js"></script>
	<script src="js/lib/socket.io.js"></script>
	<script src="js/action.js"></script>
	<script src="js/jquery-1.8.3.min.js"></script>
	<script src="js/lib/webrtc.io.js"></script>
	<script src="js/libs.bundle.js"></script>
	<script src="js/teacher_webrtc-jingle.js"></script>
	<script src="js/judoonge.bundle.js"></script>
	<script src="js/login.js"></script>
	<script src="js/teacher_webrtc.js"></script>
	<script src="js/teacher_view.js"></script>
	<script src="js/lib/jquery.js"></script>
    <script src="js/lib/jquery-ui.js"></script>
    <script src="js/lib/colorpicker.js"></script>
    <script src="js/lib/eye.js"></script>
    <script src="js/lib/utils.js"></script>
    <script src="js/lib/layout.js?ver=1.0.2"></script>
    <script src="js/buttonControl.js"></script><!-- 버튼 컨트롤 -->
    <script src="js/drawing.js"></script> <!--그림판-->
    <script src="js/pdfupload.js"></script><!-- pdf control -->
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
				console.log("hahah ", resText.id);

				if (resText.status == 1) {
					var username = resText.id;
					
					//location.href = "student.jsp?student=" + username;
					
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
	<h1 id="tCenter">LOADING...</h1>
	</div>
	<div class="aside">
		<!-- tab end -->
		<div class="aside_content" id="video_page">
			<!-- aside_top end -->
			<div class="video_secton">
				<div class="video_position">
					<span class="video_teacher" id="video_teacher"></span>
					
					<ul class="studentList">
						<li><img src="image/video_OFF_image.png" alt="off이미지">
							<video status="off"></video> <span class="hover_image"> <span>bye!!</span>
						</span> <strong class="studentName"></strong></li>
						<li><img src="image/video_OFF_image.png" alt="off이미지">
							<video status="off"></video> <span class="hover_image"> <span>bye!!</span>
						</span> <strong class="studentName"></strong></li>
						<li><img src="image/video_OFF_image.png" alt="off이미지">
							<video status="off"></video> <span class="hover_image"> <span>bye!!</span>
						</span> <strong class="studentName"></strong></li>
						<li><img src="image/video_OFF_image.png" alt="off이미지">
							<video status="off"></video> <span class="hover_image"> <span>bye!!</span>
						</span> <strong class="studentName"></strong></li>
						
					</ul>
					
				</div>
				<!-- video_position end -->
			</div>
			<!-- video_secton end -->
			<div class="student_section">
				<strong>학생</strong>
				<div class="sectionBox">
					<div class="student_scroll">
						<ol class="student_list" id="student_list"></ol>
					</div>
				</div>
			<!-- student_scroll end -->
				
			</div>
			<!-- student_section end -->
		</div>
	</div>
	<div class="centerContent">
		<div class="curColorPicker">
	        <div id="customWidget">
         		<div id="colorSelector2">
					<div style="background-color: #000000"></div>
         		</div>
        		<div id="colorpickerHolder2"></div>
        	</div>
       	</div>
		<div class="inputBox">
			<dl>
				<dt>파일올리기</dt>
				<dd>
					<form action ="./filetoPDP.kp" method="post" enctype="multipart/form-data" name="form" id="form">
					<div>파일을 선택해 주세요</div>
					<div class="inputBg"><input type="file" name="documentfile" id="documentfile"></div>
					<div><a href="#" class="dBtn dBtn2" id="sendDoc">전송</a> <a href="#" class="dBtn closeBtn dBtn2" id="closeDoc">창닫기</a></div>
					</form>
				</dd>
			</dl>
		</div>
		<div class="roomTitle">
			WebRTC 강의
		</div>
		<div class="btnGrp">
			<div class="left">
				<div class="color">
					
				</div>
			<div class="pen" id="pen">
				 <div id="size"></div>
			</div>
			<div class="eraser" id="eraser">
			        <div id="eraser_size"></div>
			</div>
			</div>
				<div class="right">

					<!-- <input type="file" name="documentfile" id="documentfile" value="" /> -->
					<a href="#" class="fileUpload" id="fileUpload" >문서공유</a>
					<a href="#" class="whiteBoard" id="canvas_show">화이트보드</a>
				</div>
		</div>
		<div class="canvasArea">
			<div class="canvasWrapper" id="canvas_div">
				<input type="hidden" id="pdf_data" value=""/>
				<div id="pdfview_one">
				    <button id="prev">Previous</button>
				    <button id="next">Next</button>
				    &nbsp; &nbsp;
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