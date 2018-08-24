
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var HttpService = require('dw/svc/HTTPService');
var Result = require('dw/svc/Result');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var CustomObject = require('dw/object/CustomObject');
var HashMap = require('dw/util/HashMap');
var HashSet = require('dw/util/HashSet');
var Iterator = require('dw/util/Iterator');
var ArrayList = require('dw/util/ArrayList');
var CustomObjName = "TestInitialData";
var Logger = require('dw/system/Logger');
const Status = require('dw/system/Status');

function getZoneDetails()
{
	try
	{
		var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
		var reqBodyJson = JSON.parse(reqBodyStr);
		var zoneid : String = reqBodyJson.ZoneID;
		var storeid : String = reqBodyJson.StoreID;
		var type : String = reqBodyJson.Type;
		
		var zoneDetailsList : ArrayList = new ArrayList();
		switch(type.toLowerCase())
		{
			
			case "misplaced" : 
				zoneDetailsList = getMisplacedProducts(storeid,zoneid);
				break;
				
			case "restock" : 
				zoneDetailsList = getRestockProducts(storeid,zoneid);
				break;
			
			case "location" : 
				zoneDetailsList = getProductsLocation(storeid,zoneid);
				break;
							
		}
		
		var zoneDetailsArray = [];
		var zoneDetailsListIterator : Iterator = zoneDetailsList.iterator();
		while(zoneDetailsListIterator.hasNext())
		{
			var zoneProductJSON = {};
			var zoneProductMap : HashMap = zoneDetailsListIterator.next();
			zoneProductJSON.ProductName = zoneProductMap.get("ProductName");
			zoneProductJSON.InventoryInStore = zoneProductMap.get("InventoryInStore");
			zoneProductJSON.QuantityInZone = zoneProductMap.get("QuantityInZone");
			zoneProductJSON.Size = zoneProductMap.get("Size");
			zoneProductJSON.Color = zoneProductMap.get("Color");
			zoneDetailsArray.push(zoneProductJSON);
		}
		app.getView({zoneDetailsJSON : JSON.stringify(zoneDetailsArray)}).render('util/zoneDetailsJson');
	}
	catch(e)
	{
		Logger.error("Error occured in StoreProductData.js : "+ e);
		app.getView().render('util/errorjson');
	}
}

function getProductCount()
{
	try
	{
		var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
		var reqBodyJson = JSON.parse(reqBodyStr);
		var storeid : String = reqBodyJson.StoreID;
		var type : String = reqBodyJson.Type;
		
		var zoneDetailsList : ArrayList = new ArrayList();
		switch(type.toLowerCase())
		{
			
			case "misplaced" : 
				zoneDetailsList = getMisplacedProductsCount(storeid);
				break;
				
			case "restock" : 
				zoneDetailsList = getRestockProductsCount(storeid);
				break;
			
		}
		
		var zoneDetailsArray = [];
		var zoneDetailsListIterator : Iterator = zoneDetailsList.iterator();
		while(zoneDetailsListIterator.hasNext())
		{
			var zoneProductJSON = {};
			var zoneProductMap : HashMap = zoneDetailsListIterator.next();
			zoneProductJSON.ZoneId = zoneProductMap.get("ZoneId");
			zoneProductJSON.ZoneCategory = zoneProductMap.get("ZoneCategory");
			zoneProductJSON.Count = zoneProductMap.get("Count");
			zoneDetailsArray.push(zoneProductJSON);
		}
		app.getView({zoneDetailsJSON : JSON.stringify(zoneDetailsArray)}).render('util/zoneDetailsJson');
	}
	catch(e)
	{
		Logger.error("Error occured in StoreProductData.js : "+ e);
		app.getView().render('util/errorjson');
	}
}

