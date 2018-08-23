var Status = require('dw/system/Status');
var Collection = require('dw/util/Collection');
var Iterator = require('dw/util/Iterator');
var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');

exports.modifyGETResponse = function(scriptProduct, doc) {
	var systemRequest : dw.system.Request =  request;
	if(!empty(systemRequest.session.customer.profile)){
		var customerNo = systemRequest.session.customer.profile.customerNo;	
		var customer : Customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
		var customerWishList : Collection = ProductListMgr.getProductLists(customer, dw.customer.ProductList.TYPE_WISH_LIST);
		if(!empty(customerWishList))
		{
			var wishlistProductIterator : Iterator = customerWishList.iterator();
			var productInCustomerWishlist = false;
			while(wishlistProductIterator.hasNext()){
				var wishlistProductItems : Collection = wishlistProductIterator.next();
				var wishlistProductItemsIterator : Iterator = wishlistProductItems.getProductItems().iterator();
				while(wishlistProductItemsIterator.hasNext()){
					var wishlistProductID = wishlistProductItemsIterator.next().productID;
					if(wishlistProductID.equals(scriptProduct.ID)){
						productInCustomerWishlist = true;
						break;
					}
				}				
			}
			doc.c_ItemAddedToWishlist = productInCustomerWishlist; 
		}	
	}
    return new Status(Status.OK);  
};  