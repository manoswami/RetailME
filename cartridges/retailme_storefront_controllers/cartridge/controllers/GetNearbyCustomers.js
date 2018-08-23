var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var Logger = require('dw/system/Logger');
var SeekableIterator = require('dw/util/SeekableIterator');
var ArrayList = require('dw/util/ArrayList');
var Iterator = require('dw/util/Iterator');
var Collection = require('dw/util/Collection');
var HashMap = require('dw/util/HashMap');

function start()
{
	try
	{
		var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
		var reqBodyJson = JSON.parse(reqBodyStr);
		var zoneId : String = reqBodyJson.zoneId;
		var storeid : String = "S01";
		var nearbyCustomersArray = [];
		var customersIterator : SeekableIterator = CustomerMgr.searchProfiles('custom.ZoneID = {0}', 'lastModified asc', zoneId);
		var customerWishList : Collection = null;
		while(customersIterator.hasNext())
		{
			var nearbyCustomersJSON = {};
			var nearbyCustomer : Customer = customersIterator.next();
			nearbyCustomersJSON.FirstName = nearbyCustomer.firstName;
			nearbyCustomersJSON.LastName = nearbyCustomer.lastName;
			nearbyCustomersJSON.PreferredCategory = nearbyCustomer.custom.preferredCategory;
			nearbyCustomersJSON.AssistancePreference = nearbyCustomer.custom.assistancePreference;
			nearbyCustomersJSON.ColorPreference = nearbyCustomer.custom.colorPreference;
			nearbyCustomersJSON.MaterialPreference = nearbyCustomer.custom.materialPreference;
			nearbyCustomersJSON.MembershipType = nearbyCustomer.custom.membershipType.value;
			nearbyCustomersJSON.Size = nearbyCustomer.custom.size;
			customerWishList = ProductListMgr.getProductLists(nearbyCustomer.customer , dw.customer.ProductList.TYPE_WISH_LIST);			
			if(!empty(customerWishList))
			{
				var customerWishlistArray = [];
				var customerWishlistJSON = {};
				var wishlistProductIterator : Iterator = customerWishList.iterator();
				while(wishlistProductIterator.hasNext()){
					var wishlistProductItems : Collection = wishlistProductIterator.next();
					var wishlistProductItemsIterator : Iterator = wishlistProductItems.getProductItems().iterator();
					while(wishlistProductItemsIterator.hasNext()){
						var wishlistProduct = wishlistProductItemsIterator.next();
						customerWishlistJSON.ProductName = wishlistProduct.product.name;
						customerWishlistJSON.Color = wishlistProduct.product.custom.color;
						customerWishlistJSON.Image = wishlistProduct.product.getImage('swatch').getHttpsURL().toString();
//						var inventoryStatus = wishlistProduct.product.availabilityModel.availabilityStatus;
//						if(inventoryStatus == 'IN_STOCK')
//							customerWishlistJSON.Status = 'Available';
//						else if(inventoryStatus == 'NOT_AVAILABLE')
//							customerWishlistJSON.Status = 'Not_Available';
//						else
//							customerWishlistJSON.Status = inventoryStatus;	
						var inventoryRecord = require('dw/catalog/ProductInventoryMgr').getInventoryList("inventory_store_"+storeid).getRecord(wishlistProduct.product);
						var prodInventory = 0;
						if(!empty(inventoryRecord))
						{
							prodInventory = inventoryRecord.getATS().getValue();
						}
						if(prodInventory > 0)
							customerWishlistJSON.Status = 'Available';
						else
							customerWishlistJSON.Status = 'Not Available';
					}				
				}
				if(customerWishlistJSON.Status != null){
					customerWishlistArray.push(customerWishlistJSON);				
					nearbyCustomersJSON.Wishlist = customerWishlistArray;
				}
			}	
			
			nearbyCustomersArray.push(nearbyCustomersJSON);
		}
		app.getView({dataJSON : JSON.stringify(nearbyCustomersArray)}).render('util/successDataJson');
		
	}
	catch(e)
	{
		Logger.error("Error occured in GetNearbyCustomers.js - start : "+ e);	
		app.getView().render('util/errorjson');
	}
}

exports.Start = guard.ensure(['post'], start);
