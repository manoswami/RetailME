'use strict';

/**
 * @module models/util/helpers
 */

/**
 * Checks if submitted value type is an Object (and not an Array)
 * @param {*} obj Object to be checked
 * @returns {boolean}
 * @static
 */
function isObject(obj) {
    return typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Uppercases first char of string
 * @param {string} str String to uppercase
 * @returns {string}
 * @static
 */
function ucfirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns an object's preferred value, based on what DW object type it represents
 * @param {*} obj Object to use for value return
 * @returns {*}
 * @static
 */
function dwValue(obj) {
    if (empty(obj) || !isObject(obj)) {
        return obj;
    }

    if (obj instanceof Date) {
        // convert Date to Calendar in current instance timezone
        obj = new (require('dw/util/Calendar'))(obj);
        obj.setTimeZone(require('dw/system/Site').getCurrent().getTimezone());
    }

    if (obj instanceof (require('dw/web/FormField'))) {
        return obj.value;
    } else if (obj instanceof (require('dw/value/EnumValue'))) {
        return obj.displayValue;
    } else if (obj instanceof (require('dw/value/Money'))) {
        return require('dw/util/StringUtils').formatMoney(obj);
    } else if (obj instanceof (require('dw/util/Decimal'))) {
        return obj.valueOf();
    } else if (obj instanceof (require('dw/util/Calendar'))) {
        return require('dw/util/StringUtils').formatCalendar(obj, 'MM/dd/y hh:mm:ss a');
    } else if (obj instanceof (require('dw/util/Collection'))) {
        return obj.toArray();
    } else if (obj instanceof (require('dw/content/MarkupText'))) {
        return obj.markup;
    } else if (obj instanceof (require('dw/web/URL'))) {
        return obj.toString();
    }

    return obj;
}

/**
 * Expands JSON attributes
 * @param {string} attrJSON
 * @returns {Object}
 */
function expandAttributes(attrJSON) {
    var attributes;
    try {
        attributes = attrJSON ? JSON.parse(attrJSON) : {};
    } catch(e) {
        // Catch exception from invalid JSON
        require('dw/system/Logger').error('Error parsing JSON attributes: {0}', e);
        attributes = {};
    }
    return attributes;
}

/**
 * Fetches object definition from Custom Object, creating it if not exists
 * @param {string} customObjectName
 * @param {string} objectID
 * @returns {dw/object/CustomAttributes|dw.object.CustomAttributes}
 */
function getCustomObject(customObjectName, objectID) {
    var com = require('dw/object/CustomObjectMgr'),
        objectDefinition = com.getCustomObject(customObjectName, objectID);
    if (empty(objectDefinition)) {
        require('dw/system/Transaction').wrap(function(){
            objectDefinition = com.createCustomObject(customObjectName, objectID);
        });
    }
    return objectDefinition.getCustom();
}

/**
 * Merges attribute JS objects in place, preserving old values
 * @param {Object} newAttributes
 * @param {Object} oldAttributes
 */
function mergeAttributes(newAttributes, oldAttributes) {
    if (oldAttributes) {
        for (var attribute in oldAttributes) {
            if (oldAttributes.hasOwnProperty(attribute)) {
                newAttributes[attribute] = oldAttributes[attribute];
            }
        }
    }
}

/**
 * Returns parameter value from data (uses recursion)
 * @param {string} attr Period-delimited path to a parameter
 * @param {Object} data
 * @returns {*}
 */
function getParamValue(attr, data) {
    var value;
    var attrs = attr.split('.');
    var obj = data;
    attrs.forEach(function(k, i, arr){
        if (empty(obj) || !isObject(obj)) {
            value = obj;
            return;
        }

        if (i === 0) {
            if (k !== 'params' && k in obj) {
                obj = obj[k];
            } else if ('params' in obj && obj.params.hasOwnProperty(k)) {
                obj = obj.params[k];
            }
        } else {
            if (k in obj) {
                obj = obj[k];
            }
        }
        if (i === arr.length-1) {
            value = dwValue(obj);
        }
    });
    return value;
}

/**
 * Handles object key/value mapping, writes to callback that accepts key and value as params
 * @param {Object} obj Keys serve as the value path, Values serve as the key to be written to
 * @param {Object} data Source of data that should fulfill provide values to be mapped
 * @param {Function} outputCallback
 */
function mapValues(obj, data, outputCallback) {
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr) && !empty(obj[attr])) {
            if (Array.isArray(obj[attr])) {
                obj[attr].forEach(function(a){
                    outputCallback(a, getParamValue(attr, data));
                });
            } else {
                outputCallback(obj[attr], getParamValue(attr, data));
            }
        }
    }
}

/**
 * Return object values as an array
 * @param {Object} obj
 * @returns {Array}
 */
function objValues(obj) {
    var arr = [];
    for (var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k]) {
            arr.push(obj[k]);
        }
    }
    return arr;
}

/**
 * @param {*} str
 * @returns {boolean}
 */
function isNonEmptyString(str) {
    return typeof(str) === 'string' && str !== '';
}

exports.isObject = isObject;
exports.ucfirst = ucfirst;
exports.dwValue = dwValue;
exports.expandAttributes = expandAttributes;
exports.getCustomObject = getCustomObject;
exports.mergeAttributes = mergeAttributes;
exports.getParamValue = getParamValue;
exports.mapValues = mapValues;
exports.objValues = objValues;
exports.isNonEmptyString = isNonEmptyString;