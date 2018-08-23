'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller used for checkout related operations
 * 
 * @module controllers/EACheckout
 */

/* API Includes */
var ISML = require('dw/template/ISML');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var BasketMgr = require('dw/order/BasketMgr');
var Pipelet = require('dw/system/Pipelet');
var URLUtils = require('dw/web/URLUtils');
var storefrontCartridgePath = require('int_ocapi_ext_core/cartridge/scripts/actions/GetCoreCartridgePath').getCoreCartridgePath();
/* Script Modules */
var app = require('app_storefront_controllers/cartridge/scripts/app');
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var EAExtractPaymentMethod = require('int_ocapi_ext_core/cartridge/scripts/api/EAExtractPaymentMethod');
var EAPaymentFulfilled = require('int_ocapi_ext_core/cartridge/scripts/api/EAPaymentFulfilled');
var GetOrderFromToken = require('int_ocapi_ext_core/cartridge/scripts/actions/GetOrderFromToken');
var UpdateShipmentShippingMethod = require(storefrontCartridgePath + '/cartridge/scripts/checkout/UpdateShipmentShippingMethod');
var PreCalculateShipping = require(storefrontCartridgePath + '/cartridge/scripts/checkout/PreCalculateShipping');
var GetApplicableShippingMethods = require(storefrontCartridgePath + '/cartridge/scripts/checkout/GetApplicableShippingMethods');
var ValidateCartForCheckout = require(storefrontCartridgePath + '/cartridge/scripts/cart/ValidateCartForCheckout');
var SetChannelType = require('int_ocapi_ext_core/cartridge/scripts/actions/SetChannelType');
var AddNoteToFailedOrder = require('int_ocapi_ext_core/cartridge/scripts/actions/AddNoteToFailedOrder');
var SetOrderStatus = require(storefrontCartridgePath + '/cartridge/scripts/checkout/SetOrderStatus');
var SetPaymentStatus = require('int_ocapi_ext_core/cartridge/scripts/actions/SetPaymentStatus');
var GetCustomerCreditCard = require(storefrontCartridgePath + '/cartridge/scripts/checkout/GetCustomerCreditCard');
var MapTokenToOrder = require('int_ocapi_ext_core/cartridge/scripts/actions/MapTokenToOrder');
var RemoveAllPaymentInstruments = require('int_ocapi_ext_core/cartridge/scripts/actions/RemoveAllPaymentInstruments');
var HandleDeclinedCard = require('int_ocapi_ext_core/cartridge/scripts/actions/HandleDeclinedCard');
var GetFormattedAmount = require('int_ocapi_ext_core/cartridge/scripts/actions/GetFormattedAmount');
/* Controller Includes */
var EAUtils = require('~/cartridge/controllers/EAUtils');
var Cart = require('app_storefront_controllers/cartridge/scripts/models/CartModel');
var EAGiftCard = require('~/cartridge/controllers/EAGiftCard');
var COBilling = require('app_storefront_controllers/cartridge/controllers/COBilling');
var COPlaceOrder = require('app_storefront_controllers/cartridge/controllers/COPlaceOrder');

/**
 * ValidateCart - Checks if the cart is validated to proceed for checkout
 * 
 * @param basket
 */
function ValidateCart(basket) {
    var args = {
        Basket : basket,
        ValidateTax : false
    };
    ValidateCartForCheckout.execute(args);
    return args;
}

/**
 * AbandonOrder - 'fails' the order
 * 
 */
function AbandonOrder() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    var resultOrder = OrderMgr.getOrder(requestObject.order_no);
    if (!resultOrder) {
        ISML.renderTemplate('responses/eaordernotfoundjson');
        return;
    }
    if (resultOrder.getStatus() == dw.order.Order.ORDER_STATUS_CREATED) {
        Transaction.wrap(function() {
            var status = OrderMgr.failOrder(resultOrder);
            if (status == "ERROR") {
                ISML.renderTemplate('responses/eaordernotfoundjson');
                return;
            }
            AddNoteToFailedOrder.execute({
                Order : resultOrder
            });
        });
        var JSONResponse = {
            httpStatus : '200'
        };
        ISML.renderTemplate('responses/eajson', {
            JSONResponse : JSONResponse
        });
    }
}

/**
 * AuthorizeCreditCard - called from AuthorizePayment - does the same thing for the two different payment methods but redirects based on payment type
 */
