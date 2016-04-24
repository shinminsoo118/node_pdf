package com.kpoint.controller;

/*******************************************************
 * 파일 명 : ActionForward.java
 * 설명 : - Action 인터페이스에서 명령을 수행하고
 *       결과값을 이용해 페이지를 포워딩 할 떄 호출되는 클래스
 *      - isRedirect, path 값들을 이용해
 *       FrontController 에서 ActionForward 클래스  타입으로
 *       반환값을 가져오면 그 값을 확인하여 대당되는 요청 방식에 따라 
 *       요청 페이지로 포워딩 처리를 함.
 *      
 * @author JongWoo
 * @date 2014.03.26
 *
 *******************************************************/

public class ActionForward {
	private boolean isRedirect=false; 	// 다시 보낼지 구분 / 페이지 변환 - false , 변환X - true
    private String path=null;			// 경로
    
    public boolean GetRedirect() { return isRedirect; }
	public void setRedirect(boolean isRedirect) {
		this.isRedirect = isRedirect;
	}
	
	public String getPath() { return path; }
	public void setPath(String path) {
		this.path = path;
	}
	
	public boolean isRedirect() {
		return isRedirect;
	}
}