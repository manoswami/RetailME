'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller used for checkout related operations when using credit card.
 * 
 * @module controllers/EACreditCard
 */

/* API Includes */
var ISML = require('dw/template/ISML');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var Pipelet = require('dw/system/Pipelet');
var PaymentMgr = require('dw/order/PaymentMgr');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CreateCCPaymentInstrument = require('int_ocapi_ext_core/cartridge/scripts/actions/CreateCCPaymentInstrument');
var RemoveCreditCard = require('int_ocapi_ext_core/cartridge/scripts/actions/RemoveCreditCard');
var CaptureCreditCardDetails = require('int_ocapi_ext_core/cartridge/scripts/actions/CaptureCreditCardDetails');
var Verifone = require('int_verifone_dss_controllers/cartridge/controllers/Verifone');
var app = require('app_storefront_controllers/cartridge/scripts/app');

/**
 * Handle2 - Used for creating a credit card payment instrument.
 * 
 * @param requestObject
 * @param order
 * @returns PaymentInstrument
 */
function Handle2(requestObject, order) {
    var result = ProcessCreditCard(requestObject);
    var creditCard = result.creditCard;
    var PaymentInstrument;
    Transaction.wrap(function() {
        var args = {
            AuthAmount : requestObject.auth_amount,
            creditCard : creditCard,
            LineItemCtnr : order,
            PaymentType : dw.system.Site.current.preferences.custom.eaCreditCardPaymentMethod,
            RemoveExisting : false
        };
        CreateCCPaymentInstrument.execute(args);
        PaymentInstrument = args.PaymentInstrument;
        PaymentInstrument.creditCardHolder = creditCard.owner;
        PaymentInstrument.creditCardNumber = creditCard.num;
        PaymentInstrument.creditCardType = creditCard.type;
        PaymentInstrument.creditCardExpirationMonth = creditCard.month;
        PaymentInstrument.creditCardExpirationYear = creditCard.year;
        PaymentInstrument.custom.eaAdyenTransactionID = creditCard.transactionID;
        PaymentInstrument.custom.eaAdyenPaymentReferenceID = creditCard.paymentReferenceID;
        if (creditCard.isContactless) {
            PaymentInstrument.custom.eaIsContactless = creditCard.isContactless;
        }

    });
    return {
        PaymentInstrument : PaymentInstrument
    };
}

/**
 * Authorize - Authorizes a payment using a credit card. The payment is authorized by using the BASIC_CREDIT processor only and setting the order no as the transaction ID. Customizations may use other
 * processors and custom logic to authorize credit card payment.
 * 
 * @param order
 * @param PaymentInstrument
 * @returns {String}
 */
function Authorize(order, PaymentInstrument) {
    var EAUtils = require('~/cartridge/controllers/EAUtils');
    var result;
    var PaymentProcessor1 = new Pipelet('GetPaymentProcessor').execute({
        ID : dw.system.Site.current.preferences.custom.eaCreditCardPaymentProcessor
    });
    Transaction.wrap(function() {
        PaymentInstrument.paymentTransaction.transactionID = order.orderNo;
        PaymentInstrument.paymentTransaction.paymentProcessor = PaymentProcessor1.PaymentProcessor;
    });
    if (EAUtils.isStorefrontControllers() == true) {
        var args = {
            OrderNo : order.orderNo,
            PaymentInstrument : PaymentInstrument
        };
        var result = require('app_storefront_controllers/cartridge/scripts/payment/processor/BASIC_CREDIT').Authorize(args);
        if (result.authorized) {
            result = "authorized";
        } else if (result.declined) {
            result = "declined";
        }
    } else {
        var HandlePipelineAction = dw.system.Site.current.preferences.custom.eaCreditCardAuthorization;
        var creditAuthorize = Pipeline.execute(HandlePipelineAction, {
            PaymentInstrument : PaymentInstrument,
            OrderNo : order.orderNo
        });
        if (creditAuthorize.EndNodeName == "authorized") {
            result = "authorized";
        } else if (creditAuthorize.EndNodeName == "declined") {
            var args = {
                creditCard : PaymentInstrument,
                CreditCardLastFour : null,
                LineItemCtnr : order,
                PaymentType : dw.system.Site.current.preferences.custom.eaCreditCardPaymentMethod
            };
            Transaction.wrap(function() {
                RemoveCreditCard.execute(args);
            });
            result = "declined";
        } else if (creditAuthorize.EndNodeName == "review") {
            result = "review";
        } else if (creditAuthorize.EndNodeName == "error") {
            var args = {
                creditCard : PaymentInstrument,
                CreditCardLastFour : null,
                LineItemCtnr : order,
                PaymentType : dw.system.Site.current.preferences.custom.eaCreditCardPaymentMethod
            };
            Transaction.wrap(function() {
                RemoveCreditCard.execute(args);
            });
            result = "error";
        }
    }

    return result;
}

