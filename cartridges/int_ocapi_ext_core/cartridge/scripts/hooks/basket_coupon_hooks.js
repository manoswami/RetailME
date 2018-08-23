/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_coupon_hooks.js
 * 
 * Handles OCAPI hooks for basket coupon calls
 */

var basketScripts = require('./basket_hook_scripts');

/**
 * the beforePOST hook. This is used to add a coupon.
 * dw.ocapi.shop.basket.coupon.beforePOST
 */
exports.beforePOST = function() {
    basketScripts.setPriceBook();
};

/**
 * the beforeDELETE hook. This is used to delete a coupon from the basket.
 * dw.ocapi.shop.basket.coupon.beforeDELETE
 */
exports.beforeDELETE = function() {
    basketScripts.setPriceBook();
};
