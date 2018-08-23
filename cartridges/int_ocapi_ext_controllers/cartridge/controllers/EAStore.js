'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller for store related operations
 * 
 * @module controllers/EAStore
 */

/* API Includes */
var ISML = require('dw/template/ISML');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var ValidateDevices = require('int_ocapi_ext_core/cartridge/scripts/actions/ValidateDevice');
var GetAllStores = require('int_ocapi_ext_core/cartridge/scripts/actions/GetStores');

/* Controller Includes */
var EAUtils = require('~/cartridge/controllers/EAUtils');

/**
 * ValidateDevice - Uses the supplied storeId to validate the store's credentials. It can be extended to check for specfic device serial numbers, MAC addresses, etc (but does not in the base reference
 * application).
 */
function ValidateDevice() {
    var validDevice = ValidateDevices.validateDevice(request.httpParameterMap.card_reader_serial_number.stringValue, request.httpParameterMap.store_id.stringValue,
            request.httpParameterMap.tablet_serial_number.stringValue);
    if (validDevice.ErrorMessage) {
        ISML.renderTemplate('responses/eainvaliddevicejson', {
            outputStr : validDevice.ErrorMessage
        });
    } else {
        ISML.renderTemplate('responses/eavaliddevicejson');
    }
}

/**
 * ValidateDeviceInSession - Validates if the device is in session
 * 
 * @returns Session
 */
function ValidateDeviceInSession() {
    if (!session.custom.validDevice) {
        ISML.renderTemplate('responses/eadevicestatusinsessionjson');
        return;
    }
    return session;
}

/**
 * GetCountriesStates - Loops over the site's countries (as found in the 'customeraddress' form) and returns the country names, codes, and lists of any states (or provinces) associated with that
 * country (as found in the 'states' form)
 */
function GetCountriesStates() {
    ISML.renderTemplate('responses/countriesstatesjson', {
        CurrentForms : session.forms
    });
}

/**
 * GetStores - returns the list of store ids available to connect to for EA.
 */
function GetStores() {
    var stores = GetAllStores.getStores();
    ISML.renderTemplate('responses/json', {
        JSONResponse : stores.JSONResponse
    });
}

/*
 * Web exposed methods
 */
exports.ValidateDevice = guard.ensure([ 'https', 'post' ], ValidateDevice);
exports.GetCountriesStates = guard.ensure([ 'get', 'https' ], GetCountriesStates);
exports.GetStores = guard.ensure([ 'get', 'https' ], GetStores);
/*
 * Public Methods
 */
exports.ValidateDeviceInSession = ValidateDeviceInSession;
