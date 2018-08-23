/**
 * ©2015-2018 salesforce.com, inc. All rights reserved.
 * 
 * showAssociates.js - loads with the showAssociates.isml page.
 * 
 */
jQuery(function() {

    var $ = jQuery.noConflict();

    function handleOnOffSwitch() {
        var employeeID = $(this).val();
        var nameSelector = $(this).attr("name");
        var lockedOut = false;
        if (this.checked) {
            lockedOut = true;
        } else {
            lockedOut = false;
        }

        $.ajax({
            url : (ajaxlockUnlockURL ? ajaxlockUnlockURL : "AjaxManageAssociates-LockUnlock"),
            type : "POST",
            data : {
                employeeID : employeeID,
                lockedOut : lockedOut
            },
            success : function(response) {
                if (lockedOut) {
                    $("input[name=" + nameSelector + "]").each(function() {
                        this.setAttribute("checked", "checked");
                        this.checked = true;
                    });

                } else {
                    $("input[name=" + nameSelector + "]").each(function() {
                        this.setAttribute("checked", ""); // For IE
                        this.removeAttribute("checked"); // For other browsers
                        this.checked = false;
                    });

                }
                response = JSON.parse(response);
                alert(response.message);
            },
            error : function(jqXHR, textStatus, errorThrown) {
                alert(textStatus);
            }

        });
    }

    $(".onoffswitch-checkbox").change(handleOnOffSwitch);
});