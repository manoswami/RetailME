/**
 * ©2017-2018 salesforce.com, inc. All rights reserved.
 * 
 * users_hook_scripts.js
 * 
 * Handles OCAPI hooks for users
 */

importPackage(dw.object);
importPackage(dw.util);
importPackage(dw.system);
importPackage(dw.net);
importPackage(dw.web);

var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var HashMap = require('dw/util/HashMap');

/**
 * the afterPATCH hook - called after setting a password on the user
 * 
 * @param login - the login of the user
 * @param email - the email address of the user
 * @return status
 */
exports.afterPATCH = function (login, email) {
    var log = Logger.getLogger("instore-audit-trail");
    log.info("users_hook_scripts: afterPATCH entering script");
    
    var template = new Template("mail/passwordupdated.isml");
    var map = new HashMap();
    map.put("hostname", Site.current.httpHostName);
    map.put("login", login);
    var content = template.render(map);
    var mail = new Mail();
    mail.addTo(email);
    // no access to current site so can't read the "customerServiceEmail" custom preference
    mail.setFrom("no-reply@salesforce.com");
    mail.setSubject(Resource.msg("passwordupdated.subject", "account", null));
    mail.setContent(content);

    var result = mail.send();// returns either Status.ERROR or Status.OK, mail might not be sent yet, when this method returns
    if (result.status == Status.ERROR) {
        log.info("users_hook_scripts sendMail: failure to send email");
    } else {
        log.info("users_hook_scripts sendMail: send mail success");
    }
    log.info("users_hook_scripts: afterPATCH exiting script");
    return new Status(Status.OK);
};
