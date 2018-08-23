var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Status = require('dw/system/Status');


exports.afterPOST = function(order : Order) {
	OrderMgr.placeOrder(order);
	order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
	order.setExportStatus(Order.EXPORT_STATUS_READY);
	return new Status(Status.OK);
}