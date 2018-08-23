'use strict';

/**
 * @module feeds/catalog
 */

/**
 * @type {dw/catalog/ProductMgr|dw.catalog.ProductMgr}
 */
const ProductMgr = require('dw/catalog/ProductMgr');

/**
 * @type {module:models/export~Export}
 */
const Export = require('../models/export');

/**
 * @type {module:models/export~Export}
 * @see https://help.marketingcloud.com/en/documentation/personalization_builder/personalization_builder_prerequisites/catalog/add_attributes/
 */
var exportModel;

function beforeStep(parameters, stepExecution) {
    exportModel = new Export(parameters, function(em){
        return ProductMgr.queryAllSiteProducts();
    });
    exportModel.writeHeader();
}

function getTotalCount(parameters, stepExecution) {
    return exportModel.dataIterator.getCount();
}

function read(parameters, stepExecution) {
    return exportModel.readNext();
}

function imageLink(cfg, data) {
    if (cfg.hasOwnProperty('imageType')) {
        var img = data.Product.getImage(cfg.imageType);
        if (img) {
            return img.absURL.https();
        }
    }
}

function standardPrice(cfg, data) {
    var Money = require('dw/value/Money');
    var stdPrice = Money.NOT_AVAILABLE;

    if (!empty(data.Product.priceModel)) {
        if (!data.Product.priceModel.price.available) {
            stdPrice = Money.NOT_AVAILABLE;
        } else {
            var priceBook = data.Product.priceModel.priceInfo.priceBook;

            while (priceBook.parentPriceBook) {
                priceBook = priceBook.parentPriceBook ? priceBook.parentPriceBook : priceBook;
            }

            stdPrice = data.Product.priceModel.getPriceBookPrice(priceBook.ID);
        }
    }

    return stdPrice.decimalValue;
}

/**
 * @param {dw/catalog/Product|dw.catalog.Product} product
 * @param parameters
 * @param stepExecution
 * @returns {void|Array}
 */
function process(product, parameters, stepExecution) {
    var skip = false;
    if (exportModel.isIncremental) {
        if (product.lastModified < exportModel.lastExported) {
            skip = true;
        }
    }
    if (!product.isOnline() || product.isMaster()) {
        skip = true;
    }
    if (!skip) {
        var data = {
            Product: product,
            //ProductLink: require('dw/web/URLUtils').abs('Product-Show', 'pid', product.ID).https(),
            ProductLink:"",
            ImageLink: imageLink,
            StandardPrice: standardPrice
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
    getTotalCount: getTotalCount,
    read: read,
    process: process,
    write: write,
    afterStep: afterStep
};