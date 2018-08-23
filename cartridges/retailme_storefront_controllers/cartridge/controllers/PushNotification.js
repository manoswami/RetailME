var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');
var StringUtils = require('dw/util/StringUtils');

function requestAssistance()
{
	try{
	Transaction.begin();
	var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
	var reqBodyJson = JSON.parse(reqBodyStr);
	var storeId : String = reqBodyJson.storeId;
	var zoneId : String = reqBodyJson.zoneId;
	var customerNo : String = reqBodyJson.customerNo;
	var customer : Customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
	var notificationCO = CustomObjectMgr.createCustomObject('notificationData', require('dw/util/UUIDUtils').createUUID());
	notificationCO.custom.storeId = storeId;
	notificationCO.custom.zoneId = zoneId;
	notificationCO.custom.customerId = customerNo;
	notificationCO.custom.type = "Assistance";
	notificationCO.custom.isNew = true;
	var zoneName = CustomObjectMgr.queryCustomObject('TestInitialData', 'custom.ZoneID = {0}', zoneId).custom.ZoneName;	       
	notificationCO.custom.Msg = customer.getProfile().firstName + " needs assistance in Women's Area";
	Transaction.commit();
	app.getView().render('util/successjson');
	}
	catch(e)
	{
		Logger.error("Error occured in PushNotification.js - requestAssistance : "+ e);
		Transaction.rollback();
		app.getView().render('util/errorjson');
	}
}

exports.RequestAssistance = guard.ensure(['post'], requestAssistance);
