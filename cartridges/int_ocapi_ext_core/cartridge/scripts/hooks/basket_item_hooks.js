/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_item_hooks.js
 * 
 * Handles OCAPI hooks for basket item calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var basketScripts = require('./basket_hook_scripts');
var updateProductLineItem = require('./updateProductLineItem');

/**
 * the beforePATCH hook. This is used to update an item in the basket.
 * dw.ocapi.shop.basket.item.beforePATCH
 */
exports.beforePATCH= function() {
    basketScripts.setPriceBook();
};

/**
 * the afterPATCH basket hook. This gets called after updating a product
 * line item in the basket
 * dw.ocapi.shop.basket.item.afterPATCH
 */
exports.afterPATCH = function(basket, productItem) {
    var log = Logger.getLogger("instore-audit-trail");
    var req = request.httpParameters;
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        log.info("basket afterPatchItem: entering script");
        // call the patch script. if that returns an error, return that error
        var status = updateProductLineItem.updateProductItem(basket, productItem, productItem.c_employee_id);
        if (status.status == Status.ERROR) {
            log.info("basket afterPatchItem: error on update");
            return status;
        }
        dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
        log.info("basket afterPatchItem: exiting script");
    }
    return new Status(Status.OK);
};

/**
 * the beforeDELETE hook. This is used to delete an item in the basket.
 * dw.ocapi.shop.basket.item.beforeDELETE
 */
exports.beforeDELETE = function() {
    basketScripts.setPriceBook();
};