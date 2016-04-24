package com.kpoint.controller;

/*******************************************************
 * 파일 명 : Action.java
 * 설명 : - 특정 명령을 수행하고 결과값을 ActionForward 로 하는 인터페이스
 *      - View와 Model 사이의 통로 역할을 하는 컨트롤러
 *      
 * @author JongWoo
 * @date 2014.03.26
 *
 *******************************************************/

import javax.servlet.http.*;

public interface Action {
	public ActionForward execute(HttpServletRequest request,HttpServletResponse response) throws Exception;
}
