$(function () {
    var group = "class1";

    $("#student_list li").each(function () {
        var retval = false;
        if ((this).attr(group) != group) {
            retval = true;
        }
        return retval;
    }).hide();
});