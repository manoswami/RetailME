var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var HttpService = require('dw/svc/HTTPService');
var Result = require('dw/svc/Result');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Logger = require('dw/system/Logger');
var helpers = require('int_marketing_cloud/cartridge/scripts/models/util/helpers.js');
var customObjectName = 'TestInitialData';
var Status = require('dw/system/Status');

function getZoneConfiguration(storeId : String)
{
	Logger.info("StoreID is  : "+ storeId);
	var service : HttpService = ServiceRegistry.get("tw.rest.zonedata");
	service.URL += "/Things/ZoneThing/Services/GetZoneConfiguration"
	service.addParam("store_Id", storeId);
	service.addHeader("Accept", "application/json");
	service.addHeader("Content-Type", "application/json");
	service.addHeader("appKey", "e6159a5e-34c0-45fa-9a5a-a8f7f366b6df");
	var result : Result = service.call();
	var resultObj = result.object;

	resultObj.data.forEach(function(record) {
		if(record.zone_Name.equalsIgnoreCase("checkout"))
		{
			var variantId : String = "NA";
			var quantity : Number = new Number("0");
			var zoneId : String = record.zone_Id;
			var threshold : Number = record.threshold;
			var zoneName : String = record.zone_Name;
			createZoneConfiguration(variantId, zoneId, threshold, zoneName, storeId, quantity);
		}
		else
		{
			record.variants.forEach(function(variant) {
				var variantId : String = variant.variant_Id;
				var quantity : Number = variant.quantity;
				var zoneId : String = record.zone_Id;
				var threshold : Number = record.threshold;
				var zoneName : String = record.zone_Name;
				createZoneConfiguration(variantId, zoneId, threshold, zoneName, storeId, quantity);
			});
		}
	});

}

function createZoneConfiguration(variantId : String, zoneId : String, threshold : Number, zoneName : String,storeId : String,quantity : Number)
{
	// persist zoneId,variantId,threshold,zoneCategory
	var co = helpers.getCustomObject(customObjectName, variantId);
	co.ZoneID  = zoneId;
	co.threshold = threshold;
	co.ZoneName = zoneName;
	co.Quantity = quantity;
	co.StoreID = storeId;
}

exports.execute = function(parameters){
	var store_Id : String = parameters.store_Id;
	try
	{
		getZoneConfiguration(store_Id);
		return new Status(Status.OK);
	}
	catch(e)
	{
		Logger.error("Error occured in ZoneConfiguration.js : "+ e);
		return new Status(Status.ERROR);
	}

}