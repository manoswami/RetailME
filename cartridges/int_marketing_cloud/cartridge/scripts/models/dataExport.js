'use strict';

/**
 * @module models/dataExport
 */

/**
 * Custom object name
 * @const {string}
 * @private
 */
var customObjectName = 'MarketingCloudDataExport';
var helpers = require('./util/helpers');

/**
 * DataExport constructor
 * @param {string} exportID
 * @constructor
 * @alias module:models/dataExport~DataExport
 */
function DataExport(exportID) {
    /**
     * The export ID
     * @type {string}
     */
    this.exportID = exportID;
    /**
     * Definition object
     * @type {dw/object/CustomAttributes|dw.object.CustomAttributes}
     */
    this.definition = helpers.getCustomObject(customObjectName, exportID);
    /**
     * Expanded attributes from dataExport definition
     * @type {Object}
     */
    this.attributes = helpers.expandAttributes(this.definition.exportAttributes);
    /**
     * Array header (attributes object values)
     * @type {Array}
     */
    this.header = null;

    var DataExportStatus = require('./dataExportStatus');
    /**
     * @type {DataExportStatus}
     */
    this.lastExportStatus = new DataExportStatus(exportID);

    this._buildHeader();
}

DataExport.prototype = {
    _buildHeader: function _buildHeader() {
        var objToStr = function(obj) {
            if (helpers.isObject(obj) && obj.hasOwnProperty('label')) {
                return obj.label;
            }
            return obj;
        };
        // reset the header
        this.header = [];
        helpers.objValues(this.attributes).forEach(function(v){
            if (Array.isArray(v)) {
                // push contents of second array onto first
                Array.prototype.push.apply(this.header, v.map(objToStr).filter(helpers.isNonEmptyString));
            } else {
                v = objToStr(v);
                if (helpers.isNonEmptyString(v)) {
                    this.header.push(v);
                }
            }
        }, this);
    },

    buildRow: function buildRow(data) {
        var missingRequired = false;
        var rowVal = [];
        data.SiteID = require('dw/system/Site').current.ID;
        helpers.mapValues(this.attributes, data, function(key, val){
            if (typeof(val) === 'function') {
                val = val(key, data);
            }
            if (helpers.isObject(key)) {
                if ('required' in key && key.required && empty(val)) {
                    missingRequired = true;
                    return;
                }
                if ('type' in key) {
                    switch(key.type) {
                        case 'bool':
                            val = val ? 'Y' : 'N';
                            break;
                        default:
                            // no change
                            break;
                    }
                }
            }
            if (typeof(val) === 'string') {
                // remove line breaks, otherwise MC complains, despite correct quoting.
                val = val.replace(/(\r\n|\n|\r)/gm,' ');
            }
            rowVal.push(val);
        });
        if (!missingRequired) {
            return rowVal;
        }
    },

    markExported: function markExported() {
        this.lastExportStatus.markExported();
    }
};

module.exports = DataExport;
