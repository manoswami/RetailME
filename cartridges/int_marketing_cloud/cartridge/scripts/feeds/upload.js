'use strict';

/**
 * @module feeds/upload
 */

/**
 * @type {dw/io/File|dw.io.File}
 */
const File = require('dw/io/File');
/**
 * @type {dw/svc/ServiceRegistry|dw.svc.ServiceRegistry}
 */
const ServiceRegistry = require('dw/svc/ServiceRegistry');
/**
 * @type {dw/system/Status|dw.system.Status}
 */
const Status = require('dw/system/Status');

function sftpUpload(params, stepExecution) {
    /**
     * @type {dw/svc/FTPService|dw.io.FTPService}
     */
    var sftpService = registerSFTP(params.SFTPServiceID);
    var siteID = require('dw/system/Site').current.ID;
    var dirName = File.IMPEX + File.SEPARATOR + 'mccfeeds' + File.SEPARATOR + siteID;
    var exportFile = new File(dirName + File.SEPARATOR + params.ExportFileName);

    var returnStatus;
    try {
        var uploadStatus = sftpService.call({exportFile: exportFile, filename: siteID +'_'+ params.ExportFileName});
        if (uploadStatus.ok) {
            returnStatus = new Status(Status.OK);
        } else {
            returnStatus = new Status(Status.ERROR, uploadStatus.status, uploadStatus.errorMessage);
        }
    } catch (e) {
        returnStatus = new Status(Status.ERROR, 'EXCEPTION', e.toString());
    }
    return returnStatus;
}

/**
 * @param {string} serviceID
 * @returns {dw/svc/FTPService|dw.io.FTPService}
 */
function registerSFTP(serviceID) {
    ServiceRegistry.configure(serviceID, {
        createRequest: function (svc, params) {
            svc.setOperation('putBinary', '/Import/'+params.filename, params.exportFile);
        },
        parseResponse: function (svc, uploadStatus) {
            return uploadStatus;
        },
        mockCall: function (svc, params) {}
    });

    return ServiceRegistry.get(serviceID);
}

exports.sftpUpload = sftpUpload;