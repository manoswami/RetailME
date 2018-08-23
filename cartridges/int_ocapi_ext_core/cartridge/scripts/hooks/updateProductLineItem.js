/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * updateProductLineItem.ds
 * 
 */
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

/**
 * updateProductItem - update the product line item to include the employee id and store id
 */
exports.updateProductItem = function(basket, productItem, employeeId, storeId) {

    var log = Logger.getLogger("instore-audit-trail");
    log.info("UpdateProductLineItem updateProductItem: entering script");

    if (empty(basket)) {
        eaStatus.findMessage("EA_BASKET_404");
        overrideDetails.ErrorJson = eaStatus.stringify();
        log.info("updateProductLineItem updateProductItem: exiting script with error EA_BASKET_404 error");
        return new Status(Status.ERROR, statusMessage, eaStatus.stringify());
    }

    var option_items = productItem.c_option_items;
    if (option_items) {
        option_items = JSON.parse(option_items);
    }

    var productLineItems = basket.getAllProductLineItems().iterator();
    var matching = [];
    var matchingParent = [];
    while (productLineItems.hasNext()) {
        var productLineItem = productLineItems.next();
        // iterate all product line items of the basket and set employee ids
        if (productLineItem.productID.equalsIgnoreCase(productItem.productId)) {
            matching.push(productLineItem);
        }
    }

    // update the last matching product. This is the one that was most recently
    // added.
    if (matching.length > 0) {
        productLineItem = matching[matching.length - 1];
        productLineItem.custom.eaEmployeeId = employeeId;
        productLineItem.custom.eaStoreId = storeId;
    }

    log.info("updateProductLineItem updateProductItem: exiting script");
    return new Status(Status.OK);
};

/**
 * updateOptionModel - update the option model
 */
exports.updateOptionModel = function(option_model, option_items) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("updateProductLineItem updateOptionModel: entering script");
    var option_id = option_items[0].option_id;
    var option_value_id = option_items[0].option_value_id;
    var product_option = option_model.getOption(option_id);
    var pov = option_model.getOptionValue(product_option, option_value_id);
    option_model.setSelectedOptionValue(product_option, this.getProductOptionValue(option_model, option_items));
    log.info("updateProductLineItem updateOptionModel: exiting script");
};

/**
 * getProductOptionValue - get the option value for an option
 */
exports.getProductOptionValue = function(option_model, option_items) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("updateProductLineItem getProductOptionValue: entering script");
    var option_id = option_items[0].option_id;
    var option_value_id = option_items[0].option_value_id;
    var product_option = option_model.getOption(option_id);
    log.info("updateProductLineItem getProductOptionValue: exiting script");
    return option_model.getOptionValue(product_option, option_value_id);
};
