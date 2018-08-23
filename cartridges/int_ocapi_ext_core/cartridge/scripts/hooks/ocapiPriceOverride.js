/**
 * ©2018 salesforce.com, inc. All rights reserved.
 * 
 * ocapiPriceOverride.ds
 * 
 * hooks logic for price adjustment ocapi calls
 */
importScript("int_ocapi_ext_core:api/EAOverride.ds");
importScript("int_ocapi_ext_core:api/EAStatus.ds");
importScript("int_ocapi_ext_core:api/Authorize.ds");

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');


/**
 * authenticateForPriceOverride - authenticate associate for applying override
 */
exports.authenticateForPriceOverride = function(basket, overrideDetails, requestType) {  
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride authenticateForPriceOverride: entering script ");
    var discountType;
    var discountValue;
    var lineItemId;
    var level;
    if (requestType.equalsIgnoreCase("post")) {
        discountType = overrideDetails.discount.type;
        discountValue = overrideDetails.discount.value;
        lineItemId = overrideDetails.item_id;
        level = overrideDetails.level;
    } else {
        discountType = overrideDetails.applied_discount.type;
        if (discountType.equalsIgnoreCase("percentage")) {
            discountValue = overrideDetails.applied_discount.percentage;
        } else {
            discountValue = overrideDetails.applied_discount.amount;
        }
        
        lineItemId = overrideDetails.c_authorize_info.item_id;
        level = overrideDetails.c_authorize_info.level;
    }
    // Divide discount value by quantity to get discount for one product if
    // discount type is amount.
    // This is done because amount type price adjustments are applied at the
    // whole line item level but we want discount value per product item for
    // authorization.
    if (discountType.equalsIgnoreCase("amount") && level.equalsIgnoreCase("product")) {
        discountValue = discountValue.divide(overrideDetails.c_authorize_info.quantity);
    }
    log.info("ocapiPriceOverride authenticateForPriceOverride: exiting script");
    return priceOverrideAuthenticationHelper(basket, overrideDetails, discountType, discountValue, lineItemId, level);
}


/**
 * priceOverrideAuthenticationHelper - Helper function to authenticate associate
 * for product and shipping price override
 */
