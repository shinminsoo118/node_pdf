<%@page import="javax.sql.DataSource"%>
<%@page import="javax.naming.Context"%>
<%@page import="javax.naming.InitialContext"%>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" import="java.sql.*" %>

<%
	request.setCharacterEncoding("utf-8");
	String id = request.getParameter("id");
%>

<%
	Connection con = null;
	Statement stmt = null;
	ResultSet rs = null;
	
	String kp_id = "";
	int status = 0;
	String errormsg = "";
	System.out.println("------------------");

	try{
		Context init = new InitialContext();
		DataSource ds = (DataSource)init.lookup("java:comp/env/jdbc/kp_groupware_res");
		con = ds.getConnection();
		
		stmt = con.createStatement();
		String query = "select kp_id from incloud_testdb where incloud_id = '"+id+"'";
		System.out.println("------------------"+query);
		rs = stmt.executeQuery(query);
		
		while(rs.next()){
			status+=1;
			kp_id = rs.getString("kp_id");
		}
	}catch(SQLException e){
		errormsg = "error ("+e.toString()+")";
		status = -1;
		out.println("error : "+e.toString());
	}finally{
		out.println("{\"id\" : \""+kp_id+"\", \"status\" : \""+status+"\", \"err\" : \""+errormsg+"\"}");
        if (stmt != null) try { stmt.close(); } catch (SQLException ignore) {}
        if (rs != null) try { rs.close(); } catch (SQLException ignore) {}
        if (con != null) try { con.close(); } catch (SQLException ignore) {}
	}
%>
