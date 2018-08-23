/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * Hook file for renaming a customer address. Called by the dw.ocapi.shop.customer.address.afterPATCH hook.
 * 
 */
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

/**
 * updateCustomerAddress
 * 
 * Called from the hook when updating a customer address
 */
exports.updateCustomerAddress = function(customer, customerAddress, update) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("customerAddress execute: entering script");

    if (update.c_patchInfo) {
        var type = update.c_patchInfo.type;
        var data = update.c_patchInfo.data;
        // see what kind of patch this is. we only support address renames
        if (type === "rename_address") {
            return renameAddress(customer, data.original_id, data.new_id);
        } else {
            log.info("customerAddress execute: exiting script");

            return new Status(Status.OK);
        }
    } else {
        log.info("customerAddress execute: exiting script");
        return new Status(Status.OK);
    }
};

/**
 * renameAddress
 * 
 * rename an address of a customer
 * 
 */
function renameAddress(customer, oldName, newName) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("customerAddress renameAddress: entering script");

    var addressBook = customer.getAddressBook();
    var address = addressBook.getAddress(oldName);
    // cannot rename an address to a name that is already in use
    if (addressBook.getAddress(newName)) {
        log.info("customerAddress renameAddress: exiting script because name in use");
        return new Status(Status.ERROR, "renameAddressError", dw.web.Resource.msg('addressalreadyexists.title', 'account', null));
    }
    if (!address) {
        log.info("customerAddress renameAddress: exiting script with no address");
        return new Status(Status.OK);
    }
    address.ID = newName;
    log.info("customerAddress renameAddress: exiting script after successful rename");
    return new Status(Status.OK);
}
