'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller used for utility functions
 *
 * @module controllers/EAUtils
 */

/* API Includes */
var ISML = require('dw/template/ISML');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var CheckRequest = require('int_ocapi_ext_core/cartridge/scripts/util/CheckRequest');
var LogErrorOnServer = require('int_ocapi_ext_core/cartridge/scripts/actions/LogErrorOnServer');
var ExtractRequestBody = require('int_ocapi_ext_core/cartridge/scripts/util/ExtractRequestBody');
var ProductAvailabilityMessage = require('int_ocapi_ext_core/cartridge/scripts/actions/ProductAvailabilityMessage');
var SaveUploadedFile = require('int_ocapi_ext_core/cartridge/scripts/SaveUploadedFile');
/* Controller Includes */
var EAStore = require('~/cartridge/controllers/EAStore');

/**
 * ValidateSession - Check if the Session is still active
 *
 * @returns Boolean - if the session is still active or not
 */
function ValidateSession() {
    var devicesession = EAStore.ValidateDeviceInSession();
    if (!devicesession || !devicesession.custom || !devicesession.custom.agent) {
        ISML.renderTemplate('responses/easessiontimeoutjson');
        return false;
    }
    return true;
}

/**
 * EmailConsoleLog - Used to Email the Console logs to the admin of the application.
 */
function EmailConsoleLog() {
    if (!ValidateSession()) {
        return;
    }
    var fromEmail = dw.system.Site.getCurrent().getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com';
    sendMail('mail/consolelogemail', dw.system.Site.current.preferences.custom.eaAdminEmail, fromEmail, (request.httpParameterMap.subject.value || dw.web.Resource.msg('consolelog.subject', 'eaapi', null)));
    
    ISML.renderTemplate('responses/json', {
        JSONResponse : "{'httpStatus':'200'}",
        CurrentHttpParameterMap : request.httpParameterMap
    });
}

/**
 * LogAndEmailError - Used to email the log and errors to admin and upload them to server.
 */
function LogAndEmailError() {
    var mailSubject;
    if (dw.system.Site.current.preferences.custom.eaLogErrorsToServerLog == true) {
        LogErrorOnServer.execute(request.httpParameterMap.errorText.stringValue);
    }
    if (dw.system.Site.current.preferences.custom.eaEmailAdminOnError == true) {
        if (!session.custom.agent) {
            mailSubject = dw.web.Resource.msgf('errorMsg.subjectStartup', 'eaapi', null, dw.system.Site.current.httpHostName);
        } else {
            mailSubject = dw.web.Resource.msgf('errorMsg.subject', 'eaapi', null, session.custom.storeId, session.custom.agent.employeeId, dw.system.Site.current.httpHostName);
        }
        var fromEmail = dw.system.Site.getCurrent().getCustomPreferenceValue('customerServiceEmail') || 'no-reply@salesforce.com';
        sendMail('mail/errormessageemail', dw.system.Site.current.preferences.custom.eaAdminEmail, fromEmail, mailSubject);
    }
    var JSONResponse = {
        httpStatus : '200'
    };
    ISML.renderTemplate('responses/json', {
        JSONResponse : "{'httpStatus':'200'}",
        CurrentHttpParameterMap : request.httpParameterMap
    });

}

/**
 * ExtractRequestObject - Extract the request parameters from the request body
 *
 * @returns RequestObject
 */
function ExtractRequestObject() {
    var CurrentHttpParameterMap = request.httpParameterMap;
    var result = ExtractRequestBody.extractReqObject(CurrentHttpParameterMap.requestBodyAsString);
    if (result.RequestObject) {
        return result.RequestObject;
    }

}

/**
 * UpdateProductMessages - Updates the availability messages for the product
 * 
 * @param basket
 * @param enableCheckout
 */
function UpdateProductMessages(basket, enableCheckout) {
    if (basket) {
        var availabilityMessage = ProductAvailabilityMessage.productAvailabilityMessage(basket);
        ISML.renderTemplate('responses/eabasketjson', {
            Basket : basket,
            AvailabilityMessageMap : availabilityMessage.availabilityMessageMap,
            EnableCheckout : enableCheckout
        });
    }
}

/**
 * Get the OAuth token needed for Shop API requests
 */
function GetAuthenticationToken() {
    if (!ValidateSession()) {
        return;
    }
    var requestObject = ExtractRequestObject();
    var GetAuthenticationToken = require('int_ocapi_ext_core/cartridge/scripts/actions/GetAuthenticationToken');
    var result = GetAuthenticationToken.getAuthenticationToken(requestObject.hostname);
    ISML.renderTemplate('responses/json', {
        JSONResponse : result,
        CurrentHttpParameterMap : request.httpParameterMap
    });
}

/**
 * isStorefrontControllers - To check if we are using sitegenesis controllers or pipelines set the variable to true if using storefront controllers otherwise false if using storefront pipelines
 * 
 * @returns {Boolean}
 */
function isStorefrontControllers() {
    var useControllers = true;
    return useControllers;
}

/**
 * sendMail - send email to the request user
 * 
 * @param template
 * @param mailTo
 * @param mailFrom
 * @param mailSubject
 */
function sendMail(template, mailTo, mailFrom, mailSubject) {
    var template = new dw.util.Template(template);

    var o = new dw.util.HashMap();
    o.put("CurrentHttpParameterMap", request.httpParameterMap);

    var content = template.render(o);
    var mail = new dw.net.Mail();
    mail.addTo(mailTo);
    mail.setFrom(mailFrom);
    mail.setSubject(mailSubject);
    mail.setContent(content);

    mail.send();
}

/**
 * SaveFile - saves the supplied file (in the POST body) to the IMPEX
 * directory
 */
function SaveFile() {
	var fileSaved = SaveUploadedFile.saveFile(request.httpParameterMap);
	if (fileSaved == true) {
		ISML.renderTemplate('responses/eafilesavedjson');
	} else {
		ISML.renderTemplate('responses/eafilesaveerrorjson');
	}

}


/*
 * Web exposed methods
 */
exports.EmailConsoleLog = guard.ensure([ 'https', 'post' ], EmailConsoleLog);
exports.LogAndEmailError = guard.ensure([ 'https', 'post' ], LogAndEmailError);
exports.SaveFile = guard.ensure([ 'https', 'post' ], SaveFile);
exports.GetAuthenticationToken = guard.ensure(['https','post'], GetAuthenticationToken);

/*
 * Public Methods
 */
exports.ExtractRequestObject = ExtractRequestObject;
exports.ValidateSession = ValidateSession;
exports.UpdateProductMessages = UpdateProductMessages;
exports.isStorefrontControllers = isStorefrontControllers;
exports.sendMail = sendMail;
