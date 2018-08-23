var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var CustomObject = require('dw/object/CustomObject');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var Logger = require('dw/system/Logger');
var SeekableIterator = require('dw/util/SeekableIterator');
var ArrayList = require('dw/util/ArrayList');
var Iterator = require('dw/util/Iterator');
var Collection = require('dw/util/Collection');
var HashMap = require('dw/util/HashMap');
var HashSet = require('dw/util/HashSet');

function start()
{
	try
	{
		var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
		var reqBodyJson = JSON.parse(reqBodyStr);
		var storeId : String = reqBodyJson.storeId;	
		var availableZones : ArrayList = new ArrayList();		
		var queryAttributes : HashMap = new HashMap();
		queryAttributes.put("custom.StoreID",storeId);
		var zoneDataIterator : Iterator = CustomObjectMgr.queryCustomObjects('TestInitialData', queryAttributes, null);
	    var customersArray = [];
		while(zoneDataIterator.hasNext())
		{
			var zoneDataCO : CustomObject = zoneDataIterator.next();
			if(!availableZones.contains(zoneDataCO.custom.ZoneID)){			
				availableZones.add(zoneDataCO.custom.ZoneID);	
				var customersIterator : SeekableIterator = CustomerMgr.searchProfiles('custom.ZoneID = {0}', 'lastModified asc', zoneDataCO.custom.ZoneID);
				customersArray.push({"ZoneId" : zoneDataCO.custom.ZoneID, "ZoneName" : zoneDataCO.custom.ZoneName, "CustomerCount" : customersIterator.count});
			}
		}		
		app.getView({dataJSON : JSON.stringify(customersArray)}).render('util/successDataJson');		
	}
	catch(e)
	{
		Logger.error("Error occured in GetCustomersByStore.js - start : "+ e);	
		app.getView().render('util/errorjson');
	}
}

exports.Start = guard.ensure(['post'], start);
