'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller used for account and customer related operations
 * 
 * @module controllers/EAAccount
 */

/* API Includes */
var ISML = require('dw/template/ISML');
var Transaction = require('dw/system/Transaction');
var AgentUserMgr = require('dw/customer/AgentUserMgr');
var CustomerMgr = require('dw/customer/CustomerMgr');
var Logger = require('dw/system/Logger');
var ProductListMgr = require('dw/customer/ProductListMgr');
var ProductList = require('dw/customer/ProductList');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');
var Mail = require('dw/net/Mail');
var Pipelet = require('dw/system/Pipelet');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var FetchCredential = require('int_ocapi_ext_core/cartridge/scripts/actions/FetchCredential');
var ExpiredStoreCredential = require('int_ocapi_ext_core/cartridge/scripts/actions/ExpiredStoreCredential');
var GetLoginStatus = require('int_ocapi_ext_core/cartridge/scripts/actions/GetLoginStatus');
var ValidateDevice = require('int_ocapi_ext_core/cartridge/scripts/actions/ValidateDevice');
var CustomerSearch = require('int_ocapi_ext_core/cartridge/scripts/actions/SearchCustomer');
var LoginOnBehalfOf = require('int_ocapi_ext_core/cartridge/scripts/actions/LoginOnBehalf');
var ChangeAssociatePassword = require('int_ocapi_ext_core/cartridge/scripts/actions/ChangeAssociatePassword');
var ValidateAssociateExist = require('int_ocapi_ext_core/cartridge/scripts/actions/ValidateAssociateExists');
var CheckAgentForSession = require('int_ocapi_ext_core/cartridge/scripts/actions/CheckAgentForSession');
var GetPermission = require('int_ocapi_ext_core/cartridge/scripts/actions/GetPermissions');
var CheckUser = require('int_ocapi_ext_core/cartridge/scripts/actions/CheckUser');
var CreateBasketForCustomer = require('int_ocapi_ext_core/cartridge/scripts/actions/CreateBasketForCustomer');
var EmailWishList = require('int_ocapi_ext_core/cartridge/scripts/actions/EmailProductList.ds');
/* Controller Includes */
var EAUtils = require('~/cartridge/controllers/EAUtils');

/**
 * AgentLogin - Attempts to log an associate into EA - it returns JSON which contains either an error or the data of the successfully logged-in associate
 */
