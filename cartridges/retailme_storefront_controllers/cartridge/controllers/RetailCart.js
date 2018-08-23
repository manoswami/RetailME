
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Customer = require('dw/customer/Customer');
var CustomerAddress = require('dw/customer/CustomerAddress');
var BasketMgr = require('dw/order/BasketMgr');
var Basket = require('dw/order/Basket');
var Transaction = require('dw/system/Transaction');
var HttpService = require('dw/svc/HTTPService');
var Result = require('dw/svc/Result');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Shipment = require('dw/order/Shipment');
var ShippingMgr = require('dw/order/ShippingMgr');
var ProductLineItem = require('dw/order/ProductLineItem');
var Logger = require('dw/system/Logger');
var StringUtils = require('dw/util/StringUtils');
var OrderAddress = require('dw/order/OrderAddress');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var CustomerPaymentInstrument = require('dw/customer/CustomerPaymentInstrument');
var UUIDUtils = require('dw/util/UUIDUtils');
var Collection = require('dw/util/Collection');

function addProductsInCheckoutZoneToCart()
{
	try{
	Transaction.begin();
	var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
	var reqBodyJson = JSON.parse(reqBodyStr);
	var basicAuthEncodedStr : String = request.httpHeaders.get("authorization").split(" ")[1];
	var basicAuthDecodedStr : String = StringUtils.decodeBase64(basicAuthEncodedStr);
	var userCredsArr = basicAuthDecodedStr.split(":");
	var userName : String = userCredsArr[0];
	var password : String = userCredsArr[1];
	var zoneid : String = reqBodyJson.ZoneID;
	var customer : Customer = CustomerMgr.loginCustomer(userName, password, false);
	var basket : Basket = BasketMgr.getCurrentOrNewBasket();
	var shipment : Shipment = basket.getDefaultShipment();
	
	addCheckoutZoneProducts(basket,shipment,zoneid);
	populateBasketFromCustomerAccount(basket,shipment,customer);
	dw.system.HookMgr.callHook( "dw.ocapi.shop.basket.afterPost", "afterPost", basket );
	Transaction.commit();
	app.getView({basket_id : basket.getUUID()}).render('util/successjson');
	}
	catch(e)
	{
		Logger.error("Error occured in RetailCart.js : "+ e);
		Transaction.rollback();
		app.getView({ErrorCode : e}).render('util/errorjson');
	}
}

function populateBasketFromCustomerAccount(basket : Basket,shipment : Shipment, customer : Customer)
{
	var customerAddress : CustomerAddress = customer.getProfile().getAddressBook().getAddress("Home");
	basket.setCustomerEmail(customer.getProfile().getEmail());
	populateBillingAddress(basket,customerAddress);
	populateShipment(shipment,customerAddress);
	dw.system.HookMgr.callHook( "dw.ocapi.shop.basket.calculate", "calculate", basket );
	populatePayment(basket,customer);
}

function addCheckoutZoneProducts(basket : Basket,shipment : Shipment,zoneid : String)
{
	var service : HttpService = ServiceRegistry.get("tw.rest.zonedata");
	service.URL +=	"/Things/ProductThing/Services/GetProductLocation";
	service.addParam("zone_Id", zoneid);
	service.addHeader("Accept", "application/json");
	service.addHeader("Content-Type", "application/json");
	service.addHeader("appKey", "e6159a5e-34c0-45fa-9a5a-a8f7f366b6df");
	var result : Result = service.call();
	var resultObj = result.object;
	resultObj.data.forEach(function(record) {
		var productID : String = record.variant_Id;
		var quantity : Number = parseInt(record.quantity);
		var pliColl : Collection = basket.getProductLineItems(productID);
		if(!empty(pliColl))
		{
			var pli : ProductLineItem = pliColl.iterator().next();
		}
		else
		{
			var pli : ProductLineItem = basket.createProductLineItem(productID, shipment);
		}
		pli.setQuantityValue(quantity);
		pli.setProductInventoryListID("inventory_store_S01");
	});
}

