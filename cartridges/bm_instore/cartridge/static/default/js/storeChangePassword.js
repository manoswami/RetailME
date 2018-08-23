/**
 * ©2017-2018 salesforce.com, inc. All rights reserved.
 * 
 * storeChangePassword - loads with the changeStorePassword.isml page.
 * 
 */
jQuery(function() {

    var $ = jQuery.noConflict(), existingAssocTableColumnConfig = [
            {
                "orderable" : false
            },null, {
                "orderable" : false
            }, {
                "orderable" : false
            }, {
                "orderable" : false
            } ];

  
    var table = $("#existingAssociatesTable").DataTable({
        columns : existingAssocTableColumnConfig,
        order : [ [ 1, 'desc' ] ],

    });

});