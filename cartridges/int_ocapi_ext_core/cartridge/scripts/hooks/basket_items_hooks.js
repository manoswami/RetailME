/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_items_hooks.js
 * 
 * Handles OCAPI hooks for basket items calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var LineItemCtnr = require('dw/order/LineItemCtnr');
var basketScripts = require('./basket_hook_scripts');
var updateProductLineItem = require('./updateProductLineItem');

/**
 * the afterPOST hook - called after adding an item to the basket
 * dw.ocapi.shop.basket.items.afterPOST
 */
exports.afterPOST = function(basket, productItems) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info(" basket afterPOST: entering script");
    var req = request.httpParameters;
    // only call this code for Endless Aisle
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        for ( i = 0; i < productItems.length; i++) {
            var productItem = productItems[i];
            // need to set the channel type to DSS and add some custom
            // attributes to the basket
            basket.setChannelType(LineItemCtnr.CHANNEL_TYPE_DSS);
            basket.custom.eaEmployeeId = productItem.c_employee_id;
            basket.custom.eaStoreId = productItem.c_store_id;
            // now update the product item
            var status = updateProductLineItem.updateProductItem(basket, productItem, productItem.c_employee_id, productItem.c_store_id);
            if (status.status == Status.ERROR) {
                log.info("basket afterPOST: error on updateProductLineItem");
                return status;
            }
        }
        // now call calculate again since the options on an item may have
        // changed and the basket needs recalculating
        dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
    }
    log.info("basket afterPOST: exiting script");
    return new Status(Status.OK);
};

/**
 * the beforePOST basket hook. This gets called before a basket post operation.
 * dw.ocapi.shop.basket.items.beforePOST
 */
exports.beforePOST = function() {
    basketScripts.setPriceBook();
}