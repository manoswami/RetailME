/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_price_adjustment_hooks.js
 * 
 * Handles calls to override. This hook is used while applying override to
 * either product or shipping
 */
importPackage(dw.system);
importPackage(dw.web);
importPackage(dw.value);
importPackage(dw.util);
importPackage(dw.order);
importPackage(dw.campaign);
importPackage(dw.catalog);
importPackage(dw.customer);

var ocapiPriceOverride = require('./ocapiPriceOverride');

/**
 * the beforePOST hook - called before applying override to
 * product/shipping
 */
exports.beforePOST = function(basket, priceAdjustmentRequest) {
    if (priceAdjustmentRequest.c_endlessaisle) {
        return ocapiPriceOverride.authenticateForPriceOverride(basket,
                priceAdjustmentRequest, "post");
    }
}

/**
 * the afterPOST hook - called after applying override to
 * product/shipping
 */
exports.afterPOST = function(basket, priceAdjustmentRequest) {
    if (priceAdjustmentRequest.c_endlessaisle) {
        return ocapiPriceOverride.addCustomAttributesToOverride(basket,
                priceAdjustmentRequest, "post");
    }
}

/**
 * the afterDELETE - hook called after deleting override from
 * product/shipping
 */
exports.afterDELETE = function(basket, priceAdjustmentId) {
    // not checking priceAdjustmentRequest.c_endlessaisle as we are removing ea_custom attributes only in this hook.
    return ocapiPriceOverride.removeCustomAttributesFromLineItem(basket);
}

/**
 * the afterPATCH - hook called after updating override on product/shipping
 */
exports.afterPATCH = function(basket, priceAdjustmentId,
        priceAdjustmentWebObject) {
    if (priceAdjustmentWebObject.c_endlessaisle) {
        return ocapiPriceOverride.addCustomAttributesToOverride(basket,
                priceAdjustmentWebObject, "patch");
    }
}

/**
 * the beforePATCH - hook called before updating override on product/shipping
 */
exports.beforePATCH = function(basket, priceAdjustmentId,
        priceAdjustmentWebObject) {
    if (priceAdjustmentWebObject.c_endlessaisle) {
        return ocapiPriceOverride.authenticateForPriceOverride(basket,
                priceAdjustmentWebObject, "patch");
    }
}
