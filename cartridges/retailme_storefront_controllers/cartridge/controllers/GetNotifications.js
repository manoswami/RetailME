var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger');
var HashMap = require('dw/util/HashMap');

function start()
{
	try{	
		var requestData = request;
		var sessionData = session;
		var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
		var reqBodyJson = JSON.parse(reqBodyStr);
		var storeId : String = reqBodyJson.storeId;
		var queryAttributes : HashMap = new HashMap();
		queryAttributes.put("custom.storeId",storeId);
		if(reqBodyJson.type != null){
			var type : String = reqBodyJson.type;
			queryAttributes.put("custom.type",type);
		}
		if(reqBodyJson.isNew != null){
			var isNew : Boolean = reqBodyJson.isNew;
			if (isNew == false){
				isNew = null;
			}
			queryAttributes.put("custom.isNew",isNew);
		}	
		
		var notificationsIterator : Iterator = CustomObjectMgr.queryCustomObjects('notificationData', queryAttributes, null);
	    var notificationsArray = [];
		while(notificationsIterator.hasNext())
		{
			var notificationCO : CustomObject = notificationsIterator.next();
			notificationsArray.push({"NotificationID" : notificationCO.custom.notificationId, "Type" : notificationCO.custom.type, "ZoneID" : notificationCO.custom.zoneId, "CustomerID" : notificationCO.custom.customerId, "Message" : notificationCO.custom.Msg, "isNew" : notificationCO.custom.isNew});
		}		
		app.getView({dataJSON : JSON.stringify(notificationsArray)}).render('util/successDataJson');	
	}
	catch(e)
	{
		Logger.error("Error occured in GetNotification.js - start : "+ e);		
		app.getView().render('util/errorjson');
	}
}

exports.Start = guard.ensure(['post'], start);
