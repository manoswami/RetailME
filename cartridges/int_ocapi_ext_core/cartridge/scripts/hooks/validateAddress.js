/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 *
 * validateAddress.ds is used by the OCAPI hooks to verify the address
 *
 */
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var LineItemCtnr = require('dw/order/LineItemCtnr');

importScript("int_ocapi_ext_core:requests/AddressValidationRequest.ds");

/*
 * validateBasketAddress is used to validate the OrderAddress that is being set in the basket.
 */
exports.validateBasketAddress = function(basket, orderAddress) {
    var log = Logger.getLogger("instore-audit-trail");
    var status = new Status(Status.OK);

    basket.setChannelType(LineItemCtnr.CHANNEL_TYPE_DSS);

    log.info("validateBasketAddress: before call to validate");

    var addressValidationRequest = new AddressValidationRequest();
    var args = {
        OrderAddress : orderAddress
    };
    var pipelet_status = addressValidationRequest.validateAddress(args);

    if (pipelet_status !== PIPELET_NEXT) {
        status = new Status(Status.ERROR, "AddressVerificationError", JSON.stringify(args.JSONResponse));
    }
    log.info("validateBasketAddress: after call to validate");
    return status;
};

/*
 * validateCustomerAddress is used to validate an updated or new customer address.
 */
exports.validateCustomerAddress = function(customerAddress) {
    var status = new Status(Status.OK);

    var addressValidationRequest = new AddressValidationRequest();
    var args = {
        CustomerAddress : customerAddress
    };
    var pipelet_status = addressValidationRequest.validateAddress(args);

    if (pipelet_status !== PIPELET_NEXT) {
        status = new Status(Status.ERROR, "AddressVerificationError", JSON.stringify(args.JSONResponse));
    }
    return status;
};
