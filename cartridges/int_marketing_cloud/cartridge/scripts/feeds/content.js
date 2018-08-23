'use strict';

/**
 * @module feeds/content
 */

/**
 * @type {dw/content/ContentMgr|dw.content.ContentMgr}
 */
const ContentMgr = require('dw/content/ContentMgr');

/**
 * @type {module:models/export~Export}
 */
const Export = require('../models/export');

/**
 * @type {module:models/export~Export}
 */
var exportModel;

/**
 * Recursive folder iterator
 * Yields instances of Content
 * @param {dw/content/Folder|dw.content.Folder} folder
 */
function folderIterator(folder) {
    if (folder.isOnline()) {
        var outerIter = folder.getOnlineContent().iterator();
        while (outerIter.hasNext()) {
            yield outerIter.next();
        }
        outerIter = folder.getOnlineSubFolders().iterator();
        var innerIter;
        while (outerIter.hasNext()) {
            innerIter = folderIterator(outerIter.next());
            while(innerIter !== null) {
                try {
                    yield innerIter.next();
                } catch(e) {
                    if (e instanceof StopIteration) {
                        innerIter = null;
                    } else {
                        // re-throw
                        throw e;
                    }
                }
            }
        }
    }
}

function beforeStep(parameters, stepExecution) {
    exportModel = new Export(parameters, function(em){
        return folderIterator(ContentMgr.siteLibrary.root);
    });
    exportModel.writeHeader();
}

// no count available
/*function getTotalCount(parameters, stepExecution) {
    return exportModel.dataIterator.getCount();
}*/

function read(parameters, stepExecution) {
    return exportModel.readNext();
}

/**
 * @param {dw/content/Content|dw.content.Content} content
 * @param parameters
 * @param stepExecution
 * @returns {void|Array}
 */
function process(content, parameters, stepExecution) {
    var skip = false;
    if (exportModel.isIncremental) {
        if (content.lastModified < exportModel.lastExported) {
            skip = true;
        }
    }
    if (!skip) {
        var data = {
            Content: content,
            ContentLink: require('dw/web/URLUtils').abs('Page-Show','cid', content.getID())
        };
        return exportModel.buildRow(data);
    }
}

function write(lines, parameters, stepExecution) {
    for (var i = 0; i < lines.size(); i++) {
        exportModel.writeRow(lines.get(i));
    }
}

function afterStep(success, parameters, stepExecution) {
    exportModel.close();
}

module.exports = {
    beforeStep: beforeStep,
    //getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};