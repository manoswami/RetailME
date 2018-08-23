/**
 * ©2018 salesforce.com, inc. All rights reserved.
 *
 * basket_shipping_address_hooks.js
 *
 * Handles OCAPI hooks for basket shipping address calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var basketScripts = require('./basket_hook_scripts');
var validateAddress = require('./validateAddress');

/**
 * the beforePUT hook. This is used to validate a shipping
 * address.
 * dw.ocapi.shop.basket.shipment.shipping_address.beforePUT
 */
exports.beforePUT = function(basket, shipment, orderAddress) {
    basketScripts.setPriceBook();
    var req = request.httpParameters;
    // only call this code for Endless Aisle
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        return validateAddress.validateBasketAddress(basket, orderAddress);
    }
};
