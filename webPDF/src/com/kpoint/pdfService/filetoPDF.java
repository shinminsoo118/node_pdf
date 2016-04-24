package com.kpoint.pdfService;

import java.io.File;
import java.io.PrintWriter;
import java.sql.Date;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import com.kpoint.controller.Action;
import com.kpoint.controller.ActionForward;
import com.kpoint.docPDF.documentConverter;
import com.oreilly.servlet.MultipartRequest;
import com.oreilly.servlet.multipart.DefaultFileRenamePolicy;

/*******************************************************
 * 파일 명 : BoardListAction.java 설명 : - 글 목록 보기
 * 
 * @author JongWoo
 * @date 2014.03.26
 * 
 *******************************************************/

public class filetoPDF implements Action {

	public ActionForward execute(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		// TODO Auto-generated method stub
		request.setCharacterEncoding("utf-8");
		System.out.println("pdf control................");
		documentConverter pdfconvert = new documentConverter();
		
		String pdffile = "";
		String realFolder = "";
		String saveFolder = "file";
		ActionForward forward = new ActionForward();

		ArrayList saveFiles = new ArrayList();
		ArrayList origFiles = new ArrayList();

		int fileSize = 100 * 1024 * 1024;
		realFolder = request.getRealPath(saveFolder);
		boolean result = false;
		boolean result1 = false;
		String context = request.getContextPath();
		//String uId_file="";
		
		try {
			MultipartRequest multi = null;
			multi = new MultipartRequest(request, realFolder, fileSize,
					"UTF-8", new DefaultFileRenamePolicy());
			
//			if(multi.getParameter("uId_file") != null){
//				uId_file = multi.getParameter("uId_file");
//			}
			
			Enumeration files = multi.getFileNames();
			while(files.hasMoreElements()){
				   String name = (String)files.nextElement();
				   saveFiles.add(multi.getFilesystemName(name));
				   origFiles.add(multi.getOriginalFileName(name));
				  }
			String filename = multi.getFilesystemName((String)multi.getFileNames().nextElement());

			int index = filename.lastIndexOf("."); 
			String filenameext = filename.substring(index+1).toLowerCase();
			
			if(filenameext.equals("pdf")){
				String file_src = ".." +context + "/file/"+ filename;
				//String sFalg = "pdf_viewer";
				
				response.setContentType("text/html;charset=utf-8");
				PrintWriter out = response.getWriter();
				out.print(file_src);
			    out.flush();
			    out.close();
				
			}else{
				long time = System.currentTimeMillis();
				SimpleDateFormat todayfile = new SimpleDateFormat("yyyyMMddHHmm");
				String todayinput = todayfile.format(new Date(time));
				System.out.println("[todayinput]:::" + todayinput);
				
				//linux path
				//String filereadpath = "/home/kpdev/tomcat7/webapps/Demo/file/";
				String filereadpath = "/home/kpdev/apache-tomcat-7.0.32/webapps/pilot/file/";
				//window path
//				String filereadpath = "d:/workspace/.metadata/.plugins/org.eclipse.wst.server.core/tmp0/wtpwebapps/webPDF/file/";
//				String filereadpath = "C:/javaproject/.metadata/.plugins/org.eclipse.wst.server.core/tmp2/wtpwebapps/webPDF/file/";
				pdffile = pdfconvert.document(filereadpath,filename,todayinput);
				
				String file_src = ".." +context + "/file/"+ pdffile;
				//String sFalg = "pdf_viewer";
				System.out.println("[file_src]:::/"+file_src);
				
				response.setContentType("text/html;charset=utf-8");
				PrintWriter out = response.getWriter();
				out.print(file_src);
			    out.flush();
			    out.close();
				
			}

		} catch (Exception e) {
			e.printStackTrace();
		}

		return forward;
	}

}
