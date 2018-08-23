/**
 * ©2017-2018 salesforce.com, inc. All rights reserved.
 * 
 * product_hook_scripts.js
 * 
 * Handles GET calls to product. This hook is used to set the pricebooks based
 * on the country selected
 */

var basketScripts = require('./basket_hook_scripts');

/**
 * the beforeGET hook - called before displaying product detail page
 */
exports.beforeGET = function() {
    basketScripts.setPriceBook();
};