function AuthorizeCreditCard() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        var eaCreditCardPaymentProcessor = dw.system.Site.current.preferences.custom.eaCreditCardPaymentProcessor;
        var result = require('~/cartridge/controllers/' + eaCreditCardPaymentProcessor).Handle2(requestObject, order);
        var PaymentMethod = EAExtractPaymentMethod.extractPaymentMethod(result.PaymentInstrument.paymentMethod);
        var AuthorizationPipelineMethod = dw.order.PaymentMgr.getPaymentMethod(PaymentMethod.PaymentMethod);
        var AuthorizationPipeline = AuthorizationPipelineMethod.paymentProcessor.ID;
        var result = require('~/cartridge/controllers/' + AuthorizationPipeline).Authorize(order, result.PaymentInstrument);
        if (result == "authorized") {
            PostAuthProcess(order, requestObject);
        } else if (result == "declined") {
            var args = {
                AuthorizationReasonCode : "",
                Decision : "",
                Order : order
            };
            Transaction.wrap(function() {
                HandleDeclinedCard.execute(args);
            });
            ISML.renderTemplate('responses/eajson', {
                JSONResponse : args.JSONResponse
            });
        } else if (result == "error") {
            ISML.renderTemplate('responses/eainvalidcreditcardjson');
        }
    }
}

/**
 * PostAuthProcess - Set the order and payment status once the order has been fulfilled.
 * 
 * @param order
 * @param requestObject2
 */
function PostAuthProcess(order, requestObject) {
    // if you have an OC(Order Center) integration uncomment the line below
    // order.custom.bfType="InStore";
    var placeOrder;
    var result = EAPaymentFulfilled.paymentFulfilled(order);
    if (result) {
        if (result.OrderTotalAuthorized == true) {
            if (EAUtils.isStorefrontControllers()) {
                Transaction.wrap(function() {
                    placeOrder = OrderMgr.placeOrder(order);
                })
                if (placeOrder.error != true) {
                    Transaction.wrap(function() {
                        order.custom.eaEmployeeId = session.custom.agent.employeeId;
                        order.custom.eaStoreId = session.custom.agent.storeId;
                        order.custom.eaCountry = session.custom.country;
                        var args = {
                            Order : order
                        }
                        SetOrderStatus.execute(args);
                    });
                }
            } else {
                placeOrder = Pipeline.execute('COPlaceOrder-PlaceOrder', {
                    Order : order
                });
                if (placeOrder.EndNodeName != "error") {
                    Transaction.wrap(function() {
                        order.custom.eaEmployeeId = session.custom.agent.employeeId;
                        order.custom.eaStoreId = session.custom.agent.storeId;
                        order.custom.eaCountry = session.custom.country;
                        var args = {
                            Order : order
                        }
                        SetOrderStatus.execute(args);
                    });
                }

            }
        }
    }
    if (requestObject && requestObject.transaction_id) {
        Transaction.wrap(function() {
            SetPaymentStatus.execute({
                Order : order
            });
        });
    }
    EAUtils.UpdateProductMessages(order);

}

/**
 * GetOrder - Retrieves the order based on the order number
 * 
 * @param orderNo
 * @returns order
 */
function GetOrder(orderNo) {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var order = OrderMgr.getOrder(orderNo);
    if (order && order.confirmationStatus.value == dw.order.Order.CONFIRMATION_STATUS_NOTCONFIRMED) {
        return order;
    } else {
        ISML.renderTemplate('responses/eaordernotfoundjson');
    }
}

/**
 * ApplyCreditCard - queries the payment method from the site preferences and redirects to correct pipeline to apply a credit card as a payment method
 * 
 */
function ApplyCreditCard() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        var eaCreditCardPaymentProcessor = dw.system.Site.current.preferences.custom.eaCreditCardPaymentProcessor;
        require('~/cartridge/controllers/' + eaCreditCardPaymentProcessor).Handle(requestObject, order);
        EAUtils.UpdateProductMessages(order);
    }

}

/**
 * AuthorizePayment - the entry point for authorizing all payments - decisions are made based on the types of payment methods and payment types and other pipelines are called.
 * 
 */