function priceOverrideAuthenticationHelper(basket, overrideDetails, discountType, discountValue, lineItemId, level){
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: entering script");
    var c_authorize_info = overrideDetails.c_authorize_info;
    
    var eaStatus = new EAStatus();
    var basketUpdate = false;
    var statusMessage;
    if (level.equalsIgnoreCase("product")) {
        statusMessage = "productOverrideError";
    } else if (level.equalsIgnoreCase("shipping")) {
        statusMessage = "shippingOverrideError"
    }
    
    if (empty(basket)) {
        eaStatus.findMessage("EA_BASKET_404");
        overrideDetails.ErrorJson = eaStatus.stringify();
        log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: exiting script with EA_BASKET_404 error");
        return new Status(Status.ERROR, statusMessage, eaStatus.stringify());
    }
    
    var agentAuthorize = new Authorize();
    agentAuthorize.authorize(c_authorize_info.employee_id, c_authorize_info.employee_passcode,
            c_authorize_info.store_id);
    
    // Check if the agent is logged in and if the agent has the log in on behalf
    // of permission.
    var allowLOBO = agentAuthorize.allowLOBO;
    if (!allowLOBO) {
        // if the agent does not have LOBO permission, then see if the logged in
        // manager does
        allowLOBO = c_authorize_info.manager_allowLOBO;
    }
    
    // If user has no permission to do overrides, but can apply override in case
    // of free shipping to store.
    if (c_authorize_info.ignore_permissions && level.equalsIgnoreCase("shipping")) {
        allowLOBO = true;
    }
    
    if (!allowLOBO) {
        // if no LOBO permission, then return error
        eaStatus.findMessage("EA_EMP_AUTH_4008");
        log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: exiting script with EA_EMP_AUTH_4008 error");
        return new Status(Status.ERROR, statusMessage, eaStatus.stringify());
    } else {
        // if has LOBO permission, then proceed
        var eaOverride = new EAOverride();
        
        
        // Check if manager's credentials are passed for override
        if (!empty(c_authorize_info.manager_employee_id)) {
            
            // fetch Manager's permissions for override and update basket
            var authorize = new Authorize();
            authorize.authorize(c_authorize_info.manager_employee_id,
                    c_authorize_info.manager_employee_passcode, c_authorize_info.store_id);
    
            if (authorize.isAuthorized()) {
                if (level.equalsIgnoreCase("product")) {
                    eaOverride.verifyAuthorization(
                            authorize.associateInfo.permissionGroupId,
                            c_authorize_info.product_id, discountType,
                            discountValue);
                } else if (level.equalsIgnoreCase("shipping")) {
                    eaOverride.verifyAuthorizationForShipping(
                            authorize.associateInfo.permissionGroupId,
                            dw.order.ShippingMgr.getShippingCost(basket.defaultShipment.getShippingMethod(),basket.totalGrossPrice).value,
                            discountType,
                            discountValue);
                }
                
                basketUpdate = eaOverride.allowBasketUpdate;
            }
            
        } else {
            
            if (level.equalsIgnoreCase("product")) {
            // fetch Agent's permissions for product override and update
            // basket
                eaOverride.verifyAuthorization(
                        agentAuthorize.associateInfo.permissionGroupId,
                        c_authorize_info.product_id, discountType,
                        discountValue);
                basketUpdate = eaOverride.allowBasketUpdate;
            } else if (level.equalsIgnoreCase("shipping")) {
                if (!c_authorize_info.ignore_permissions) {
                // fetch Agent's permissions for shipping override and update
                // basket
                    eaOverride.verifyAuthorizationForShipping(
                            agentAuthorize.associateInfo.permissionGroupId,
                            dw.order.ShippingMgr.getShippingCost(basket.defaultShipment.getShippingMethod(),basket.totalGrossPrice).value,
                            discountType,
                            discountValue);
                    basketUpdate = eaOverride.allowBasketUpdate;
                } else {
                // request says ignore the permissions, so just go ahead
                    basketUpdate = true;
                }

            }
        }
        
    }
    
    
    if (basketUpdate) {
        if (level.equalsIgnoreCase("product")) {
            log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: associate "
                    + c_authorize_info.employee_id
                    + " is creating a product price override of "
                    + discountValue + " on product " + lineItemId);
        } else if (level.equalsIgnoreCase("shipping")) {
            log.info("ocapiPriceOverride shippingPriceOverrideAuthenticationHelper: associate "
                    + c_authorize_info.employee_id
                    + " is creating a shipping price override of "
                    + discountValue + " on shipping " + lineItemId);
        }
        
        log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: exiting script without error");
        return new Status(Status.OK);
    } 
    
    eaStatus.findMessage("EA_PRICE_OVERRIDE_4014");
    log.info("ocapiPriceOverride priceOverrideAuthenticationHelper: exiting script with EA_PRICE_OVERRIDE_4014 error");
    return new Status(Status.ERROR, statusMessage, eaStatus.stringify());
}




/**
 * addCustomAttributesToOverride - Updates the line item (shipping OR product)
 * with custom attributes after override
 */
exports.addCustomAttributesToOverride = function(basket, overrideDetails, requestType) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride addCustomAttributesToOverride: entering script");
    var isLevelShipping;
    var isLevelProduct;
    if (requestType.equalsIgnoreCase("post")) {
        isLevelProduct = overrideDetails.level.equalsIgnoreCase("product");
        isLevelShipping = overrideDetails.level.equalsIgnoreCase("shipping");
    } else {
        isLevelProduct = overrideDetails.c_authorize_info.level.equalsIgnoreCase("product");
        isLevelShipping = overrideDetails.c_authorize_info.level.equalsIgnoreCase("shipping");
    }
    if (isLevelProduct) {
        addCustomAttributesToProductOverrideHelper(basket, overrideDetails);
    } else if (isLevelShipping) {
        addCustomAttributesToShippingOverrideHelper(basket, overrideDetails);
    }
    log.info("ocapiPriceOverride addCustomAttributesToOverride: exiting script");
}

