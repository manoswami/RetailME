var Status = require('dw/system/Status');
var ProductMgr = require('dw/catalog/ProductMgr');
var Product = require('dw/catalog/Product');
var Iterator = require('dw/util/Iterator');
var Recommendation = require('dw/catalog/Recommendation');

exports.modifyPOSTResponse = function(customer,productList, customerProductListItemResponse, customerProductListItemRequest) {
	var productID = customerProductListItemRequest.productId;
	var product : Product = ProductMgr.getProduct(productID);
	var recommendations : Iterator = product.getRecommendations().iterator();
	while (recommendations.hasNext())
	{
		var recommendation : Recommendation = recommendations.next();
		var recommendedProduct : Product = recommendation.getRecommendedItem();
		
		if (recommendedProduct == null)
		{
			continue;
		}
		
		var recommendedProductID : String = recommendedProduct.getID();
		customerProductListItemResponse.c_recommendedProductId = recommendedProductID;
		break;
	}	
    return new Status(Status.OK);  
};  