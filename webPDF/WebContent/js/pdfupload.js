var pdfdata;

function pdfcoverting(){
        var documentfile_first = document.getElementById("documentfile").value;
        var documentfile = documentfile_first.slice(documentfile_first.indexOf(".") + 1).toLowerCase();
        console.log("documentfile" + documentfile);
        if (documentfile == "") {
            alert("파일을 선택해주세요.!");
            return false;
        } else {
            if (documentfile == "xlsx" || documentfile == "pptx" || documentfile == "docx" || documentfile == "pdf" || documentfile == "txt") {
                var han = /[ㄱ-힣]/g;
                var chk_han = documentfile_first.match(han);

                if (chk_han) {
                    alert("업로드파일이 한글입니다. 영문변환가능");
                    return false;
                } else {
                    var data = new FormData();
                    $.each($('#documentfile')[0].files, function (i, file) {
                        data.append('file-' + i, file);
                    });

                    $.ajax({
                        url: './filetoPDP.kp',
                        type: "post",
                        dataType: "text",
                        data: data,
                        // cache: false,
                        processData: false,
                        contentType: false,
                        success: function (data, textStatus, jqXHR) {
                            pdfdata = data;
                            console.log(data);
                       
                            $(".loading").hide();
                            $(".inputBox").hide();
                            socket.emit("pdfgo", pdfdata);
                        },
                        error: function (jqXHR, textStatus, errorThrown) { }
                    });
                }
            } else {
                alert("문서파일(xlsx,pptx,docx)만 변환가능합니다.!");
                return false;
            }
        }
}

function pdf_ss(data) {

    $("#the_canvas").show();
    $("#pdfview_one").show();

    var url = data;

    PDFJS.disableWorker = true;

    var pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 1.0,
        canvas = document.getElementById('the_canvas'),
        ctx = canvas.getContext('2d');

    /**
     * Get page info from document, resize canvas accordingly, and render page.
     * @param num Page number.
     */
    function renderPage(num) {
        pageRendering = true;
        // Using promise to fetch the page
        pdfDoc.getPage(num).then(function (page) {
            var viewport = page.getViewport(scale);

            ctx.canvas.height = $("#the_canvas").height();
            ctx.canvas.width = $("#the_canvas").width();

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            var renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function () {
                pageRendering = false;
                if (pageNumPending !== null) {
                    // New page rendering is pending
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });

        // Update page counters
        document.getElementById('page_num').textContent = pageNum;
    }

    /**
     * If another page rendering in progress, waits until the rendering is
     * finised. Otherwise, executes rendering immediately.
     */
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    /**
     * Displays previous page.
     */
    function onPrevPage() {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
        sendClean();
    }

	$("#prev").click(function(){
    	socket.emit("pageprev");
    });
	socket.on("pageprevView",function(data){
    	console.log("이전장!!!");
    	onPrevPage();
    });

    //document.getElementById('prev').addEventListener('click', onPrevPage);

    /**
     * Displays next page.
     */
    function onNextPage() {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
        sendClean();
    }
	$("#next").click(function(){
    	socket.emit("pagenext");
    });
    socket.on("pagenextView",function(data){
    	console.log("nextPageClient!!!");
    	onNextPage();
    });

    //document.getElementById('next').addEventListener('click', onNextPage);

    /**
     * Asynchronously downloads PDF.
     */
    PDFJS.getDocument(url).then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;

        // Initial/first page rendering
        renderPage(pageNum);
    });
}