/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * customer_addresses_hook_scripts.js
 * 
 * Handles OCAPI hooks for customer addresses calls
 */
var customerScripts = require('./customer_address_hook_scripts.js');

/**
* the beforePOST hook. Validate the address before creating a new address in the address book
* dw.ocapi.shop.customer.addresses.beforePOST
*/
exports.beforePOST = function(profile, address, update) {
    return customerScripts.validateCustomerAddress(update);
};