function AuthorizePayment() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        if (EAUtils.isStorefrontControllers()) {
            var COPlaceOrder = require('app_storefront_controllers/cartridge/controllers/COPlaceOrder');
            COPlaceOrder.handlePayments(order);
        } else {
            Pipeline.execute('COPlaceOrder-HandlePayments');
        }
        var orderResult = SubmitOrder(order);
        if (!orderResult.placeOrderError) {
            EAUtils.UpdateProductMessages(order);
        }
    }
}
/**
 * SubmitOrder - Places the order and set the status of the Order
 * 
 * @param order
 * @returns result(error in case of failure while placing the order otherwise nothing)
 */
function SubmitOrder(order) {
    var placeOrderError;
    var pipelineResult;
    if (EAUtils.isStorefrontControllers()) {
        pipelineResult = OrderMgr.placeOrder(order);
        if (!pipelineResult) {
            placeOrderError = new dw.system.Status(dw.system.Status.ERROR, "confirm.error.technical");
            var result = {
                placeOrderError : placeOrderError
            };
            return result;
        }
    } else {
        pipelineResult = Pipeline.execute('COPlaceOrder-PlaceOrder', {
            Order : order
        });
        if (pipelineResult.EndNodeName == "error") {
            placeOrderError = new dw.system.Status(dw.system.Status.ERROR, "confirm.error.technical");
            var result = {
                placeOrderError : placeOrderError
            };
            return result;
        }
    }
    Transaction.wrap(function() {
        SetOrderStatus.execute({
            Order : order
        });
    })
    return {};

}

/**
 * ApplyGiftCard - retrieves the Order and redirects to Handle function to apply a gift card as a payment method
 * 
 */
function ApplyGiftCard() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        var result = EAGiftCard.Handle(requestObject, order);
        EAUtils.UpdateProductMessages(order);
    }
}

/**
 * GiftCardBalance - retrieves the balance of a gift card and sends back to client
 * 
 * @returns GiftCertificate
 */
function GiftCardBalance() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    var GiftCertificate = EAGiftCard.CheckBalance(requestObject);
    if (GiftCertificate) {
        ISML.renderTemplate('responses/eagiftcardbalancejson', {
            GiftCertificate : GiftCertificate
        });
    }

}

/**
 * RemoveCreditCard - queries the payment method from the site preferences and redirects to correct pipeline to remove a credit card from the basket
 */
function RemoveCreditCard() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        var HandlePipeline = dw.system.Site.current.preferences.custom.eaCreditCardPaymentProcessor;
        require('~/cartridge/controllers/' + HandlePipeline).Remove(requestObject, order);
        EAUtils.UpdateProductMessages(order);
    }
}

/**
 * AuthorizeGiftCard - called from AuthorizePayment - does the same thing for the two different payment methods but redirects based on payment type
 */
function AuthorizeGiftCard() {
    var PaymentInstrument;
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        var result = EAGiftCard.Handle(requestObject, order);
        if (result) {
            PaymentInstrument = result.PaymentInstrument;
        }
        if (PaymentInstrument.UUID) {
            /*******************************************************************************************************************************************************************************************
             * Uncomment the below paragraph if using BASIC_GIFT_CERTIFICATE or any payment method in the sitegenesis cartridge and pipelines. var AuthorizationPipelineMethod =
             * dw.order.PaymentMgr.getPaymentMethod(PaymentInstrument.paymentMethod); var AuthorizationPipeline = AuthorizationPipelineMethod.paymentProcessor.ID + '-Authorize'; var result =
             * Pipeline.execute(AuthorizationPipeline,{OrderNo:order.orderNo,PaymentInstrument:PaymentInstrument});
             ******************************************************************************************************************************************************************************************/
            var result = EAGiftCard.Authorize(order.orderNo, PaymentInstrument);
            /**
             * Uncomment the below paragraph if using BASIC_GIFT_CERTIFICATE or any payment method in the sitegenesis cartridge and controllers. // var result; // Transaction.wrap(function(){ // var
             * args={OrderNo:order.orderNo,PaymentInstrument:PaymentInstrument}; // result =
             * require('app_storefront_controllers/cartridge/scripts/payment/processor/'+AuthorizationPipelineMethod.paymentProcessor.ID).Authorize(args); // }); // if(!result){ //
             * ISML.renderTemplate('responses/eainvalidgiftcardjson'); // return; // }
             */
            PostAuthProcess(order, requestObject);
        }
    }
}

/**
 * RemoveGiftCard - retrieve the Order and redirects to Remove function to remove a gift card from the basket
 */
