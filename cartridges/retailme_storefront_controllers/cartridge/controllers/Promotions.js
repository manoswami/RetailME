var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var log = require('dw/system/Logger');
const Transaction = require('dw/system/Transaction');
const Promotion = require('dw/campaign/Promotion');

function getOfferForTheCustomer()
{
	try
	{
		var respJson = getActiveOffer();
		app.getView({dataJSON : JSON.stringify(respJson)}).render('util/successDataJson');
	}
	catch(e)
	{
		log.error("Error occured in getOfferForTheCustomer Promotions.js : {0}", e);
		app.getView({msg : e}).render('util/errorjson');
	}
}

function getActiveOffer()
{
	var offerJson = {"success": false};
	var activeProductPromotions : Collection = require('dw/campaign/PromotionMgr').getActivePromotions().getProductPromotions();
	if(empty(activeProductPromotions))
	{
		return offerJson;
	}
	var productPromotionsIterator : Iterator = activeProductPromotions.iterator();
	while(productPromotionsIterator.hasNext())
	{
		var productPromotion : Promotion = productPromotionsIterator.next();
		if(!empty(productPromotion) && !empty(productPromotion.custom.ProductId) && productIsInStock(productPromotion.custom.ProductId) && productPromotion.isBasedOnCoupons())
		{
			var offerJson = {"success": false};
			var promoCouponsColl : Collection = productPromotion.getCoupons();
			if(!empty(promoCouponsColl))
			{
				var couponCode : String = promoCouponsColl.toArray().pop().ID;
				if(!empty(couponCode))
				{	
					offerJson.calloutMsg = productPromotion.getCalloutMsg().getMarkup();
					offerJson.couponCode = couponCode;
					offerJson.productId = productPromotion.custom.ProductId;
					offerJson.success = true;
					break;
				}
			}
		}
	}
	return offerJson;
}

function productIsInStock(productId : String) : Boolean
{
	var inventoryRecord = require('dw/catalog/ProductInventoryMgr').getInventoryList("inventory_store_S01").getRecord(productId);
	var prodInv = 0;
	if(!empty(inventoryRecord))
	{
		prodInv = inventoryRecord.getATS().getValue();
	}
	return prodInv>0;
}

exports.GetOfferForTheCustomer = guard.ensure(['get'],getOfferForTheCustomer);