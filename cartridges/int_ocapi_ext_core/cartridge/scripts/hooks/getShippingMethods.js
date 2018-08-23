/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * Hook file for getting shipping methods.
 * 
 */

importScript("util/ValueFormatters.ds");

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var ShippingMgr = require('dw/order/ShippingMgr');
var HashMap = require('dw/util/HashMap');
var Transaction = require('dw/system/Transaction');

var storefrontCartridgePath = require('int_ocapi_ext_core/cartridge/scripts/actions/GetCoreCartridgePath').getCoreCartridgePath();
var updateShipmentShippingMethod = require(storefrontCartridgePath + '/cartridge/scripts/checkout/UpdateShipmentShippingMethod');
var precalculateShipping = require(storefrontCartridgePath + '/cartridge/scripts/checkout/PreCalculateShipping');
var getApplicableShippingMethods = require(storefrontCartridgePath + '/cartridge/scripts/checkout/GetApplicableShippingMethods');

/**
 * Calculate available shipping methods
 * 
 * @param basket
 * @return status
 */
exports.calculateShippingMethods = function(basket) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("getShippingMethods calculateShippingMethods start");
    var args = {
        Basket : basket,
        City : basket.defaultShipment.shippingAddress.city,
        State : basket.defaultShipment.shippingAddress.stateCode,
        Country : basket.defaultShipment.shippingAddress.countryCode,
        PostalCode : basket.defaultShipment.shippingAddress.postalCode
    };
    status = getApplicableShippingMethods.execute(args);
    if (status === PIPELET_ERROR) {
        log.info("getShippingMethods calculateShippingMethods exit with error");
        return new Status(Status.ERROR);
    }

    var json = [];
    var shippingMethods = args.ShippingMethods;
    var shippingCosts = new HashMap();
    var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();
    var currentShippingMethod = basket.defaultShipment.getShippingMethod() || defaultShippingMethod;
    var shipment = basket.getDefaultShipment();
    var shippingModel = ShippingMgr.getShipmentShippingModel(shipment);

    // calculate the shipping costs
    for (var i = 0; i < shippingMethods.length; ++i) {
        var method = shippingMethods[i];
        args = {
            Shipment : basket.defaultShipment,
            ShippingMethod : method,
            ShippingMethodID : method.ID,
            ShippingMethods : shippingMethods
        };
        Transaction.wrap(function() {
            updateShipmentShippingMethod.execute(args);
        });
        dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
        var shippingArgs = {
            Basket : basket,
            Method : method
        };
        precalculateShipping.execute(shippingArgs);
        shippingCosts.put(method.ID, shippingArgs.ShippingCost);
        var methodJSON = {
            shipping_method_id : method.ID,
            shipping_method_name : method.displayName,
            shipping_method_base_price : ValueFormatters.formatFixedValueOrNull(shippingModel.getShippingCost(method).getAmount().valueOrNull, 2)
        };

        if (!empty(method.description)) {
            methodJSON.shipping_method_description = method.description;
        }
        var shippingCost = shippingArgs.ShippingCost;
        if (shippingCost && shippingCost.surchargeAdjusted != null && shippingCost.surchargeAdjusted != 0) {
            methodJSON.shipping_method_surcharge = ValueFormatters.formatFixedValueOrNull(shippingCost.surchargeAdjusted.valueOrNull, 2);
        }
        if (method.ID == defaultShippingMethod.ID) {
            methodJSON.default_method = true;
        }
        json.push(methodJSON);
    }
    Transaction.wrap(function() {
        updateShipmentShippingMethod.execute({
            Shipment : basket.defaultShipment,
            ShippingMethod : currentShippingMethod,
            ShippingMethodID : currentShippingMethod.ID,
            ShippingMethods : shippingMethods
        });
    });

    dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
    var obj = basket.custom.eaCustomAttributes ? JSON.parse(basket.custom.eaCustomAttributes) : {};
    obj.shipping_methods = json;
    basket.custom.eaCustomAttributes = JSON.stringify(obj);
    log.info("getShippingMethods calculateShippingMethods exit");
    return new Status(Status.OK);
};
