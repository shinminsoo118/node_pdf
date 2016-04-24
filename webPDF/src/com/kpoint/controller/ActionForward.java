package com.kpoint.controller;

/*******************************************************
 * ���� �� : ActionForward.java
 * ���� : - Action �������̽����� ����� �����ϰ�
 *       ������� �̿��� �������� ������ �� �� ȣ��Ǵ� Ŭ����
 *      - isRedirect, path ������ �̿���
 *       FrontController ���� ActionForward Ŭ����  Ÿ������
 *       ��ȯ���� �������� �� ���� Ȯ���Ͽ� ���Ǵ� ��û ��Ŀ� ���� 
 *       ��û �������� ������ ó���� ��.
 *      
 * @author JongWoo
 * @date 2014.03.26
 *
 *******************************************************/

public class ActionForward {
	private boolean isRedirect=false; 	// �ٽ� ������ ���� / ������ ��ȯ - false , ��ȯX - true
    private String path=null;			// ���
    
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