function RemoveGiftCard() {
    var requestObject = EAUtils.ExtractRequestObject();
    var order = GetOrder(requestObject.order_no);
    if (order) {
        EAGiftCard.Remove(requestObject, order);
        EAUtils.UpdateProductMessages(order);
    }
}

/**
 * Functions used for Pay through Web.
 */

/**
 * StoreWebOrder - maps the token to the order number
 * 
 */
function StoreWebOrder() {
    var requestObject = EAUtils.ExtractRequestObject();
    Transaction.wrap(function() {
        MapTokenToOrder.execute({
            orderNo : requestObject.order_no,
            token : requestObject.token
        });
    });
    var JSONResponse = {
        httpStatus : '200'
    };
    ISML.renderTemplate('responses/eajson', {
        JSONResponse : JSONResponse
    });
}

/**
 * StartWebPayment - returns the web payment form to be rendered
 */
function StartWebPayment() {
    var webpaymentform = app.getForm('WebPayment');
    var COBilling = require('app_storefront_controllers/cartridge/controllers/COBilling');
    var orderResult = Transaction.wrap(function() {
        return GetOrderFromToken.getOrderFromToken(request.httpParameterMap.token.value);
    });
    if (!orderResult.orderNo) {
        ISML.renderTemplate('webpayment/redirectToApp', {
            Location : CurrentHttpParameterMap.appUrl.value + "://"
        });
        return;
    }
    var order = OrderMgr.getOrder(orderResult.orderNo);
    var currentHttpParameterMap = request.httpParameterMap;
    var orderToken = currentHttpParameterMap.token.value;
    var appTimeout = currentHttpParameterMap.timeout.value;
    var appUrl = currentHttpParameterMap.appUrl.value;
    var appCurrency = currentHttpParameterMap.sessionCurrency.value;
    var currencyFormat = currentHttpParameterMap.currencyFormat.value;
    var currencyLocale = currentHttpParameterMap.currencyLocale.value;
    var thousands = currentHttpParameterMap.thousands.value;
    var decimal = currentHttpParameterMap.decimal.value;
    var country = currentHttpParameterMap.country.value;
    new Pipelet('SetSessionCurrency').execute({
        CurrencyCode : appCurrency
    });
    InitPaymentForms(order);
    if (EAUtils.isStorefrontControllers()) {
        var cart = Cart.get(order);
        COBilling.initCreditCardList(cart);
    } else {
        Pipeline.execute('COBilling-InitCreditCardList', {
            Basket : order,
            CurrentForms : session.forms,
            CurrentLocale : request.locale
        });
    }

    var orderTotal = GetFormattedAmount.getFormattedAmount(currencyFormat, currencyLocale, thousands, decimal, session.forms.WebPayment.orderTotal.value);
    var balanceDue = GetFormattedAmount.getFormattedAmount(currencyFormat, currencyLocale, thousands, decimal, session.forms.WebPayment.balanceDue.value);
    app.getView({
        OrderToken : orderToken,
        AppURL : appUrl,
        AppTimeout : appTimeout,
        orderTotal : orderTotal,
        balanceDue : balanceDue,
        country : country,
        ContinueURL : URLUtils.https('EACheckout-StartWebPaymentSubmitForm', 'OrderToken', orderToken, 'AppURL', appUrl, 'AppTimeout', appTimeout, 'orderTotal', orderTotal, 'balanceDue', balanceDue, 'country', country)
    }).render('webpayment/webpayment');

}

/**
 * StartWebPaymentSubmitForm - handles the event after you submit the web payment form
 */
function StartWebPaymentSubmitForm() {
    var webpaymentform = app.getForm('WebPayment');
    webpaymentform.handleAction({
        paymentSelect : function() {

        },
        creditCardSelect : function() {
            CreditCardSelect(form.object);
        },
        cancel : function(form, action) {
            var location = request.httpParameterMap.AppURL + '://anything?token=' + request.httpParameterMap.OrderToken + "&action=cancel";
            CancelWebOrder(form.object);
            ISML.renderTemplate('webpayment/redirectToApp', {
                Location : location
            });
        },
        confirm : function(form, action) {
            var status = dw.order.Order.ORDER_STATUS_CREATED;
            if (!form.object.status.value == status) {
                var location = request.httpParameterMap.AppURL + '://anything?token=' + request.httpParameterMap.OrderToken + "&action=confirmCancelledOrder";
                CancelWebOrder(form.object);
                ISML.renderTemplate('webpayment/redirectToApp', {
                    Location : location
                });
            } else {
                var location = request.httpParameterMap.AppURL + '://anything?token=' + request.httpParameterMap.OrderToken + "&action=confirm";
                var result = CreditCardSelect(form.object);
                var confirm = ConfirmWebOrder(form.object, request.httpParameterMap.country, request.httpParameterMap.orderTotal, request.httpParameterMap.balanceDue);
                if (confirm == true) {
                    ISML.renderTemplate('webpayment/redirectToApp', {
                        Location : location
                    });
                }

            }
        }

    })
}

