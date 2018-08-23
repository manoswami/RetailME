/**
 * ©2013-2018 salesforce.com, inc. All rights reserved.
 * 
 * Code to be called in the dw.ocapi.shop.customer.afterPost hook.
 * 
 */

var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var HashMap = require('dw/util/HashMap');
var Status = require('dw/system/Status');

importScript("api/Authorize.ds");

/**
 * createCustomerAccount
 * 
 * called after creating a customer account to update the order to reflect the customer also used to save an address to the customer profile
 */
exports.createCustomerAccount = function(customer, registration) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("createCustomerAccount execute: entering script");
    var orderNo = registration.customer.c_orderNo;
    var data = registration.customer.c_address;
    var customerProfile = customer.getProfile();
    var email = customerProfile.getEmail();
    if (orderNo) {
        log.info("order number is " + orderNo);
        var order = OrderMgr.getOrder(orderNo);
        order.setCustomer(customer);
        order.setCustomerName(customerProfile.getFirstName() + " " + customerProfile.getLastName());
    }

    // if there is an address to save, save it
    if (data) {
        var address = {
            address_id : data.address_id,
            original_id : "",
            first_name : data.first_name,
            last_name : data.last_name,
            address1 : data.address1,
            address2 : data.address2,
            city : data.city,
            state_code : data.state_code,
            country_code : data.country_code,
            postal_code : data.postal_code,
            phone : data.phone
        };

        var status = saveAddress(customer, address, registration.customer.c_employee_id, registration.customer.c_employee_passcode, registration.customer.c_store_id);
        if (status.status == Status.ERROR) {
            log.info("createCustomerAccount execute: exiting script with error");
            return status;
        }
    }
    sendMail(email, customerProfile);
    log.info("createCustomerAccount execute: exiting script");
    return new Status(Status.OK);
};

/**
 * saveAddress
 * 
 * save an address to the customer"s address book
 */
function saveAddress(customer, address, employeeId, employeePasscode, storeId) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("createCustomerAccount saveAddress: entering script");
    var agentAuthorize = new Authorize();
    agentAuthorize.authorize(employeeId, employeePasscode, storeId);

    // Check if the agent is logged in and if the agent has the log in on behalf
    // of permission.
    var allowLOBO = agentAuthorize.allowLOBO;
    if (!allowLOBO) {
        log.info("createCustomerAccount saveAddress: exiting script with EA_EMP_AUTH_4003 error");
        return new Status(Status.ERROR, "saveAddessError", dw.web.Resource.msg("createaccount.noagent.errormessage", "account", null));
    } else if (!customer) {
        log.info("createCustomerAccount saveAddress: exiting script with EA_LOBO_404 error");
        return new Status(Status.ERROR, "saveAddressError", dw.web.Resource.msg("createaccount.nocustomer.errormessage", "account", null));
    } else {
        log.info("createCustomerAccount saveAddress: associate " + session.custom.agent + " is saving an address for " + customer.getID());

        var addressBook = customer.getAddressBook();

        // check to see if name already exists
        if ((address.address_id != address.original_id) && addressBook.getAddress(address.address_id)) {
            return new Status(Status.ERROR, "saveAddressError", dw.web.Resource.msg("addressalreadyexists.title", "account", null));
        }
        var addr = (address.original_id) ? addressBook.getAddress(address.original_id) : null;

        if (!addr) {
            // Create a new address
            addr = addressBook.createAddress(address.address_id);
        }

        addr.ID = address.address_id;
        addr.firstName = address.first_name;
        addr.lastName = address.last_name;
        addr.address1 = address.address1;
        addr.address2 = address.address2;
        addr.city = address.city;
        if (address.state_code) {
            addr.stateCode = address.state_code;
        }
        addr.countryCode = address.country_code;
        addr.postalCode = address.postal_code;
        addr.phone = address.phone;

        if (address.preferred) {
            addressBook.setPreferredAddress(addr);
        }
    }
    log.info("createCustomerAccount saveAddress: exiting script");
    return new Status(Status.OK);
}

/**
 * sendMail
 * 
 * send welcome email to a new customer
 */
function sendMail(email, customerProfile) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("createCustomerAccount sendMail: entering script");
    var template = new dw.util.Template("mail/newaccountwelcomemail.isml");
    var map = new HashMap();
    map.put("firstName", customerProfile.getFirstName());
    map.put("lastName", customerProfile.getLastName());
    var content = template.render(map);
    var mail = new dw.net.Mail();
    mail.addTo(email);
    mail.setFrom(dw.system.Site.getCurrent().getCustomPreferenceValue("customerServiceEmail") || "no-reply@salesforce.com");
    mail.setSubject(dw.web.Resource.msg("welcomeemail.subject", "account", null));
    mail.setContent(content);

    var result = mail.send();// returns either Status.ERROR or Status.OK, mail might not be sent yet, when this method returns
    if (result.status == Status.ERROR) {
        log.info("createCustomerAccount sendMail: failure to send email");
    } else {
        log.info("createCustomerAccount sendMail: send mail success");
    }
    log.info("createCustomerAccount sendMail: exiting script");
}
