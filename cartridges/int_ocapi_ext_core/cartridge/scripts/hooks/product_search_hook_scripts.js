/**
 * ©2017-2018 salesforce.com, inc. All rights reserved.
 * 
 * product_search_hook_scripts.js
 * 
 * Handles GET calls to product search. This hook is used to set the pricebooks
 * based on the country selected
 */

var basketScripts = require('./basket_hook_scripts');

/**
 * the beforeGET hook - called before getting the product results.
 */
exports.beforeGET = function() {
    basketScripts.setPriceBook();
};