function AgentLogin() {
    var credentials = FetchCredential.fetchCredentials(session.custom.storeId);
    if (credentials.ErrorMessage) {
        ISML.renderTemplate('responses/eainvaliddevicejson', {
            outputStr : credentials.ErrorMessage
        });
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    if (requestObject) {
        var checkAssociateAuthorization = CheckForAssociateLogin(requestObject);
        if (checkAssociateAuthorization.authorized == true) {
            var username = session.custom.username;
            var password = session.custom.password;
            var loginAgentUser = AgentUserMgr.loginAgentUser(username, password);
            if (!loginAgentUser.error) {
                ISML.renderTemplate('responses/eaagentloginjson', {
                    output : checkAssociateAuthorization.output
                });
            } else {
                Transaction.wrap(function() {
                    var expiredcredentials = ExpiredStoreCredential.expiredStoreCredential();
                    var loginStatus = GetLoginStatus.getLoginStatus(checkAssociateAuthorization.badParams, checkAssociateAuthorization.locked, checkAssociateAuthorization.missingPermissions,
                            checkAssociateAuthorization.authorized, expiredcredentials.loginStatus);
                    ISML.renderTemplate('responses/eaagentloginjson', {
                        output : loginStatus.output
                    });
                });
            }
        } else {
            var loginStatus = GetLoginStatus.getLoginStatus(checkAssociateAuthorization.badParams, checkAssociateAuthorization.locked, checkAssociateAuthorization.missingPermissions,
                    checkAssociateAuthorization.authorized, checkAssociateAuthorization.loginStatus);
            ISML.renderTemplate('responses/eaagentloginjson', {
                output : loginStatus.output
            });
        }
    }
}

/**
 * AgentLogout - Logs an agent out of the EA application
 */
function AgentLogout() {
    AgentUserMgr.logoutAgentUser();
    ISML.renderTemplate('responses/eaagentloginjson', {
        output : '{"httpStatus":200}'
    });
}

/**
 * Search - Returns a list of customers that match certain search criteria (names, email addresses)
 */
function Search() {
    var CurrentHttpParameterMap = request.httpParameterMap;
    var Customers = CustomerSearch.searchCustomer(CurrentHttpParameterMap.firstname.value, CurrentHttpParameterMap.lastname.value, CurrentHttpParameterMap.email.value);
    if (!empty(Customers.ErrorJson)) {
        ISML.renderTemplate('responses/easearchcustomerjson', {
            errorJson : Customers.ErrorJson
        });
    } else {
        ISML.renderTemplate('responses/easearchcustomerjson', {
            customerList : Customers.CustomerList
        });
    }

}

/**
 * LoginOnBehalf - used to login on behalf of a customer.
 */
function LoginOnBehalf() {
    var args = {};
    var requestObject = EAUtils.ExtractRequestObject();
    if (!requestObject) {
        args = {
            BadRequestError : true
        };
    } else {
        var customer = CustomerMgr.getCustomerByLogin(requestObject.login);
        var logInOnBehalfCustomer = AgentUserMgr.loginOnBehalfOfCustomer(customer);
        if (!session.custom.agent.allowLOBO) {
            args = {
                AuthError : true
            };
        } else if (!customer || !customer.ID) {
            args = {
                CustomerNotFoundError : true
            };
        } else if (!logInOnBehalfCustomer) {
            args = {
                LoboError : true
            };
        }
        var result = LoginOnBehalfOf.logOnBehalf(args);
        var log = Logger.getLogger("instore-audit-trail");
        log.info("Agent " + session.custom.agent.employeeId + " logged in " + customer);
        ISML.renderTemplate('responses/eacustomerloginjson', {
            Customer : customer,
            output : result.Output
        });
    }
}

/**
 * ChangePassword - Changes the password of the given associate to the supplied password
 */
function ChangePassword() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    var scriptResult = Transaction.wrap(function() {
        return ChangeAssociatePassword.changePassword(session, requestObject.employee_id, requestObject.new_password, requestObject.store_id);
    });
    if (scriptResult.JSONResponse) {
        ISML.renderTemplate('responses/eajson', {
            JSONResponse : scriptResult.JSONResponse
        });
    } else {
        ISML.renderTemplate('responses/eajson', {
            JSONResponse : JSON.stringify(scriptResult.ErrorMessage, null, '\t')
        });
    }
}

/**
 * ValidateAssociateExists - Validates that the give associate id exists
 */
function ValidateAssociateExists() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    var scriptResult = Transaction.wrap(function() {
        return ValidateAssociateExist.validateAssociateExists(
                requestObject.employee_id, requestObject.store_id);
    });
    if (scriptResult.JSONResponse) {
        ISML.renderTemplate('responses/eajson', {
            JSONResponse : scriptResult.JSONResponse
        });
    } else {
        ISML.renderTemplate('responses/eajson', {
            errorJson : JSON.stringify(scriptResult.ErrorMessage, null, '\t')
        });
    }
}

/**
 * CheckForAssociateLogin - Check if the user is authorized to login
 * 
 * @input requestObject
 * @returns scriptResult
 */
function CheckForAssociateLogin(requestObject) {
    var scriptResult = Transaction.wrap(function() {
        return CheckUser.checkUser(requestObject.employee_id, requestObject.passcode)
    });

    if (!scriptResult.authorized) {
        var result = HandlePermissionError(scriptResult.status);
        return result;
    }
    return scriptResult;

}

/**
 * SetDataOnNewSession - It creates a new session for the application.
 */
