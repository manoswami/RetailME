/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_customer_hooks.js
 * 
 * Handles OCAPI hooks for basket customer calls
 */

var basketScripts = require('./basket_hook_scripts');

/**
 * the beforePutCustomer hook
 * dw.ocapi.shop.basket.customer.beforePUT
 */
exports.beforePUT = function() {
    basketScripts.setPriceBook();
};