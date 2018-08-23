/**
 * ©2015-2018 salesforce.com, inc. All rights reserved.
 * 
 * salesReportLoadConfirmation.js
 * 
 * This js file should be loaded first along with any report isml file. 
 * It contains the function the helps the IOS client webview determine if the server call was successful
 *
 */

/**
 * this function is called by IOS client to determine if the the page (or this script file) is loaded or not
 * 
 * @returns {String}
 */
function isPageLoaded() {
    return "true";
}