/**
 * Handle - Verifies a credit card against a valid card number and expiration date and possibly invalidates invalid form fields. If the verification was successful a credit card payment instrument is
 * created.
 * 
 * @param requestObject
 * @param order
 * @returns result
 */
function Handle(requestObject, order) {
    var result = ProcessCreditCard(requestObject);
    var PaymentInstrument;
    var creditCard = result.creditCard;
    Transaction.wrap(function() {
        var args = {
            AuthAmount : requestObject.auth_amount,
            creditCard : creditCard,
            LineItemCtnr : order,
            PaymentType : dw.system.Site.current.preferences.custom.eaCreditCardPaymentMethod,
            RemoveExisting : false
        };
        CreateCCPaymentInstrument.execute(args);
        PaymentInstrument = args.PaymentInstrument;
        PaymentInstrument.creditCardHolder = args.creditCard.owner;
        PaymentInstrument.creditCardNumber = args.creditCard.num;
        PaymentInstrument.creditCardType = args.creditCard.type;
        PaymentInstrument.creditCardExpirationMonth = args.creditCard.month;
        PaymentInstrument.creditCardExpirationYear = args.creditCard.year;
    });
    if (PaymentInstrument.custom.eaAdyenTransactionID) {
        PaymentInstrument.custom.eaAdyenTransactionID = args.creditCard.transactionID;
        PaymentInstrument.custom.eaAdyenPaymentReferenceID = args.creditCard.paymentReferenceID;
    }
    result = {
        PaymentInstrument : PaymentInstrument
    };
    return result;
}

/**
 * Remove - removes the credit card from the basket
 * 
 * @param requestObject
 * @param order
 */
function Remove(requestObject, order) {
    var CreditCardLastFour = requestObject.credit_card_last_four;
    var args = {
        creditCard : null,
        CreditCardLastFour : CreditCardLastFour,
        LineItemCtnr : order,
        PaymentType : dw.system.Site.current.preferences.custom.eaCreditCardPaymentMethod
    };
    Transaction.wrap(function() {
        RemoveCreditCard.execute(args);
    });
}

/**
 * ProcessCreditCard - Takes the request object as input and process the credit card details.
 * 
 * @param requestObject
 * @returns creditCardObject
 */
function ProcessCreditCard(requestObject) {
    var EAUtils = require('~/cartridge/controllers/EAUtils');
    
    // This condition is checking if you are using controllers 
    // or pipelines for decrypting credit card
    // if using controllers, the go to Custom Preferences->Endless Aisle Checkout and change the preference to true
    if (dw.system.Site.current.preferences.custom.eaUseControllersForDecryption === true) {
        var handlePipelineAction = dw.system.Site.current.preferences.custom.eaCreditCardDecryptionService
                .split("-")[0];
        var handleAction = dw.system.Site.current.preferences.custom.eaCreditCardDecryptionService
                .split("-")[1];
        if(handlePipelineAction != 'EACreditCard'){
            eval(handlePipelineAction)[handleAction](requestObject);
        }
    } else {
        var handlePipelineAction = dw.system.Site.current.preferences.custom.eaCreditCardDecryptionService;
        var creditCardDecryption = Pipeline.execute(handlePipelineAction, {
            requestObject : requestObject
        });
    }
    var creditCardObject = {
        AccountNumber : requestObject.pan,
        CardType : requestObject.card_type,
        ExpirationDate : requestObject.expire_date,
        IsContactless : requestObject.is_contactless,
        Owner : requestObject.owner,
        PaymentReferenceID : requestObject.payment_reference_id,
        TerminalID : empty(requestObject.terminal_id) ? "not passed" : requestObject.terminal_id,
        Track1 : requestObject.track_1,
        Track2 : requestObject.track_2,
        TransactionID : requestObject.transaction_id
    };
    CaptureCreditCardDetails.execute(creditCardObject);
    return creditCardObject;
}

/*
 * Module exports
 */
/*
 * Public Methods
 */
exports.Handle2 = Handle2;
exports.Authorize = Authorize;
exports.Handle = Handle;
exports.Remove = Remove;
exports.ProcessCreditCard = ProcessCreditCard;
