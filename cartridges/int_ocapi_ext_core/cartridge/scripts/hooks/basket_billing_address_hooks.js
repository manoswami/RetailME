/**
 * ©2018 salesforce.com, inc. All rights reserved.
 *
 * basket_billing_address_hooks.js
 *
 * Handles OCAPI hooks for basket billing address calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var basketScripts = require('./basket_hook_scripts');
var validateAddress = require('./validateAddress');

/**
 * the beforePUT hook. This is used to validate a billing address.
 * dw.ocapi.shop.basket.billing_address.beforePUT
 */
exports.beforePUT = function(basket, orderAddress) {
    basketScripts.setPriceBook();
    var req = request.httpParameters;
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        return  validateAddress.validateBasketAddress(basket, orderAddress);
    }
};
