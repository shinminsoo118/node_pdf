package com.kpoint.controller;

/*******************************************************
 * ���� �� : Action.java
 * ���� : - Ư�� ����� �����ϰ� ������� ActionForward �� �ϴ� �������̽�
 *      - View�� Model ������ ��� ������ �ϴ� ��Ʈ�ѷ�
 *      
 * @author JongWoo
 * @date 2014.03.26
 *
 *******************************************************/

import javax.servlet.http.*;

public interface Action {
	public ActionForward execute(HttpServletRequest request,HttpServletResponse response) throws Exception;
}
