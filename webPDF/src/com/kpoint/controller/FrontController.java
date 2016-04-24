package com.kpoint.controller;

import java.io.*;

import javax.servlet.*;
import javax.servlet.http.*;
import com.kpoint.pdfService.filetoPDF;


/**
 * Servlet implementation class FrontController
 */

public class FrontController extends HttpServlet implements Servlet {

	protected void doProcess(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		request.setCharacterEncoding("utf-8");
		String RequestURI = request.getRequestURI();
		String contextPath = request.getContextPath();
		String command = RequestURI.substring(contextPath.length());

		ActionForward forward = null;
		Action action = null;

		System.out.println("URI = " + RequestURI);
		System.out.println("contextPath = " + contextPath);
		System.out.println("contextPath.length() = " + contextPath.length());
		System.out.println("command = " + command);

		forward = new ActionForward();

		//
		if (command.equals("/filetoPDP.kp")) {
			action = new filetoPDF();
				System.out.println("[FrontController - filetoPDF] start");
    		try {
    			forward = action.execute(request, response);
			} catch (Exception e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
				System.out.println("[FrontController - filetoPDF] : " + e.toString());
			}
		}

		if (forward.GetRedirect()) {
			// 
			response.sendRedirect(forward.getPath());
		} else {
			RequestDispatcher dispatcher = request.getRequestDispatcher(forward
					.getPath());
			dispatcher.forward(request, response);
		}
	}

	protected void doGet(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		doProcess(request, response);
	}

	protected void doPost(HttpServletRequest request,
			HttpServletResponse response) throws ServletException, IOException {
		doProcess(request, response);
	}
}
