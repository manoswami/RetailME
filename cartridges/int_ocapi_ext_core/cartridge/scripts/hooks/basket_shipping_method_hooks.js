/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * basket_shipping_method_hooks.js
 * 
 * Handles OCAPI hooks for basket shipping method calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

var StoreMgr = require('dw/catalog/StoreMgr');

/**
 * the afterPUT hook. This is used to add a additional data to the
 * shipment.
 * dw.ocapi.shop.basket.shipment.shipping_method.afterPUT
 */
exports.afterPUT = function(basket, shipment, shippingMethod) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("basket shipment.shipping_method.afterPUT: entering script");
    // only call this code for Endless aisle
    var req = request.httpParameters;
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        if (shippingMethod.c_isDifferentStorePickup) {
            log.info("basket shipment.shipping_method.afterPUT: different store pickup selected");
            if (shippingMethod.c_pickupFromStoreId) {

                shipment.custom.fromStoreId = shippingMethod.c_pickupFromStoreId;
                var status = setStoreInventoryIdOnLineItems(shippingMethod.c_pickupFromStoreId, basket);
                if (status.status == Status.ERROR) {
                    log.info('basket shipment.shipping_method.afterPUT: Unable to set inventory list id into product line items');
                    return status;
                }
            }
            if (shippingMethod.c_message) {
                shipment.custom.storePickupMessage = shippingMethod.c_message;
            }
        } else {
            log.info("basket shipment.shipping_method.afterPUT: not different store pickup");
            var status = setStoreInventoryIdOnLineItems(null, basket);
            if (status.status == Status.ERROR) {
                log.info('basket shipment.shipping_method.afterPUT: Unable to clear inventory list id from product line items');
                return status;
            }
        }
    }
    dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
    log.info("basket shipment.shipping_method.afterPUT: exiting script");
    return new Status(Status.OK);
};

/**
 * This function sets the store inventory id on each line it for the store it is
 * going to be picked up at
 */
function setStoreInventoryIdOnLineItems(pickupStoreId, basket) {
    var log = Logger.getLogger("instore-audit-trail");
    var inventoryListID = null;
    log.info("basket setStoreInventoryIdOnLineItems: entering script " + pickupStoreId);
    if (!basket) {
        return Status.ERROR;
    }

    if (pickupStoreId != null) {
        var pickupStore = StoreMgr.getStore(pickupStoreId);
        if (!pickupStore) {
            return Status.ERROR;
        }
        inventoryListID = pickupStore.getInventoryListID();
        if (!inventoryListID) {
            return Status.ERROR;
        }
    }

    for each (var item in basket.getAllProductLineItems()) {
        log.info("basket setStoreInventoryIdOnLineItems: setting inventory id " + inventoryListID);
        item.setProductInventoryListID(inventoryListID);
    }
    log.info("basket setStoreInventoryIdOnLineItems: exiting script");
    return Status.OK;
}
