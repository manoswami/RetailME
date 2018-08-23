var Status = require('dw/system/Status');
var Basket = require('dw/order/Basket');
var Collection = require('dw/util/Collection');
var Iterator = require('dw/util/Iterator');
var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var ProductListItem = require('dw/customer/ProductListItem');
var ProductMgr = require('dw/catalog/ProductMgr');
var Product = require('dw/catalog/Product');
var Logger = require('dw/system/Logger');

exports.afterPost  = function(basket : Basket) {
	var systemRequest : dw.system.Request = request;
	if(!empty(systemRequest.session.customer.profile))
	{
		var customerNo = systemRequest.session.customer.profile.customerNo;	
		var customer : Customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
		var customerWishListColl : Collection = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
		
		var productliIterator : Iterator = basket.getAllProductLineItems().iterator();
		while(productliIterator.hasNext())
		{
			var productli = productliIterator.next();
			var productID = productli.productID;
			if(!empty(customerWishListColl))
			{
				var wishlistIterator : Iterator = customerWishListColl.iterator();
				while(wishlistIterator.hasNext()){
					var wishlist : Collection = wishlistIterator.next();
					var wishlistProductItemsIterator : Iterator = wishlist.getProductItems().iterator();
					while(wishlistProductItemsIterator.hasNext()){
						var wishlistProduct : ProductListItem = wishlistProductItemsIterator.next();
						var wishlistProductID = wishlistProduct.productID;
						if(wishlistProductID.equals(productID)){
							wishlist.removeItem(wishlistProduct);
						}
					}				
				}
			}
		}
	}
	dw.system.HookMgr.callHook( "dw.ocapi.shop.basket.calculate", "calculate", basket );
	return new Status(Status.OK);  
}; 

exports.modifyPOSTResponse = function(basket : Basket,basketResponse) {
	var productliIterator : Iterator = basketResponse.product_items.iterator();
	while(productliIterator.hasNext())
	{
		var productli = productliIterator.next();
		var productID = productli.product_id;
		var product : Product = ProductMgr.getProduct(productID);
		productli.c_imageURL = product.getImage('large').getAbsURL().toString();
		productli.c_color = product.custom.color;
		productli.c_size = product.custom.size;
	}
	return new Status(Status.OK); 
};

exports.modifyGETResponse  = function(basket : Basket,basketResponse) {
	var productliIterator : Iterator = basketResponse.product_items.iterator();
	while(productliIterator.hasNext())
	{
		var productli = productliIterator.next();
		var productID = productli.product_id;
		var product : Product = ProductMgr.getProduct(productID);
		productli.c_imageURL = product.getImage('large').getAbsURL().toString();
		productli.c_color = product.custom.color;
		productli.c_size = product.custom.size;
	}
	return new Status(Status.OK); 
};

exports.afterPOST = function(basket, items) {
	try{
		if(!empty(session.customer.profile)){
			var customer : Customer = session.customer;
			var customerWishLists : Collection = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
			if(!empty(customerWishLists)){
				items.forEach(function(item) {
					var productId : String = item.productId;
					if(!empty(productId))
					{
						removeProductFromWishlists(customerWishLists,productId);
					}
				})
			}
		}
	}
	catch(e)
	{
		Logger.error("Error occured in hook afterPOST addtobasket_hook.js : {0}", e);
	}
	dw.system.HookMgr.callHook( "dw.ocapi.shop.basket.calculate", "calculate", basket );
}; 

function removeProductFromWishlists(customerWishLists : Collection,productId : String)
{
	var wishlistIterator : Iterator = customerWishLists.iterator();
	const ProductList = require('dw/customer/ProductList');
	while(wishlistIterator.hasNext()){
		var wishlist : ProductList = wishlistIterator.next();
		var wishlistProductItemsIterator : Iterator = wishlist.getProductItems().iterator();
		while(wishlistProductItemsIterator.hasNext()){
			var wishlistProduct : ProductListItem = wishlistProductItemsIterator.next();
			if(wishlistProduct.productID.equals(productId)){
				wishlist.removeItem(wishlistProduct);
			}
		}				
	}
}

