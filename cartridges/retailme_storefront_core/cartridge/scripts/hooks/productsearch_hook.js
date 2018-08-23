var Status = require('dw/system/Status');
var Iterator = require('dw/util/Iterator');


exports.modifyGETResponse = function(doc) {
	if(doc.count > 0)
	{
		var productHitsIter : Iterator = doc.hits.iterator();
		var Product = require('dw/catalog/Product');
		while(productHitsIter.hasNext())
		{
			var productHit = productHitsIter.next();
			var product : Product = require('dw/catalog/ProductMgr').getProduct(productHit.product_id);
			productHit.c_variantID = product.getVariationModel().getDefaultVariant().getID();
		}
	}
    return new Status(Status.OK);  
};  