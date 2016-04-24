package com.kpoint.docPDF;
import java.io.File;

import org.artofsolving.jodconverter.OfficeDocumentConverter;
import org.artofsolving.jodconverter.office.DefaultOfficeManagerConfiguration;
import org.artofsolving.jodconverter.office.OfficeManager;


public class documentConverter {
	//public static void main(String[] args){
	public String document(String filereadpath,String filename,String todayinput){
		OfficeManager officeManager = new DefaultOfficeManagerConfiguration().buildOfficeManager();
		officeManager.start();
		System.out.println("[pdfcovert start............]");
        String file = filename;
        String filepath = filereadpath;
        String inputfilename = null;
        inputfilename = file.substring(0,file.indexOf(".")) + todayinput + ".pdf";
        File inFile = new File(filepath + file);
        File outFile = new File(filepath + inputfilename);
        OfficeDocumentConverter converter = new OfficeDocumentConverter(officeManager);
        converter.convert(inFile,outFile);
        officeManager.stop();
		
		System.out.println("[pdfcovert end............]");
		System.out.println("[converter]"+converter);
		return inputfilename;
	}

}