/**
 * InitPaymentForms - initializes and clear all the payment form elements
 * 
 * @param order
 */
function InitPaymentForms(order) {
    app.getForm('billing').clearFormElement();
    app.getForm('WebPayment').clearFormElement();
    app.getForm('billing').object.paymentMethods.clearFormElement();
    app.getForm('billing').object.paymentMethods.creditCard.clearFormElement();
    new Pipelet('UpdateFormWithObject').execute({
        Form : session.forms.WebPayment,
        Object : order
    });
}

/**
 * ConfirmWebOrder - validates all the field ,submit payment and redirects it back to the application
 * 
 * @param order
 */
function ConfirmWebOrder(order) {
    Transaction.wrap(function() {
        order.custom.eaCountry = request.httpParameterMap.country;
    });
    if (!EAUtils.isStorefrontControllers()) {
        var validateBilling = Pipeline.execute('COBilling-ValidateBilling', {
            CurrentForms : session.forms,
            CurrentHttpParameterMap : request.httpParameterMap
        });
        if (validateBilling.EndNodeName != "Error") {
            var paymentSelection = Pipeline.execute('COBilling-HandlePaymentSelection', {
                CurrentForms : session.forms,
                Order : order
            });
            if (paymentSelection.EndNodeName == "error") {
                app.getView(
                        {
                            OrderToken : request.httpParameterMap.OrderToken,
                            AppURL : request.httpParameterMap.AppUrl,
                            AppTimeout : request.httpParameterMap.AppTimeout,
                            orderTotal : request.httpParameterMap.orderTotal,
                            balanceDue : request.httpParameterMap.balanceDue,
                            country : request.httpParameterMap.country,
                            ContinueURL : URLUtils.https('EACheckout-StartWebPaymentSubmitForm', 'OrderToken', request.httpParameterMap.OrderToken, 'AppURL', request.httpParameterMap.AppURL,
                                    'AppTimeout', request.httpParameterMap.AppTimeout, 'orderTotal', request.httpParameterMap.orderTotal, 'balanceDue', request.httpParameterMap.balanceDue, 'country', request.httpParameterMap.country)
                        }).render('webpayment/webpayment');
                return paymentSelection;
            }
            var submitPayment = Pipeline.execute('COPlaceOrder-SubmitPaymentImpl', {
                Order : order
            });
            if (submitPayment.EndNodeName == "error") {
                return false;
            }
            return true;
        } else {
            app.getView(
                    {
                        OrderToken : request.httpParameterMap.OrderToken,
                        AppURL : request.httpParameterMap.AppUrl,
                        AppTimeout : request.httpParameterMap.AppTimeout,
                        orderTotal : request.httpParameterMap.orderTotal,
                        balanceDue : request.httpParameterMap.balanceDue,
                        country : request.httpParameterMap.country,
                        ContinueURL : URLUtils.https('EACheckout-StartWebPaymentSubmitForm', 'OrderToken', request.httpParameterMap.OrderToken, 'AppURL', request.httpParameterMap.AppURL,
                                'AppTimeout', request.httpParameterMap.AppTimeout, 'orderTotal', request.httpParameterMap.orderTotal, 'balanceDue', request.httpParameterMap.balanceDue, 'country', request.httpParameterMap.country)
                    }).render('webpayment/webpayment');
        }
    } else {
        var validateBilling = COBilling.validateBilling();
        if (validateBilling) {
            var cart = app.getModel('Cart').get(order);
            var paymentSelection = app.getController('COBilling').HandlePaymentSelection(cart);
            if (!paymentSelection) {
                app.getView(
                        {
                            OrderToken : request.httpParameterMap.OrderToken,
                            AppURL : request.httpParameterMap.AppUrl,
                            AppTimeout : request.httpParameterMap.AppTimeout,
                            orderTotal : request.httpParameterMap.orderTotal,
                            balanceDue : request.httpParameterMap.balanceDue,
                            country : request.httpParameterMap.country,
                            ContinueURL : URLUtils.https('EACheckout-StartWebPaymentSubmitForm', 'OrderToken', request.httpParameterMap.OrderToken, 'AppURL', request.httpParameterMap.AppURL,
                                    'AppTimeout', request.httpParameterMap.AppTimeout, 'orderTotal', request.httpParameterMap.orderTotal, 'balanceDue', request.httpParameterMap.balanceDue, 'country', request.httpParameterMap.country)
                        }).render('webpayment/webpayment');
                return paymentSelection;
            }
            var submitPayment = COPlaceOrder.handlePayments(order);//submitImpl
            if (!submitPayment) {
                return false;
            }
            return true;
        } else {
            app.getView(
                    {
                        OrderToken : request.httpParameterMap.OrderToken,
                        AppURL : request.httpParameterMap.AppUrl,
                        AppTimeout : request.httpParameterMap.AppTimeout,
                        orderTotal : request.httpParameterMap.orderTotal,
                        balanceDue : request.httpParameterMap.balanceDue,
                        country : request.httpParameterMap.country,
                        ContinueURL : URLUtils.https('EACheckout-StartWebPaymentSubmitForm', 'OrderToken', request.httpParameterMap.OrderToken, 'AppURL', request.httpParameterMap.AppURL,
                                'AppTimeout', request.httpParameterMap.AppTimeout, 'orderTotal', orderTotal, 'balanceDue', balanceDue, 'country', country)
                    }).render('webpayment/webpayment');
        }
    }
}