function getMisplacedProducts(storeid : String,zoneid : String)
{
	var zoneDetailsList : ArrayList = new ArrayList();
	var zoneVariants : HashSet = getInitialZoneVariants(storeid,zoneid);
	var currentZoneProdResultObj = getCurrentZoneProducts(zoneid) ;
	
	currentZoneProdResultObj.data.forEach(function(record) {
		var productID : String = record.variant_Id;
		var quantity : Number = parseInt(record.quantity);
		var productDetailsMap : HashMap = new HashMap();
		if(!zoneVariants.contains(productID))
		{
			productDetailsMap.put("QuantityInZone",quantity.toFixed());
			populateOtherProdDtls(productID,productDetailsMap,storeid);
			zoneDetailsList.push(productDetailsMap);
		}
	});
	return zoneDetailsList;
}

function getRestockProducts(storeid : String,zoneid : String)
{
	var zoneDetailsList : ArrayList = new ArrayList();
	var zoneVariants : HashMap = getInitialZoneVariantsCapacity(storeid,zoneid);
	var currentZoneProdResultObj = getCurrentZoneProducts(zoneid) ;
	var currentZoneProdMap : HashMap = new HashMap();
	
	currentZoneProdResultObj.data.forEach(function(record) {
		currentZoneProdMap.put(record.variant_Id, parseInt(record.quantity));
	});
	
	var zoneVariantsIterator : Iterator = zoneVariants.keySet().iterator();
	while(zoneVariantsIterator.hasNext())
	{
		var productID : String = zoneVariantsIterator.next();
		var quantity : Number = new Number(0);
		if(currentZoneProdMap.containsKey(productID))
		{
			quantity = currentZoneProdMap.get(productID);
		}
		var quantityInStore : Number = getProdInventoryInStore(productID,storeid);
		var productDetailsMap : HashMap = new HashMap();
		if(zoneVariants.get(productID) >= quantityInStore)
		{
			productDetailsMap.put("QuantityInZone",quantity.toFixed());
			populateOtherProdDtls(productID,productDetailsMap,storeid);
			zoneDetailsList.push(productDetailsMap);
		}
	}
	return zoneDetailsList;
}

function getProductsLocation(storeid : String,zoneid : String)
{
	var zoneDetailsList : ArrayList = new ArrayList();
	var zoneVariants : HashSet = getInitialZoneVariants(storeid,zoneid);
	var currentZoneProdResultObj = getCurrentZoneProducts(zoneid) ;
	var currentZoneProdMap : HashMap = new HashMap();
	
	currentZoneProdResultObj.data.forEach(function(record) {
		currentZoneProdMap.put(record.variant_Id, parseInt(record.quantity));
	});
	
	var zoneVariantsIterator : Iterator = zoneVariants.iterator();
	while(zoneVariantsIterator.hasNext())
	{
		var productID : String = zoneVariantsIterator.next();
		var quantity : Number = new Number(0);
		if(currentZoneProdMap.containsKey(productID))
		{
			quantity = currentZoneProdMap.get(productID);
		}
		var productDetailsMap : HashMap = new HashMap();
		productDetailsMap.put("QuantityInZone",quantity.toFixed());
		populateOtherProdDtls(productID,productDetailsMap,storeid);
		zoneDetailsList.push(productDetailsMap);
	}
	return zoneDetailsList;
}

function getInitialZoneVariants(storeid : String,zoneid : String) : HashSet
{
	var queryAttributes : HashMap = new HashMap();
	var zoneVariants : HashSet = new HashSet();
	queryAttributes.put("custom.StoreID",storeid);
	queryAttributes.put("custom.ZoneID",zoneid);
	var zoneDataIterator : Iterator = CustomObjectMgr.queryCustomObjects(CustomObjName, queryAttributes, null);
	
	while(zoneDataIterator.hasNext())
	{
		var zoneDataCO : CustomObject = zoneDataIterator.next();
		zoneVariants.add(zoneDataCO.custom.VariantID);	
	}
	return zoneVariants;
}

function getCurrentZoneProducts(zoneid : String)
{
	var service : HttpService = ServiceRegistry.get("tw.rest.zonedata");
	service.URL +=	"/Things/ProductThing/Services/GetProductLocation";
	service.addParam("zone_Id", zoneid);
	service.addHeader("Accept", "application/json");
	service.addHeader("Content-Type", "application/json");
	service.addHeader("appKey", "e6159a5e-34c0-45fa-9a5a-a8f7f366b6df");
	var result : Result = service.call();
	return result.object;
}