function SetDataOnNewSession() {
    var requestObject = EAUtils.ExtractRequestObject();
    var checkSession = Transaction.wrap(function() {
        return CheckAgentForSession.checkAgent(requestObject.employeeId, requestObject.passcode, requestObject.storeId);
    });
    if(requestObject.appCurrency != dw.system.Site.getCurrent().getCurrencyCode()){
        new Pipelet('SetSessionCurrency').execute({
        	CurrencyCode:requestObject.appCurrency
        });
    }
    if (!checkSession.success) {
        ISML.renderTemplate('responses/eainvalidsetdataonnewsession', {
            output : '{"httpStatus":400}'
        });
    } else {
        var validDevice = ValidateDevice.validateDevice("Not Used Here", session.custom.agent.storeId, "Not Used Here");
        if (validDevice.ErrorMessage) {
            ISML.renderTemplate('responses/eainvalidsetdataonnewsession', {
                output : '{"httpStatus":400}'
            });
        } else {
            ISML.renderTemplate('responses/eaagentloginjson', {
                output : '{"httpStatus":200}'
            });
            session.custom.country = requestObject.country;
        }
    }
}

/**
 * GetPermissions - retrieves the permissions for the associate who is currently logged in.
 */
function GetPermissions() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    var scriptResult = Transaction.wrap(function() {
        return GetPermission.getPermissions(requestObject.employee_id, requestObject.passcode);
    });
    if (scriptResult.authorized == true) {
        ISML.renderTemplate('responses/eaagentloginjson', {
            output : scriptResult.output
        });
    } else {
        var result = HandlePermissionError(scriptResult.status);
        var loginStatus = GetLoginStatus.getLoginStatus(result.badParams, result.locked, result.missingPermissions, result.authorized, result.loginStatus);
        ISML.renderTemplate('responses/eaagentloginjson', {
            output : loginStatus.output
        });
    }
}

/**
 * HandlePermissionError - Handles all the permission related errors status
 * 
 * @param status
 * @returns result
 */
function HandlePermissionError(status) {
    var result = {};
    if (status === "permissions_not_found") {
        result = {
            missingPermissions : true
        };
    } else {
        if (status === "bad_params") {
            result = {
                badParams : true
            };
        } else {
            if (status === "not_authorized") {
                result = {
                    authorized : false
                };
            } else {
                result = {
                    locked : true
                };
            }
        }
    }
    return result;
}

/**
 * EmailProductList - Email the Wish list to the requested email.
 * 
 */
function EmailProductList() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var requestObject = EAUtils.ExtractRequestObject();
    if (!empty(requestObject.productListId) && !empty(requestObject.receiverEmail) && !empty(requestObject.senderEmail) && !empty(requestObject.senderName)) {
        var args = {
            productListId : requestObject.productListId,
            receiverEmail : requestObject.receiverEmail,
            senderEmail : requestObject.senderEmail,
            senderName : requestObject.senderName
        };
        EmailWishList.execute(args);
        ISML.renderTemplate('responses/json', {
            JSONResponse : args.JSONResponse
        });
    }
}

/**
 * Create a new basket for a customer
 */
function CreateBasket() {
    var scriptResult = Transaction.wrap(function() {
        return CreateBasketForCustomer.createBasket(session.customer);
    });
    scriptResult ? ISML.renderTemplate('responses/json', {
        JSONResponse : {
            "httpStatus" : 200
        }
    }) : ISML.renderTemplate('responses/json', {
        JSONResponse : {
            "httpStatus" : 500,
            "message" : Resource.msg('createbasket.errormessage', 'account', null)
        }
    });
}

/*
 * Web Exposed Methods
 */
exports.AgentLogin = guard.ensure([ 'https', 'post' ], AgentLogin);
exports.AgentLogout = guard.ensure([ 'https', 'post' ], AgentLogout);
exports.Search = guard.ensure([ 'https', 'get' ], Search);
exports.LoginOnBehalf = guard.ensure([ 'https', 'post' ], LoginOnBehalf);
exports.ChangePassword = guard.ensure([ 'https', 'post' ], ChangePassword);
exports.ValidateAssociateExists = guard.ensure([ 'https', 'post' ], ValidateAssociateExists);
exports.SetDataOnNewSession = guard.ensure([ 'https', 'post' ], SetDataOnNewSession);
exports.GetPermissions = guard.ensure([ 'https', 'post' ], GetPermissions);
exports.EmailProductList = guard.ensure([ 'https', 'post' ], EmailProductList);
exports.CreateBasket = guard.ensure([ 'https', 'post' ], CreateBasket);
