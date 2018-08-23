var HttpService = require('dw/svc/HTTPService');
var Result = require('dw/svc/Result');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var HashMap = require('dw/util/HashMap');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var XMLStreamWriter = require('dw/io/XMLStreamWriter');
var Iterator = require('dw/util/Iterator');
var Pipeline = require('dw/system/Pipeline');
var Status = require('dw/system/Status');

exports.getStoreInventoryAndCreateXML = function(parameters)
{
	var service : HttpService = ServiceRegistry.get("tw.rest.zonedata");
	var storeId = parameters.StoreId;
	service.URL +=	"/Things/ProductThing/Services/GetProductLocation";
	service.addParam("store_Id", storeId);
	service.addHeader("Accept", "application/json");
	service.addHeader("Content-Type", "application/json");
	service.addHeader("appKey", "e6159a5e-34c0-45fa-9a5a-a8f7f366b6df");
	var result : Result = service.call();
	var resultObj = result.object;
	var inventoryMap : HashMap = new HashMap();
	resultObj.data.forEach(function(record) {
		var productID : String = record.variant_Id;
		var quantity : Number = parseInt(record.quantity);
		if(inventoryMap.containsKey(productID))
		{
			inventoryMap.put(productID, quantity + inventoryMap.get(productID));
		}
		else
		{
			inventoryMap.put(productID, quantity);
		}
	});
	var invMapIterator : Iterator = inventoryMap.keySet().iterator();
	
	var siteID = require('dw/system/Site').current.ID;
	var dirName = File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + 'inventory' + File.SEPARATOR + siteID;
    (new File(dirName)).mkdirs();
    
    var inventoryFile : File = new File(dirName + File.SEPARATOR + 'inventory_store_' + storeId + ".xml");
    inventoryFile.createNewFile();
	
	
	var fileWriter : FileWriter = new FileWriter(inventoryFile, "UTF-8");
	var xsw : XMLStreamWriter = new XMLStreamWriter(fileWriter);
	
	xsw.writeStartDocument();
	xsw.writeStartElement("inventory");
	xsw.writeAttribute("xmlns","http://www.demandware.com/xml/impex/inventory/2007-05-31");
		xsw.writeStartElement("inventory-list");
			xsw.writeStartElement("header");
			xsw.writeAttribute("list-id", 'inventory_store_' + storeId);
				xsw.writeStartElement("default-instock");
					xsw.writeCharacters("false");
				xsw.writeEndElement();
			xsw.writeEndElement();
			
			xsw.writeStartElement("records");
				while(invMapIterator.hasNext())
				{
					var key : String = invMapIterator.next();
					xsw.writeStartElement("record");
					xsw.writeAttribute("product-id", key);
						xsw.writeStartElement("allocation");
						xsw.writeCharacters(inventoryMap.get(key));
						xsw.writeEndElement();
					xsw.writeEndElement();
				}
			xsw.writeEndElement();
		xsw.writeEndElement();
	xsw.writeEndElement();
	xsw.writeEndDocument();
	
	xsw.close();
	fileWriter.close();
}


exports.importInventory = function(parameters)
{
	var siteID = require('dw/system/Site').current.ID;
	var storeId = parameters.StoreId; 
	var fileToImport : String = '/inventory' + File.SEPARATOR + siteID + File.SEPARATOR + 'inventory_store_' + storeId + ".xml";
	
	var pdict = Pipeline.execute('ImportInventory-Import',{
		ImportFile : fileToImport,
		ImportMode : "REPLACE"
	});
	if(pdict.Status.status != 0)
	{
		return new Status(Status.ERROR);
	}
}