/**
 * addCustomAttributesToProductOverrideHelper - add custom attributes to the
 * product override object in response
 */
function addCustomAttributesToProductOverrideHelper(basket, overrideDetails) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride addCustomAttributesToProductOverride: entering script");
    
    var c_authorize_info = overrideDetails.c_authorize_info;
    var lineItemId;
    if (c_authorize_info.item_id) {
        lineItemId = c_authorize_info.item_id;
    } else {
        lineItemId = overrideDetails.item_id;
    }
    
    var productLineItems = basket.getProductLineItems().iterator().asList();
    
    var productLineItem = null;
    for each (lineItem in productLineItems) {
        if (lineItem.productID.equalsIgnoreCase(c_authorize_info.product_id) &&  lineItem.UUID.equalsIgnoreCase(lineItemId)) {
            productLineItem = lineItem;
        }
    }
    
    if (productLineItem == null) {
        return new Status(Status.ERROR);
    }
    
    
    if (productLineItem.priceAdjustments[0]) {
        if (c_authorize_info.manager_employee_id) {
            productLineItem.custom.eaManagerEmployeeId = c_authorize_info.manager_employee_id;
        }
    }
    
    log.info("ocapiPriceOverride addCustomAttributesToProductOverride: exiting script without error");
}


/**
 * addCustomAttributesToShippingOverrideHelper - add custom attributes to the
 * shipping override override object in response
 */
function addCustomAttributesToShippingOverrideHelper(basket, overrideDetails){
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride addCustomAttributesToShippingOverride: entering script");
    var c_authorize_info = overrideDetails.c_authorize_info;
    var allLineItems = basket.getAllLineItems().iterator();
    while (allLineItems.hasNext()) {
        var lineItem = allLineItems.next();
        if (lineItem.describe().ID.equalsIgnoreCase("ShippingLineItem")) {
            if (c_authorize_info.manager_employee_id) {
                lineItem.custom.eaManagerEmployeeId = c_authorize_info.manager_employee_id;
            }
            lineItem.custom.eaEmployeeId = c_authorize_info.employee_id;
        }
    }
    log.info("ocapiPriceOverride addCustomAttributesToShippingOverride: exiting script without error");
}


/**
 * removeCustomAttributesFromLineItem - remove custom attributes from line item
 * (product OR shipping) for override after overrides gets deleted
 */
exports.removeCustomAttributesFromLineItem = function(basket){
    var log = Logger.getLogger("instore-audit-trail");
    log.info("ocapiPriceOverride removeCustomAttributesFromLineItem: entering script");
    var productLineItems = basket.getProductLineItems().iterator().asList();
    for each (lineItem in productLineItems) {
        if (!lineItem.priceAdjustments && lineItem.custom.hasOwnProperty("eaManagerEmployeeId")) {
            delete lineItem.custom.eaManagerEmployeeId; 
        }
    }
    var allLineItems = basket.getAllLineItems().iterator();
    while (allLineItems.hasNext()) {
        var lineItem = allLineItems.next();
        if (lineItem.describe().ID.equalsIgnoreCase("ShippingLineItem")) {
            if (!lineItem.hasOwnProperty("shippingPriceAdjustments") && lineItem.custom.hasOwnProperty("eaManagerEmployeeId")) {
                delete lineItem.custom.eaManagerEmployeeId;
            }
            delete lineItem.custom.eaEmployeeId;
        }
    }
    
    log.info("ocapiPriceOverride removeCustomAttributesFromLineItem: exiting script without error");
}