function getInitialZoneVariantsCapacity(storeid : String,zoneid : String) : HashMap
{
	var queryAttributes : HashMap = new HashMap();
	var zoneVariantsCapacity : HashMap = new HashMap();
	queryAttributes.put("custom.StoreID",storeid);
	queryAttributes.put("custom.ZoneID",zoneid);
	var zoneDataIterator : Iterator = CustomObjectMgr.queryCustomObjects(CustomObjName, queryAttributes, null);
	
	while(zoneDataIterator.hasNext())
	{
		var zoneDataCO : CustomObject = zoneDataIterator.next();
		zoneVariantsCapacity.put(zoneDataCO.custom.VariantID,zoneDataCO.custom.threshold);	
	}
	return zoneVariantsCapacity;
}

function populateOtherProdDtls(productID : String,productDetailsMap : HashMap,storeid : String)
{
	var Product = require('dw/catalog/Product');
	var product : Product = require('dw/catalog/ProductMgr').getProduct(productID);
	productDetailsMap.put("ProductName",product.name);
	var inventoryRecord = require('dw/catalog/ProductInventoryMgr').getInventoryList("inventory_store_"+storeid).getRecord(product);
	var prodInv = 0;
	if(!empty(inventoryRecord))
	{
		prodInv = inventoryRecord.getATS().getValue().toFixed();
	}
	productDetailsMap.put("InventoryInStore",prodInv);
	productDetailsMap.put("Size",product.custom.size);
	productDetailsMap.put("Color",product.custom.color);
}

function getProdInventoryInStore(productID : String,storeid : String)
{
	var inventoryRecord = require('dw/catalog/ProductInventoryMgr').getInventoryList("inventory_store_"+storeid).getRecord(productID);
	var prodInv = 0;
	if(!empty(inventoryRecord))
	{
		prodInv = inventoryRecord.getATS().getValue();
	}
	return prodInv;
}

function getMisplacedProductsCount(storeid : String)
{
	var zoneConfigMap : HashMap = getZonesInStore(storeid);
	var zoneIterator : Iterator = zoneConfigMap.keySet().iterator();
	var zoneDetailsList : ArrayList = new ArrayList();
	
	while(zoneIterator.hasNext())
	{
		var zoneid : String = zoneIterator.next();
		var	zoneCategory : String = zoneConfigMap.get(zoneid);
		var misplacedProdCount : Number = new Number("0");
		var misplacedProdList : ArrayList = getMisplacedProducts(storeid,zoneid);
		var misplacedProdListIterator : Iterator = misplacedProdList.iterator();
		while(misplacedProdListIterator.hasNext())
		{
			var productDetailsMap : HashMap = misplacedProdListIterator.next();
			misplacedProdCount += parseInt(productDetailsMap.get("QuantityInZone"));
		}
		var zoneDetailsMap : HashMap = new HashMap();
		zoneDetailsMap.put("ZoneId",zoneid);
		zoneDetailsMap.put("ZoneCategory",zoneCategory);
		zoneDetailsMap.put("Count",misplacedProdCount);
		zoneDetailsList.push(zoneDetailsMap);
	}
	return zoneDetailsList;
}

function getRestockProductsCount(storeid : String)
{
	var zoneConfigMap : HashMap = getZonesInStore(storeid);
	var zoneIterator : Iterator = zoneConfigMap.keySet().iterator();
	var zoneDetailsList : ArrayList = new ArrayList();
	
	while(zoneIterator.hasNext())
	{
		var zoneid : String = zoneIterator.next();
		var	zoneCategory : String = zoneConfigMap.get(zoneid);
		var restockProdList : ArrayList = getRestockProducts(storeid,zoneid);
		var restockProdCount : Number = restockProdList.size();
	
		var zoneDetailsMap : HashMap = new HashMap();
		zoneDetailsMap.put("ZoneId",zoneid);
		zoneDetailsMap.put("ZoneCategory",zoneCategory);
		zoneDetailsMap.put("Count",restockProdCount);
		zoneDetailsList.push(zoneDetailsMap);
	}
	return zoneDetailsList;
}

