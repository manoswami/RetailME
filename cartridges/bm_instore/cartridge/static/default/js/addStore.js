/**
 * ©2015-2018 salesforce.com, inc. All rights reserved.
 * 
 * addStore.js - loads with the addStore.isml page.
 * 
 */
jQuery(function() {

    var $ = jQuery.noConflict(), newAssociateform, existingAssocTableColumnConfig = [
            {
                "orderable" : false
            }, null, {
                "orderable" : false
            }, {
                "orderable" : false
            }, {
                "orderable" : false
            }, {
                "orderable" : false
            }, ];

    // add an eventListener to the select checkboxes
    function setEmployeeSelectEventListeners() {
        $('.associateSelect').change(function() {
            if (this.checked) {
                $("#hiddenFormElements").append(
                        '<input name="employeeIds" type="hidden" value="'
                                + $(this).val() + '">');
                $(this).parent().parent().addClass("selectedRow");
            } else {
                var selector = '#hiddenFormElements input[value='
                        + $(this).val() + ']';
                $(selector).remove();
                $(this).parent().parent().removeClass("selectedRow");
            }
        });
    }

    // validate the create new associate from
    function validateNewAssociateForm() {
        var requiredFieldValid = true, passwordsValid = true;
        var pwdStrings = [];
        newAssociateform.find('input[type=text]').each(function() {
            if ($(this).val() == '') {
                requiredFieldValid &= false;
            } else {
                requiredFieldValid &= true;
            }
        });
        newAssociateform.find('input[type=password]').each(function() {
            pwdStrings.push($(this).val().toString());
            if ($(this).val() == '') {
                requiredFieldValid &= false;
            } else {
                requiredFieldValid &= true;
            }
        });
        if (pwdStrings[0].length > 0 && pwdStrings[0] == pwdStrings[1]) {
            passwordsValid &= true;
        } else {
            passwordsValid &= false;
        }
        var message = '';
        if (!requiredFieldValid) {
            message += '<p>' + errorMsg.missingRequiredFields + '</p>';
        }
        if (!passwordsValid) {
            message += '<p>' + errorMsg.passMissMatch + '</p>';
        }

        showHideAssociateErroMsg(message);
        return requiredFieldValid & passwordsValid;
    }

    function showHideAssociateErroMsg(message) {
        $("#newAssoc_error").children().remove();
        if (message && message != '') {
            $("#newAssoc_error").append(message);
            $("#newAssoc_errorTextWrapper").show();
        } else {
            $("#newAssoc_errorTextWrapper").hide();
        }
    }

    function handleAssociatePermissionChange() {
        var employeeIdx = 0, firstnameIdx = 3, lastnameIdx = 4, premissionsIdx = 5;
        var rowData = table.row($(this).parent().parent()).data();
        var currentDropdown = $(this);
        $.ajax({
            url : "../AjaxManageAssociates-Edit",
            type : "POST",
            data : {
                permissions : currentDropdown.val(),
                employee_id : $(rowData[employeeIdx]).val(),
                firstname : rowData[firstnameIdx],
                lastname : rowData[lastnameIdx],
            },
            success : function(response) {
                response = JSON.parse(response);
                if (response.assignedStores.assigned) {
                    if (confirm(response.assignedStores.message)) {
                        $.ajax({
                            url : "../AjaxManageAssociates-Edit",
                            type : "POST",
                            data : {
                                permissions : currentDropdown.val(),
                                employee_id : rowData[employeeIdx],
                                firstname : rowData[firstnameIdx],
                                lastname : rowData[lastnameIdx],
                                confirmed : "YES"
                            }
                        });
                    } else {
                        currentDropdown
                                .val(response.assignedStores.previousPermissionId);
                    }
                }
            },
            error : function(jqXHR, textStatus, errorThrown) {

            }
        });
    }

    // hides create new associate form
    function removeNewAssocForm() {
        if ($('#newAssociateform').length > 0) {
            newAssociateform = $('#newAssociateform').detach();
        }
    }

    function showExistingAssociatesTable() {
        $("#associateWrapperDiv").hide(500, function() {
            removeNewAssocForm();
            $('#existingAssociates').show();
            $("#associateWrapperDiv").show(500);
            $("#addNewAssociateButton").prop('disabled', false);
        });
    }

    function replaceExistingAssociatesTable(tableString) {
        $("#associateWrapperDiv").hide(
                500,
                function() {
                    $("#associateWrapperDiv").show();
                    removeNewAssocForm();
                    table.destroy();
                    setTimeout(function() {
                        $('#existingAssociates').remove();
                        $("#associateWrapperDiv").append(tableString);
                        setEmployeeSelectEventListeners();
                        $(".associatePermissions").change(
                                handleAssociatePermissionChange);
                        $("#existingAssociatesTable").one('draw.dt',
                                function() {
                                    $("#activityIndicator").hide();
                                });
                        table = $("#existingAssociatesTable").DataTable({
                            columns : existingAssocTableColumnConfig,
                            order : [ [ 1, 'desc' ] ]
                        });
                        $("#addNewAssociateButton").prop('disabled', false);
                    }, 1000);

                });
    }

    // shows create new associate form
    function showNewAssocForm() {
        $(this).prop('disabled', true);
        $('#associateWrapperDiv')
                .hide(
                        500,
                        function() {
                            $('#existingAssociates').hide();
                            $("#associateWrapperDiv").append(newAssociateform);
                            newAssociateform.find("input[type=text]").val('');
                            newAssociateform.find("input[type=password]").val(
                                    '');
                            newAssociateform.find("select").val(
                                    newAssociateform
                                            .find("select option:first").val());
                            showHideAssociateErroMsg();
                            $("#associateWrapperDiv").show(500);
                        });
    }

    function createNewAssociate() {
        if (validateNewAssociateForm()) {
            $("#activityIndicator").show();
            var newEmployeeId = $('#newAssociateform :input[name=employee_id]')
                    .val();
            var formData = $('#newAssociateform :input').serialize() + '&'
                    + $("#hiddenFormElements :input").serialize();
            $.ajax({
                url : "../AjaxManageAssociates-Add",
                type : "POST",
                data : formData,
                success : function(response) {
                    if (response.indexOf('</table>') > -1) {
                        replaceExistingAssociatesTable(response);
                        var selector = '#hiddenFormElements input[value=A'
                                + newEmployeeId + ']';
                        $(selector).remove();
                        $("#hiddenFormElements").append(
                                '<input name="employeeIds" value="A'
                                        + newEmployeeId + '">');
                        return;
                    } else {
                        showHideAssociateErroMsg('<p>' + response + '</p>');
                    }
                    $("#activityIndicator").hide();
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    $("#activityIndicator").hide();
                }
            });
        }

    }

    function handlePreFormSubmission() {
        removeNewAssocForm();
    }

    // --------------------------- init ------------------------------
    setEmployeeSelectEventListeners();
    $('#addNewAssociateButton').click(showNewAssocForm);
    $("#cancelNewAssoc").click(showExistingAssociatesTable);
    $(".associatePermissions").change(handleAssociatePermissionChange);
    $("#createNewAssoc").click(createNewAssociate);
    $('form[name=CreateStore]').submit(handlePreFormSubmission);
    removeNewAssocForm();
    var table = $("#existingAssociatesTable").DataTable({
        columns : existingAssocTableColumnConfig,
        order : [ [ 1, 'desc' ] ],
    });

});