function populateBillingAddress(basket : Basket,customerAddress : CustomerAddress)
{
	var billingAddress : OrderAddress = basket.createBillingAddress();
	
	billingAddress.setFirstName(customerAddress.getFirstName());
	billingAddress.setLastName(customerAddress.getLastName());
	billingAddress.setAddress1(customerAddress.getAddress1());
	billingAddress.setAddress2(customerAddress.getAddress2());
	billingAddress.setCity(customerAddress.getCity());
	billingAddress.setPostalCode(customerAddress.getPostalCode());
	billingAddress.setStateCode(customerAddress.getStateCode());
	billingAddress.setCountryCode(customerAddress.getCountryCode());
	billingAddress.setPhone(customerAddress.getPhone());
}

function populateShipment(shipment : Shipment,customerAddress : CustomerAddress)
{
	var shippingAddress : OrderAddress = shipment.createShippingAddress();
	
	shippingAddress.setFirstName(customerAddress.getFirstName());
	shippingAddress.setLastName(customerAddress.getLastName());
	shippingAddress.setAddress1(customerAddress.getAddress1());
	shippingAddress.setAddress2(customerAddress.getAddress2());
	shippingAddress.setCity(customerAddress.getCity());
	shippingAddress.setPostalCode(customerAddress.getPostalCode());
	shippingAddress.setStateCode(customerAddress.getStateCode());
	shippingAddress.setCountryCode(customerAddress.getCountryCode());
	shippingAddress.setPhone(customerAddress.getPhone());
	
	shipment.setShippingMethod(ShippingMgr.getDefaultShippingMethod());
}

function populatePayment(basket : Basket, customer : Customer)
{
	var paymentInstr : PaymentInstrument = basket.createPaymentInstrument(dw.order.PaymentInstrument.METHOD_CREDIT_CARD,basket.getTotalGrossPrice());
	var customerPaymentInstr : CustomerPaymentInstrument = customer.getProfile().getWallet().getPaymentInstruments(dw.order.PaymentInstrument.METHOD_CREDIT_CARD)[0];
	
	paymentInstr.setCreditCardHolder(customerPaymentInstr.getCreditCardHolder());
	paymentInstr.setCreditCardNumber(customerPaymentInstr.getCreditCardNumber());
	paymentInstr.setCreditCardType(customerPaymentInstr.getCreditCardType());
	paymentInstr.setCreditCardExpirationMonth(customerPaymentInstr.getCreditCardExpirationMonth());
	paymentInstr.setCreditCardExpirationYear(customerPaymentInstr.getCreditCardExpirationYear());
	paymentInstr.getPaymentTransaction().setTransactionID(UUIDUtils.createUUID());
	paymentInstr.getPaymentTransaction().setPaymentProcessor(PaymentMgr.getPaymentMethod(dw.order.PaymentInstrument.METHOD_CREDIT_CARD).getPaymentProcessor());
}


function notifyTW()
{
	try{
	var reqBodyStr : String = request.httpParameterMap.getRequestBodyAsString();
	var reqBodyJson = JSON.parse(reqBodyStr);
	var storeId : String = reqBodyJson.store_Id;
	
	var service : HttpService = ServiceRegistry.get("tw.rest.zonedata");
	service.URL +=	"/Things/ProductThing/Services/ClearProductsAtCheckout";
	service.addParam("store_Id", storeId);
	service.addHeader("Accept", "application/json");
	service.addHeader("Content-Type", "application/json");
	service.addHeader("appKey", "e6159a5e-34c0-45fa-9a5a-a8f7f366b6df");
	var result : Result = service.call();
	var status : String = result.status;
	if(status === "OK")
	{
		app.getView().render('util/successjson');
	}
	else
	{
		app.getView().render('util/errorjson');
	}
	}
	catch(e)
	{
		Logger.error("Error occured in RetailCart.js : "+ e);
	}
}


exports.AddtoCart = guard.ensure(['post'], addProductsInCheckoutZoneToCart);
exports.NotifyTW = guard.ensure(['post'], notifyTW);
