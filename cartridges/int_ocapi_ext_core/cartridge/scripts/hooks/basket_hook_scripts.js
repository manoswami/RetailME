/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 *
 * basket_hook_scripts.js
 *
 * Handles OCAPI hooks for basket calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var LineItemCtnr = require('dw/order/LineItemCtnr');
var StoreMgr = require('dw/catalog/StoreMgr');
var PriceBookMgr = require('dw/catalog/PriceBookMgr');

var basketPatch = require('./basketPatch');

/**
 * the beforePATCH basket hook. This gets called before a basket patch
 * operation.
 * dw.ocapi.shop.basket.beforePATCH
 */
exports.beforePATCH = function(basket, update) {
    setPriceBook();
    var log = Logger.getLogger("instore-audit-trail");
    // only call this code for Endless Aisle
    var req = request.httpParameters;
    if (update.c_patchInfo && req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        log.info("basket beforePATCH: entering script");
        // call the patch script. if that returns an error, return that error
        var status = basketPatch.beforePatch(basket, update);
        if (status.status == Status.ERROR) {
            log.info("basket beforePATCH: error on update");
            return status;
        }
        // make sure to call the calculate hook
        dw.system.HookMgr.callHook("dw.ocapi.shop.basket.calculate", "calculate", basket);
        log.info("basket beforePATCH: exiting script");
    }
    return new Status(Status.OK);
};

/**
 * the afterPATCH basket hook. This gets called after a basket patch operation.
 * dw.ocapi.shop.basket.afterPATCH
 */
exports.afterPATCH = function(basket, update) {
    var log = Logger.getLogger("instore-audit-trail");
    var req = request.httpParameters;
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        log.info("basket afterPATCH: entering script");
        // call the patch script. if that returns an error, return that error
        var status = basketPatch.afterPatch(basket, update);
        if (status.status == Status.ERROR) {
            log.info("basket afterPATCH: error on update");
            return status;
        }
        log.info("basket afterPATCH: exiting script");
    }
    return new Status(Status.OK);
};

/**
 * setPriceBook - it sets the price book for a particular country defined in
 * custom preferences -> EACatalog -> Country Configuration
 *
 */
function setPriceBook() {
    var req = request.httpParameters;
    // only call this code for Endless Aisle
    if (req.c_endlessaisle && req.c_endlessaisle[0] == "true") {
        var country = req.country[0];
        var sitePrefs = JSON.parse(dw.system.Site.getCurrent().getPreferences().custom.eaCountryConfiguration)[country];
        var salePriceBook = PriceBookMgr.getPriceBook(sitePrefs.sale_price_book);
        var listPriceBook = PriceBookMgr.getPriceBook(sitePrefs.list_price_book);
        var setPriceBook = PriceBookMgr.setApplicablePriceBooks(salePriceBook, listPriceBook);
    }
};

/**
 * the validateBasket hook. EA doesn't require a payment instrument when
 * submitting the basket to create an order, so remove that flash error
 */
exports.validateBasket = function(basketResponse, checkForSubmit) {
    var log = Logger.getLogger("instore-audit-trail");
    if (request && checkForSubmit && basketResponse.channelType == "dss") {
        log.info("validateBasket: remove payment method required flash and invalid coupon status flash");
        var flashToRemove = [];
        for each (flash in basketResponse.flashes) {
            if (flash.type == "PaymentMethodRequired" || flash.type == "InvalidCouponStatus") {
                flashToRemove.push(flash);
            }
        }
        // now remove the flashes if any
        for each (flash in flashToRemove) {
            basketResponse.removeFlash(flash);
        }
    }
    return new Status(Status.OK);
};

exports.setPriceBook = setPriceBook;
