/**
 * ©2018 salesforce.com, inc. All rights reserved.
 *
 * customer_address_hook_scripts.js
 *
 * Handles OCAPI hooks for customer address calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var validateAddress = require('./validateAddress');
var customerAddress = require('./customerAddress');

/**
 * the afterPATCH of a customer address
 */
exports.afterPATCH = function(customer, address, update) {
    var log = Logger.getLogger("instore-audit-trail");
    // only call this code for EA if there's an agent
    if (update.c_employee_id) {
        log.info("customer address afterPATCH: entering script");
        var status = customerAddress.updateCustomerAddress(customer, address, update);
        log.info("customer address afterPATCH: exiting script");
        return status;
    }
    return new Status(Status.OK);
};

/**
 * the beforePATCH hook. Validate the address before updating an address in the address book
 */
exports.beforePATCH = function(profile, address, update) {
    return validateCustomerAddress(update);
};

/**
 * the validateCustomerAddress to validate the customer address
 */
function validateCustomerAddress(address) {
    var log = Logger.getLogger("instore-audit-trail");
    var status = new Status(Status.OK);
    // only call this code for EA if there's an agent
    if (address.c_employee_id) {
        log.info("validateCustomerAddress: before call to validate");
        // call the customization script
        status = validateAddress.validateCustomerAddress(address);
        log.info("validateCustomerAddress: after call to validate");
    }
    return status;
}

exports.validateCustomerAddress = validateCustomerAddress;
