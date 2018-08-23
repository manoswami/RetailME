'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller used for checkout related operations when using gift card.
 * 
 * @module controllers/EAGiftCard
 */

/* API Includes */
var ISML = require('dw/template/ISML');
var Pipeline = require('dw/system/Pipeline');
var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var Pipelet = require('dw/system/Pipelet');
var GiftCertificateMgr = require('dw/order/GiftCertificateMgr');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CaptureGiftCardDetails = require('int_ocapi_ext_core/cartridge/scripts/actions/CaptureGiftCardDetails');
var EACreateGiftCardPaymentInstrument = require('int_ocapi_ext_core/cartridge/scripts/api/EACreateGiftCardPaymentInstrument');
var EARemoveGiftCardPaymentInstrument = require('int_ocapi_ext_core/cartridge/scripts/api/EARemoveGiftCardPaymentInstrument');

/**
 * Handle - Used for creating a gift card payment instrument.
 * 
 * @param requestObject
 * @param order
 * @returns giftCardObject
 */
function Handle(requestObject, order) {
    var args = {
        Track1 : requestObject.track_1,
        Track2 : requestObject.track_2
    };
    CaptureGiftCardDetails.execute(args);
    var giftCardObject = Transaction.wrap(function() {
        return EACreateGiftCardPaymentInstrument.createGiftCardPayment(order, args.giftCard.num, requestObject.redeem_amount);
    });
    return giftCardObject;

}

/**
 * CheckBalance - Returns the balance of a GiftCard (or an appropriate error message when not valid)
 * 
 * @param requestObject
 * @returns GiftCertificate
 */
function CheckBalance(requestObject) {
    var args = {
        Track1 : requestObject.track_1,
        Track2 : requestObject.track_2
    };
    CaptureGiftCardDetails.execute(args);
    var GiftCertificate = GiftCertificateMgr.getGiftCertificateByCode(args.giftCard.num);
    if (GiftCertificate != null) {
        return GiftCertificate;
    } else {
        ISML.renderTemplate('responses/eainvalidgiftcardjson');
    }

}

/**
 * Authorize - Authorizes a payment using a gift certificate. The payment is authorized by redeeming the gift certificate and simply setting the order no as transaction ID.
 * 
 * @param order
 * @param paymentInstrument
 * @returns {Boolean}
 */
function Authorize(order, paymentInstrument) {
    var PaymentProcessor1 = new Pipelet('GetPaymentProcessor').execute({
        ID : "EAGiftCard"
    });
    Transaction.wrap(function() {
        paymentInstrument.paymentTransaction.transactionID = order.orderNo;
        paymentInstrument.paymentTransaction.paymentProcessor = PaymentProcessor1.PaymentProcessor;
        var result = GiftCertificateMgr.redeemGiftCertificate(paymentInstrument);
        if (!empty(paymentInstrument.paymentTransaction.transactionID)) {
            return true;
        }
    });
}

/**
 * Remove - Remove the Gift Card
 * 
 * @param requestObject
 * @param order
 */
function Remove(requestObject, order) {
    Transaction.wrap(function() {
        EARemoveGiftCardPaymentInstrument.execute({
            lastFourGiftCard : requestObject.gift_card_last_four,
            Order : order
        });
    });

}

/*
 * Public Methods
 */
exports.CheckBalance = CheckBalance;
exports.Handle = Handle;
exports.Authorize = Authorize;
exports.Remove = Remove;
