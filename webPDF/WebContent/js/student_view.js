var student = "";

$(function () {
    $(".alert_popup").hide();
});
//
//function openfire_id_check(sid){
//	$.ajax({
//	    type: "POST",
//	    url: "jsp/getid.jsp",
//	    data: "id="+sid,
//	    dataType:"json",
//	    contentType: "application/x-www-form-urlencoded; charset=UTF-8",
//	    success : function(resText, status, request) {
//	    	console.log(resText);
////	    	var resText = JSON.parse(1response);
//	    	console.log(resText.id);
//	    	if(resText.status == 1){
//	    		var username = resText.id;
//				password = "1234";
//				connect(username, password);
//				username += "@" + Judoonge.serverInfo.basicDomain;
//				Judoonge.Core.connect(username, password);
//				return false;
//	    	}else if(resText.status == 0){
//	    		console.log("존재하지 않는 아이디입니다.");
//	    		alert("존재하지 않는 아이디입니다.");
//	    		location.href="student.html";
//	    	}else if(resText.status > 1){
//	    		console.log("아이디가 하나 이상 존재합니다.");
//	    		alert("아이디가 하나 이상 존재합니다.");
//	    		location.href="student.html";
//	    	}else{
//	    		console.log("아이디가 하나 이상 존재합니다.");
//	    		alert("아이디가 하나 이상 존재합니다.");
//	    	}
//      	},
//      	error : function(xhr, status, error) {
//      		console.log(xhr);
//      	}
//	});
//}