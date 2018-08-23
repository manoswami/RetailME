'use strict';

/**
 * @module models/export
 */

/**
 * @type {dw/io/File|dw.io.File}
 */
const File = require('dw/io/File');
/**
 * @type {dw/io/FileWriter|dw.io.FileWriter}
 */
const FileWriter = require('dw/io/FileWriter');
/**
 * @type {dw/io/CSVStreamWriter|dw.io.CSVStreamWriter}
 */
const CSVStreamWriter = require('dw/io/CSVStreamWriter');

/**
 * @constructor
 * @param {object} params
 * @param {Function} iteratorCallback
 * @alias module:models/export~Export
 */
function Export(params, iteratorCallback) {
    var siteID = require('dw/system/Site').current.ID;
    var dirName = File.IMPEX + File.SEPARATOR + 'mccfeeds' + File.SEPARATOR + siteID;
    // ensure dirpath exists
    (new File(dirName)).mkdirs();

    /**
     * @type {module:models/dataExport~DataExport}
     * @private
     */
    this._model = require('int_marketing_cloud').dataExport(params.ExportID);
    /**
     * @type {dw/io/File|dw.io.File}
     * @private
     */
    this._file = new File(dirName + File.SEPARATOR + params.ExportFileName);
    /**
     * @type {dw/io/FileWriter|dw.io.FileWriter}
     * @private
     */
    this._fileWriter = new FileWriter(this._file);
    /**
     * @type {dw/io/CSVStreamWriter|dw.io.CSVStreamWriter}
     * @private
     */
    this._csvWriter = new CSVStreamWriter(this._fileWriter, params.Delimiter === 'TAB' ? '\t' : params.Delimiter);
    /**
     * @type {boolean}
     */
    this.isIncremental = params.IncrementalExport;
    /**
     * @type {Date}
     */
    this.lastExported = this._model.lastExportStatus.lastExported;
    /**
     * @type {Array}
     */
    this.header = this._model.header;
    /**
     * @type {dw/util/Iterator|dw.util.Iterator|Iterator}
     */
    this.dataIterator = iteratorCallback(this);
}

Export.prototype = {
    writeHeader: function writeHeader() {
        this._csvWriter.writeNext(this.header);
    },

    /**
     * Reads next record, void return when reading is complete
     * @returns {void|*}
     */
    readNext: function readNext() {
        if (this.dataIterator instanceof require('dw/util/Iterator')) {
            if (this.dataIterator.hasNext()) {
                return this.dataIterator.next();
            }
        } else {
            try {
                return this.dataIterator.next();
            } catch(e) {
                if (e instanceof StopIteration) {
                    // end of iteration, do nothing
                } else {
                    // re-throw
                    throw e;
                }
            }
        }
    },

    /**
     * Translates object into an array of mapped values
     * @param {Object} data
     * @returns {Array<String>}
     */
    buildRow: function buildRow(data) {
        return this._model.buildRow(data);
    },

    /**
     * Writes array of data to file
     * @param {dw/util/ArrayList|dw.util.ArrayList} data
     */
    writeRow: function writeRow(data) {
        // interestingly, DW logic apparently converts native array to ArrayList...
        this._csvWriter.writeNext(data.toArray());
    },

    close: function close() {
        this._csvWriter.close();
        this._fileWriter.close();
        this.dataIterator.close();
        this._model.markExported();
    }
};

module.exports = Export;