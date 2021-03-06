'use strict';

/**
 * @module communication/customerService
 */

var sendTrigger = require('./util/send').sendTrigger;
var hookPath = 'app.communication.customerService.';

/**
 * Trigger a customer service notification
 * @param {SynchronousPromise} promise
 * @param {module:communication/util/trigger~CustomerNotification} data
 * @returns {SynchronousPromise}
 */
function contactUs(promise, data) {
    return sendTrigger(hookPath + 'contactUs', promise, data, customFromTo);
}

/**
 * Override the trigger message from/to values
 * @param {module:models/trigger~Trigger} trigger
 * @param {module:communication/util/trigger~CustomerNotification} data
 */
function customFromTo(trigger, data) {
    trigger.message.from.name = data.params.CurrentForms.contactus.firstname.value +' '+ data.params.CurrentForms.contactus.lastname.value;
}

/**
 * Declares attributes available for data mapping configuration
 * @returns {Object} Map of hook function to an array of strings
 */
function triggerDefinitions() {
    return {
        contactUs: {
            description: 'Contact Us trigger',
            attributes: [
                'CurrentForms.contactus.myquestion',
                'CurrentForms.contactus.firstname',
                'CurrentForms.contactus.lastname',
                'CurrentForms.contactus.email',
                'CurrentForms.contactus.phone',
                'CurrentForms.contactus.ordernumber',
                'CurrentForms.contactus.comment'
            ]
        }
    };
}

module.exports = require('dw/system/HookMgr').callHook(
    'app.communication.handler.initialize',
    'initialize',
    require('./handler').handlerID,
    'app.communication.customerService',
    {
        contactUs: contactUs
    }
);

// non-hook exports
module.exports.triggerDefinitions = triggerDefinitions;