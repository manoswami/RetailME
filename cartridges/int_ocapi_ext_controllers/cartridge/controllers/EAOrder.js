'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controllers used for order related functions
 * 
 * @module controllers/EAOrder
 */

/* API Includes */
var ISML = require('dw/template/ISML');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var ExtractOrderData = require('int_ocapi_ext_core/cartridge/scripts/actions/ExtractOrderData');
var DetermineEmailReceiptWithBilling = require('int_ocapi_ext_core/cartridge/scripts/actions/DetermineEmailReceiptWithBilling.ds');
var GetOrderFromOrderToken = require('int_ocapi_ext_core/cartridge/scripts/actions/GetOrderFromToken.ds');
var EmailModel = require('app_storefront_controllers/cartridge/scripts/models/EmailModel');

/* Controller Includes */
var EAUtils = require('~/cartridge/controllers/EAUtils');


/**
 * OrderDetails - returns the order details for a specific order
 */
function OrderDetails() {
    var errorJson;
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    if (requestObject) {
        var order = OrderMgr.getOrder(requestObject.order_no);
        if (order) {
            ISML.renderTemplate('responses/eabasketjson', {
                Order : order
            });
        }
    } else {
        errorJson = '{"httpStatus":501}';
        ISML.renderTemplate('responses/eabasketjson', {
            errorJson : errorJson
        });
        return;
    }
}

/**
 * OrderHistory - returns the order history of the current user
 */
function OrderHistory() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var orders;
    var CurrentHttpParameterMap = request.httpParameterMap;
    if (empty(CurrentHttpParameterMap.customerId.stringValue)) {
        orders = OrderMgr.searchOrders('customerEmail={0} OR orderNo={0}', 'creationDate desc', CurrentHttpParameterMap.customerEmailOrOrderNo.stringValue);
    } else {
        orders = OrderMgr.searchOrders('customerNo={0}', 'creationDate desc', CurrentHttpParameterMap.customerId.stringValue);
    }

    var args = {
        Orders : orders
    };
    ExtractOrderData.execute(args);
    if (args.JSONResponse) {
        ISML.renderTemplate('responses/json', {
            JSONResponse : args.JSONResponse
        });
    } else {
        var errorJson = '{"httpStatus":501}';
        ISML.renderTemplate('responses/eabasketjson', {
            errorJson : errorJson
        });
    }

}

/**
 * SendEmail - sends an order confirmation email to the email address on the order
 */
function SendEmail() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = OrderMgr.getOrder(requestObject.order_no);
    if (!order) {
        ISML.renderTemplate('responses/eaordernotfoundjson');
    }
    var ScriptResult = Transaction.wrap(function() {
        return DetermineEmailReceiptWithBilling.determineEmailReceipt(order);
    });
    var orderConfirmation;
    if (ScriptResult.useBilling == false) {
        orderConfirmation = 'mail/eaorderconfirmationnobilling';
    } else {
        orderConfirmation = 'mail/eaorderconfirmationwithbilling';
    }
    EmailModel.get(orderConfirmation, order.customerEmail)
        .setSubject(dw.web.Resource.msg('orderemail.subject', 'order', null))
        .setFrom(dw.system.Site.getCurrent().getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com')
        .send({
            Order : order
    });
    ISML.renderTemplate('responses/eaemailsentjson');
}

/**
 * RetrieveWebOrder - Retrieves the web order from the order Token
 */
function RetrieveWebOrder() {
    var requestObject = EAUtils.ExtractRequestObject();
    if (!requestObject) {
        EAUtils.UpdateProductMessages();
    } else {
        var ScriptResult = Transaction.wrap(function() {
            return GetOrderFromOrderToken.getOrderFromToken(requestObject.token);
        });
        if (!ScriptResult.orderNo) {
            EAUtils.UpdateProductMessages();
        } else {
            var order = OrderMgr.getOrder(requestObject.order_no);
            if (!order) {
                EAUtils.UpdateProductMessages();
            } else {
                EAUtils.UpdateProductMessages(order);
            }
        }
    }

}

/*
 * Web exposed methods
 */
exports.OrderDetails = guard.ensure([ 'https', 'post' ], OrderDetails);
exports.OrderHistory = guard.ensure([ 'https', 'get' ], OrderHistory);
exports.SendEmail = guard.ensure([ 'https', 'post' ], SendEmail);
exports.RetrieveWebOrder = guard.ensure([ 'https', 'get' ], RetrieveWebOrder);
