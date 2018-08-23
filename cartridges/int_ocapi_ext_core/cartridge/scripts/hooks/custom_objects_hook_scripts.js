/**
 * ©2017-2018 salesforce.com, inc. All rights reserved.
 * 
 * custom_objects_hook_scripts.js
 * 
 * Handles OCAPI hooks for custom objects
 */

importPackage(dw.object);

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

/**
 * the afterPatch hook - called after updating a custom object 
 * 
 * @param customObject - the updated custom object
 * @param update - the update document
 * @return status
 */
exports.afterPatch = function(customObject, update) { 
	if(customObject.type != 'notificationData'){
	    var log = Logger.getLogger("instore-audit-trail");
	    log.info("custom_objects_hook_scripts: entering script ");
	    var attributes = customObject.getCustom();
	    var username = attributes["eaStoreUsername"];
	    if (username && username != '') {
	        var password = attributes["eaStorePassword"];
	        if (password && password != '') {
	            // search for all stores that have the same username, excluding the store we just changed
	            var stores = CustomObjectMgr.queryCustomObjects("storeCredentials", "custom.eaStoreUsername = {0} AND custom.storeId != {1}", null, username, attributes["storeId"]);
	            // update store password and expired flag for each matching store
	            while (stores.hasNext()) {
	                var storeObj = stores.next();
	                log.info("custom_objects_hook_scripts: also updating store " + storeObj.custom.storeId);
	                storeObj.custom.eaStorePassword = password;
	                storeObj.custom.eaCredentialsExpired = false;
	            }
	            // update expired flag on current store
	            attributes["eaCredentialsExpired"] = false;
	        }
	    }
	    log.info("custom_objects_hook_scripts: exiting script without error");
	    return new Status(Status.OK);
	}
};
