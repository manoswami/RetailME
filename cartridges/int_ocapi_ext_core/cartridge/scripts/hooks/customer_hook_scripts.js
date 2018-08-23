/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * customer_hook_scripts.js
 * 
 * Handles OCAPI hooks for customer calls
 */

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var ProductListMgr = require('dw/customer/ProductListMgr');
var ProductList = require('dw/customer/ProductList');

var createCustomerAccount = require('./createCustomerAccount');
var createBasket = require('../actions/CreateBasketForCustomer.ds');

/**
 * the afterPOST hook when creating a new customer
 */
exports.afterPOST = function(cCustomer, registration) {
    var log = Logger.getLogger("instore-audit-trail");
    // only call this code for EA if there's an agent
    if (registration.customer.c_employee_id) {
        log.info("customer afterPost: entering script");

        var wishLists = cCustomer.getProductLists(ProductList.TYPE_WISH_LIST).toArray();
        if (wishLists && wishLists.length == 0) {
            try {
                ProductListMgr.createProductList(cCustomer, ProductList.TYPE_WISH_LIST);
            } catch (e) {
                if (typeof e !== "string") {
                    e = JSON.stringify(e);
                }
                log.error('The following error occurred while creating the customer wish list\n: {0}', e)
            }
        }

        // create a new basket for the customer
        createBasket.createBasket(session.getCustomer());
        var status = createCustomerAccount.createCustomerAccount(cCustomer, registration);
        log.info("afterPOST: exiting script");
        return status;
    }
    return new Status(Status.OK);
};