function getZonesInStore(storeid : String) : HashMap
{
	var queryAttributes : HashMap = new HashMap();
	var zoneDetails : HashMap = new HashMap();
	queryAttributes.put("custom.StoreID",storeid);
	var zoneDataIterator : Iterator = CustomObjectMgr.queryCustomObjects(CustomObjName, queryAttributes, null);
	
	while(zoneDataIterator.hasNext())
	{
		var zoneDataCO : CustomObject = zoneDataIterator.next();
		if(!zoneDataCO.custom.ZoneName.equalsIgnoreCase("checkout") && !zoneDataCO.custom.isMocked)
		{
			zoneDetails.put(zoneDataCO.custom.ZoneID,zoneDataCO.custom.ZoneName);	
		}
	}
	return zoneDetails;
}


exports.generateNotifications = function(parameters)
{
	try
	{
		var storeId = parameters.StoreId;
		var zoneDetailsList : ArrayList = getMisplacedProductsCount(storeId);
		var zoneDetailsListIterator : Iterator =  zoneDetailsList.iterator();
		while(zoneDetailsListIterator.hasNext())
		{
			var zoneDetailsMap : HashMap = zoneDetailsListIterator.next();
			if(zoneDetailsMap.get("Count") > 0)
			{
				if(!notificationAlreadyExists(storeId,"Misplaced",zoneDetailsMap.get("ZoneId")))
				{
					var notificationCO = CustomObjectMgr.createCustomObject('notificationData', require('dw/util/UUIDUtils').createUUID());
					notificationCO.custom.storeId = storeId;
					notificationCO.custom.zoneId = zoneDetailsMap.get("ZoneId");
					notificationCO.custom.type = "Misplaced";
					notificationCO.custom.isNew = true;
					notificationCO.custom.Msg = "Misplaced products in " + zoneDetailsMap.get("ZoneCategory") + " Area";
				}
			}
		}
		
		zoneDetailsList = getRestockProductsCount(storeId);
		zoneDetailsListIterator =  zoneDetailsList.iterator();
		while(zoneDetailsListIterator.hasNext())
		{
			var zoneDetailsMap : HashMap = zoneDetailsListIterator.next();
			if(zoneDetailsMap.get("Count") > 0)
			{
				if(!notificationAlreadyExists(storeId,"Restock",zoneDetailsMap.get("ZoneId")))
				{
					var notificationCO = CustomObjectMgr.createCustomObject('notificationData', require('dw/util/UUIDUtils').createUUID());
					notificationCO.custom.storeId = storeId;
					notificationCO.custom.zoneId = zoneDetailsMap.get("ZoneId");
					notificationCO.custom.type = "Restock";
					notificationCO.custom.isNew = true;
					notificationCO.custom.Msg = "Product restock required in " + zoneDetailsMap.get("ZoneCategory") + " Area";
				}
			}
		}
	}
	catch(e)
	{
		Logger.error("Error occured in generateNotifications StoreProductData.js : {0}", e);
		return new Status(Status.ERROR);
	}
}

function notificationAlreadyExists(storeid : String,type : String,zoneId : String) : HashSet
{
	var queryAttributes : HashMap = new HashMap();
	queryAttributes.put("custom.storeId",storeid);
	queryAttributes.put("custom.type",type);
	queryAttributes.put("custom.zoneId",zoneId);
	queryAttributes.put("custom.isNew",true);
	var zoneDataIterator : Iterator = CustomObjectMgr.queryCustomObjects('notificationData', queryAttributes, null);
	
	if(zoneDataIterator.hasNext())
	{
		return true;
	}
	return false;
}

exports.GetZoneDetails = guard.ensure(['post'], getZoneDetails);
exports.GetProductCount = guard.ensure(['post'], getProductCount);