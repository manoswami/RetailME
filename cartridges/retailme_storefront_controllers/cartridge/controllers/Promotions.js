var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var log = require('dw/system/Logger');


function getOfferForTheCustomer()
{
	try
	{
		var Promotion = require('dw/campaign/Promotion');
		var retailMePromotion : Promotion = require('dw/campaign/PromotionMgr').getPromotion("RetailME");
		if(!empty(retailMePromotion))
		var calloutMsg : String = retailMePromotion.getCalloutMsg().getMarkup();
		var respJson = {'calloutMsg' : calloutMsg};
		app.getView({dataJSON : JSON.stringify(respJson)}).render('util/successDataJson');
	}
	catch(e)
	{
		log.error("Error occured in getOfferForTheCustomer Promotions.js : {0}", e);
		app.getView({msg : e}).render('util/errorjson');
	}
}


exports.GetOfferForTheCustomer = guard.ensure(['get'],getOfferForTheCustomer);