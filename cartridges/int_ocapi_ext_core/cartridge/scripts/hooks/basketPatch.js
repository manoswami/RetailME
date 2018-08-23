/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * basketPatch.ds
 *
 * apply a patch to a basket
 */

importPackage(dw.system);
importPackage(dw.web);
importPackage(dw.value);
importPackage(dw.util);
importPackage(dw.order);
importPackage(dw.campaign);
importPackage(dw.catalog);
importPackage(dw.customer);
importScript("int_ocapi_ext_core:api/EABasket.ds");
importScript("int_ocapi_ext_core:actions/GetCoreCartridgePath.ds");

var getShippingMethods = require("./getShippingMethods");
var updateProductLineItem = require("./updateProductLineItem");
var Status = require('dw/system/Status');

/**
 * beforePatch
 *
 * called before patching a basket
 */
exports.beforePatch = function(basket, update) {
    if (update.c_patchInfo) {
        var patch = JSON.parse(update.c_patchInfo);
        var type = patch.type;
        var data = patch.data;
        // see what kind of patch this is
        if (type === "after_abandon_order") {
            // reset the channel type of the basket to DSS
            basket.setChannelType(LineItemCtnr.CHANNEL_TYPE_DSS);
            if (data.currencyCode) {
                basket.currencyCode = data.currencyCode;
            }
            if (data.gift_message) {
                return setGiftMessage(basket, data.gift_message);
            }
            return new Status(Status.OK);
        } else {
            return new Status(Status.OK);
        }
    } else {
        return new Status(Status.OK);
    }
};

/**
 * afterPatch
 *
 * after patching a basket
 */
exports.afterPatch = function(basket, update) {
    if (update.c_patchInfo) {
        var patch = JSON.parse(update.c_patchInfo);
        var type = patch.type;
        var data = patch.data;
        if (type === "validate_cart_for_checkout") {
            dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
            var validate = require(getCoreCartridgePath() + "/cartridge/scripts/cart/ValidateCartForCheckout");
            var pdict = {
                Basket : basket,
                ValidateTax : false
            };
            validate.execute(pdict);
            var enable_checkout = true;
            if (empty(basket) || basket.allProductLineItems.size() == 0) {
                enable_checkout = false;
            }
            if (pdict.EnableCheckout === false) {
                enable_checkout = false;
            }
            var obj = basket.custom.eaCustomAttributes ? JSON.parse(basket.custom.eaCustomAttributes) : {};
            obj.enable_checkout = enable_checkout;
            basket.custom.eaCustomAttributes = JSON.stringify(obj);
            return new Status(Status.OK);
        } else if (type == "get_shipping_method_list") {
            return getShippingMethods.calculateShippingMethods(basket);
        } else if (type == "after_abandon_order") {
            // We have to put shipments back in afterPATCH because if we put in
            // beforePATCH , it gets wiped out by regular ocapi processing.
            // We are setting the currency in the basket in beforePATCH so that
            // the basket is in the right currency as the shipping method
            // setting the shipping address back
            for (var i = 0; i < data.shipments.length; i++) {
                var shippingAddress = basket.shipments[i].createShippingAddress();
                var shipmentObj = data.shipments[i];
                var orderAddress = basket.shipments[i].shippingAddress;
                orderAddress.setFirstName(shipmentObj.shipping_address.first_name);
                orderAddress.setLastName(shipmentObj.shipping_address.last_name);
                orderAddress.setAddress1(shipmentObj.shipping_address.address1);
                if (shipmentObj.shipping_address.address2) {
                    orderAddress.setAddress2(shipmentObj.shipping_address.address2);
                }
                orderAddress.setCity(shipmentObj.shipping_address.city);
                orderAddress.setStateCode(shipmentObj.shipping_address.state_code);
                orderAddress.setCountryCode(shipmentObj.shipping_address.country_code);
                orderAddress.setPostalCode(shipmentObj.shipping_address.postal_code);
                orderAddress.setPhone(shipmentObj.shipping_address.phone);

                // setting the shipping method back
                if (data.shipments[i].shipping_method) {
                    var shippingMethod = data.shipments[i].shipping_method.id;
                    var applicableShippingMethods = ShippingMgr.getShipmentShippingModel(basket.shipments[i]).getApplicableShippingMethods();
                    var smIter = applicableShippingMethods.iterator();
                    while (smIter.hasNext()) {
                        var thisMethod = smIter.next();
                        if (thisMethod.getID() == shippingMethod) {
                            basket.shipments[i].setShippingMethod(thisMethod);
                            break;
                        }
                    }

                }
            }
            // make sure to call the calculate hook
            dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
            return new Status(Status.OK);
        } else {
            return new Status(Status.OK);
        }
    } else {
        return new Status(Status.OK);
    }
};


/**
 * setGiftMessage
 *
 * set the gift message in the basket
 */
function setGiftMessage(basket, data) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("basketPatch setGiftMessage setting gift info");
    var isGift = data.is_gift;
    var message = data.message;
    var shipments = basket.getShipments();
    var sIterator = shipments.iterator();
    while (sIterator.hasNext()) {
        var shipment = sIterator.next();
        if (isGift == "true") {
            shipment.setGift(true);
            shipment.setGiftMessage(message);
        } else {
            shipment.setGift(false);
            shipment.setGiftMessage(message);
        }
    }
    log.info("basketPatch setGiftMessage exit");
    return new Status(Status.OK);
}
