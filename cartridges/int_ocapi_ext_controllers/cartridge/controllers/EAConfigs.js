'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller that obtains the CFG settings from Site Preferences and store custom attributes for Alloy.CFG in EA
 * 
 * @module controllers/EAConfigs
 */
/* API Includes */
var ISML = require('dw/template/ISML');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var GetSettings = require('int_ocapi_ext_core/cartridge/scripts/actions/GetSettings');
var GetKioskSettings = require('int_ocapi_ext_core/cartridge/scripts/actions/GetKioskSettings');

var EAUtils = require('~/cartridge/controllers/EAUtils');

/**
 * GetCFGSettings - It loads the configurations of the application from server based on the storeId.
 */
function GetCFGSettings() {
    var storeId = request.httpParameterMap.store_id.value;
    var configSettings = GetSettings.getSettings(storeId);
    if (configSettings.ErrorMessage) {
        ISML.renderTemplate('responses/eainvaliddevicejson', {
            outputStr : configSettings.ErrorMessage
        });
    } else {
        ISML.renderTemplate('responses/json', {
            JSONResponse : configSettings.JSONResponse
        });
    }
}

/**
 * GetKioskCFGSettings - Loads the kiosk configurations of the application from server based on the
 * storeId.
 */
function GetKioskCFGSettings() {
    if (!EAUtils.ValidateSession()) {
        return;
    }

    var storeId = request.httpParameterMap.store_id.value;
    var kioskSettings = GetKioskSettings.getKioskSettings(storeId);
    if (kioskSettings.ErrorMessage) {
        ISML.renderTemplate('responses/eainvaliddevicejson', {
            outputStr : kioskSettings.ErrorMessage
        });
    } else {
        ISML.renderTemplate('responses/json', {
            JSONResponse : kioskSettings
        });
    }
}

/*
 * Web exposed methods
 */
exports.GetCFGSettings = guard.ensure([ 'get' ], GetCFGSettings);
exports.GetKioskCFGSettings = guard.ensure([ 'get' ], GetKioskCFGSettings);