/**
 * CreditCardSelect - get all the list of credit cards applicable
 */
function CreditCardSelect(order) {
    var result;
    if (EAUtils.isStorefrontControllers()) {
        var COBilling = require('app_storefront_controllers/cartridge/controllers/COBilling');
        var cart = Cart.get(order);
        result = COBilling.initCreditCardList(cart);
    } else {
        result = Pipeline.execute('COBilling-InitCreditCardList', {
            Basket : order,
            CurrentForms : session.forms,
            CurrentLocale : request.locale
        });
    }
    var CurrentHttpParameterMap = request.httpParameterMap;
    var UUID = !empty(CurrentHttpParameterMap.creditCardUUID.value) ? CurrentHttpParameterMap.creditCardUUID.value : CurrentHttpParameterMap.dwfrm_billing_paymentMethods_creditCardList.stringValue;
    GetCustomerCreditCard.execute({
        CreditCardUUID : UUID,
        CustomerPaymentInstruments : result.ApplicableCreditCards
    });

}

/**
 * CancelWebOrder - cancels the web order and remove all the payment instruments
 * 
 * @param order
 */
function CancelWebOrder(order) {
    Transaction.wrap(function() {
        RemoveAllPaymentInstruments.execute({
            Order : order
        });
    });

}
/**
 * End of Functions for Pay through Web.
 */

/*
 * Web Exposed methods.
 */
exports.AuthorizeCreditCard = guard.ensure([ 'https', 'post' ], AuthorizeCreditCard);
exports.StartWebPayment = guard.ensure([ 'https', 'get' ], StartWebPayment);
exports.StartWebPaymentSubmitForm = guard.ensure([ 'https', 'post' ], StartWebPaymentSubmitForm);
exports.StoreWebOrder = guard.ensure([ 'post' ], StoreWebOrder);
exports.RemoveCreditCard = guard.ensure([ 'https', 'post' ], RemoveCreditCard);
exports.RemoveGiftCard = guard.ensure([ 'https', 'post' ], RemoveGiftCard);
exports.GiftCardBalance = guard.ensure([ 'https', 'post' ], GiftCardBalance);
exports.ApplyGiftCard = guard.ensure([ 'https', 'post' ], ApplyGiftCard);
exports.AuthorizePayment = guard.ensure([ 'https', 'post' ], AuthorizePayment);
exports.ApplyCreditCard = guard.ensure([ 'https', 'post' ], ApplyCreditCard);
exports.AbandonOrder = guard.ensure([ 'https', 'post' ], AbandonOrder);
exports.AuthorizeGiftCard = guard.ensure([ 'https', 'post' ], AuthorizeGiftCard);
