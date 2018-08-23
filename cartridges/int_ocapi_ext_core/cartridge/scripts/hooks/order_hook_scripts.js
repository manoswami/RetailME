/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 *
 * order_hook_scripts.js
 *
 * Handles OCAPI hooks for order calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var LineItemCtnr = require('dw/order/LineItemCtnr');
var Transaction = require('dw/system/Transaction');
/**
 * the modifyGETResponse hook - called after getting an order
 */
exports.modifyGETResponse = function(order, orderResponse) {
    var status = "";
    var orderStatus = order.getStatus();
    var shippingStatus = order.getShippingStatus();
    if ((orderStatus == dw.order.Order.ORDER_STATUS_NEW || orderStatus == dw.order.Order.ORDER_STATUS_OPEN)
            && (shippingStatus == dw.order.Order.SHIPPING_STATUS_SHIPPED)
            || (orderStatus == dw.order.Order.ORDER_STATUS_COMPLETED)) {
        status = dw.web.Resource.msg('order.status.shipped.msg', 'order', null);
    } else if ((orderStatus == dw.order.Order.ORDER_STATUS_NEW || orderStatus == dw.order.Order.ORDER_STATUS_OPEN)
            && (shippingStatus != dw.order.Order.SHIPPING_STATUS_SHIPPED)) {
        status = dw.web.Resource.msg('order.status.processed.msg', 'order',
                null);
    } else if (orderStatus == dw.order.Order.ORDER_STATUS_CANCELLED) {
        status = dw.web.Resource.msg('order.status.cancelled.msg', 'order',
                null);
    } else {
        status = orderStatus.displayValue;

    }
    orderResponse.c_eaStatus = status;
    return new Status(Status.OK);
};

/**
 * the afterPOST hook - called after creating an order. Used to set the customer
 * name of the order for unregistered customers
 */
exports.afterPOST = function(order) {
    if (order.getChannelType().getValue() === LineItemCtnr.CHANNEL_TYPE_DSS) {
        // if this is a guest checkout, set the order's customer to the name in
        // the shipping address
        if (order.getCustomer().isAnonymous()) {
            var shipments = order.getShipments().iterator();
            while (shipments.hasNext()) {
                var shipment = shipments.next();
                var address = shipment.getShippingAddress();
                if (address) {
                    order.setCustomerName(address.getFullName());
                    break;
                }
            }
        }

        if(!order.custom.eaEmployeeId || !order.custom.eaStoreId){

            var plis = order.getProductLineItems();
            if(plis.length > 0){
                var plisIterator = plis.iterator();
                while (plisIterator.hasNext()) {
                    var pli = plisIterator.next();
                    if(pli.custom.eaEmployeeId && pli.custom.eaStoreId){
                        Transaction.wrap(function() {
                            order.custom.eaEmployeeId = pli.custom.eaEmployeeId;
                            order.custom.eaStoreId = pli.custom.eaStoreId;
                        });
                        break;
                    }
                }
            }
        }
    }
    return new Status(Status.OK);
};
