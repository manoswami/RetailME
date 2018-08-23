'use strict';

/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * Controller to render the sales reports
 * 
 * @module controllers/EAReports
 */

/* API Includes */
var ISML = require('dw/template/ISML');

var OrderMgr = require('dw/order/OrderMgr');

/* Script Modules */
var guard = require('app_storefront_controllers/cartridge/scripts/guard');
var FilterOrdersForSalesReportAndQuickStats = require('int_ocapi_ext_core/cartridge/scripts/actions/reports/FilterOrdersForSalesReportAndQuickStats');
var FilterOrdersForProductsSoldReport = require('int_ocapi_ext_core/cartridge/scripts/actions/reports/FilterOrdersForProductsSoldReport');
var FilterOrdersForRankingReports = require('int_ocapi_ext_core/cartridge/scripts/actions/reports/FilterOrdersForRankingReports');
var EASalesReportUtils = require('int_ocapi_ext_core/cartridge/scripts/util/EASalesReportUtils.ds');

/* Controller Includes */
var EAUtils = require('~/cartridge/controllers/EAUtils');

/* Object Includes */
var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

/**
 * Sales - Main Report. Transform queried orders into, JSON ready data (orders, associates list and quick stats)
 */
function Sales() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var CurrentHttpParameterMap = request.httpParameterMap;
    var employeeId = CurrentHttpParameterMap.employeeId.stringValue;
    var filteredOrders;
    if (employeeId && session.custom.country) {
        filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} AND custom.eaEmployeeId={2} and custom.eaStoreId = {3} and channelType = {4} and custom.eaCountry = {5}', 'creationDate asc',
                CurrentHttpParameterMap.dateFrom.stringValue, CurrentHttpParameterMap.dateTo.stringValue, CurrentHttpParameterMap.employeeId.stringValue, CurrentHttpParameterMap.storeId.stringValue,
                dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    } else {
        filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} and custom.eaStoreId = {2} and channelType = {3} and custom.eaCountry = {4}', 'creationDate asc',
                CurrentHttpParameterMap.dateFrom.stringValue, CurrentHttpParameterMap.dateTo.stringValue, CurrentHttpParameterMap.storeId.stringValue, dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    }
    var filteredOrdersForSales = FilterOrdersForSalesReportAndQuickStats.filterOrdersForQuickStats(CurrentHttpParameterMap, filteredOrders);
    if (!filteredOrdersForSales.ErrorMessage) {
        ISML.renderTemplate('reports/salesReport', {
            CurrentHttpParameterMap : CurrentHttpParameterMap,
            localizedStrings : JSON.stringify(filteredOrdersForSales.localizedStrings, null, '\t'),
            orderData : JSON.stringify(filteredOrdersForSales.orderData, null, '\t')
        });
    } else {
        ISML.renderTemplate('reports/EAReportError');
    }

}

/**
 * ItemSold - Provide JSON ready data from queried orders, to be organized by categories down to products.
 */
function ItemsSold() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var employeeId = request.httpParameterMap.employeeId.stringValue;
    var CurrentHttpParameterMap = request.httpParameterMap;
    if (employeeId) {
        filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} AND custom.eaEmployeeId={2} and custom.eaStoreId = {3} and channelType = {4} and custom.eaCountry = {5}', 'creationDate asc',
                CurrentHttpParameterMap.dateFrom.stringValue, CurrentHttpParameterMap.dateTo.stringValue, CurrentHttpParameterMap.employeeId.stringValue, CurrentHttpParameterMap.storeId.stringValue,
                dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    } else {
        filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} and custom.eaStoreId = {2} and channelType = {3} and custom.eaCountry = {4}', 'creationDate asc',
                CurrentHttpParameterMap.dateFrom.stringValue, CurrentHttpParameterMap.dateTo.stringValue, CurrentHttpParameterMap.storeId.stringValue, dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    }
    var filteredOrdersForProduct = FilterOrdersForProductsSoldReport.filterOrdersForProductsSoldReport(filteredOrders);
    if (!filteredOrdersForProduct.ErrorMessage) {
        ISML.renderTemplate('reports/itemsSoldReport', {
            CurrentHttpParameterMap : CurrentHttpParameterMap,
            localizedStrings : JSON.stringify(filteredOrdersForProduct.localizedStrings, null, '\t'),
            orderData : JSON.stringify(filteredOrdersForProduct.orderData, null, '\t')
        });
    } else {
        ISML.renderTemplate('reports/EAReportError');
    }

}

/**
 * AssociatesRanking - Provide JSON ready data from queried orders, to be organized by highest to lowest sales per associate.
 */
function AssociatesRanking() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var CurrentHttpParameterMap = request.httpParameterMap;
    var filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} AND custom.eaStoreId = {2} AND channelType = {3} and custom.eaCountry = {4}', 'creationDate asc',
            CurrentHttpParameterMap.dateFrom.stringValue, CurrentHttpParameterMap.dateTo.stringValue, CurrentHttpParameterMap.storeId.stringValue, dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    var filteredOrdersForRanking = FilterOrdersForRankingReports.filterOrderForRanking(filteredOrders);

    filteredOrdersForRanking.orderData.storeEmployees = EASalesReportUtils.getAllAssociatesFromStore(CurrentHttpParameterMap.storeId.stringValue);
    if (!filteredOrdersForRanking.ErrorMessage) {
        ISML.renderTemplate('reports/associateRankingReport', {
            CurrentHttpParameterMap : CurrentHttpParameterMap,
            localizedStrings : JSON.stringify(filteredOrdersForRanking.localizedStrings, null, '\t'),
            orderData : JSON.stringify(filteredOrdersForRanking.orderData, null, '\t')
        });
    } else {
        ISML.renderTemplate('reports/EAReportError');
    }

}

/**
 * StoresRanking - Provide JSON ready data from queried orders, to be organised by highest to lowest sales by store.
 */
function StoresRanking() {
    if (!EAUtils.ValidateSession()) {
        return;
    }
    var CurrentHttpParameterMap = request.httpParameterMap;
    var StoreAssociates = CustomObjectMgr.getAllCustomObjects('storeAssociates');
    var Stores = SystemObjectMgr.querySystemObjects('Store', '', 'name desc');
    var filteredOrders = OrderMgr.searchOrders('creationDate >= {0} AND creationDate <= {1} AND channelType = {2} and custom.eaCountry = {3}', 'creationDate asc', CurrentHttpParameterMap.dateFrom.stringValue,
            CurrentHttpParameterMap.dateTo.stringValue, dw.order.LineItemCtnr.CHANNEL_TYPE_DSS, session.custom.country);
    var filteredOrdersForRanking = FilterOrdersForRankingReports.filterOrderForRanking(filteredOrders);
    if (!filteredOrdersForRanking.ErrorMessage) {
        ISML.renderTemplate('reports/storeRankingReport', {
            CurrentHttpParameterMap : CurrentHttpParameterMap,
            localizedStrings : JSON.stringify(filteredOrdersForRanking.localizedStrings, null, '\t'),
            orderData : JSON.stringify(filteredOrdersForRanking.orderData, null, '\t'),
            allStoreAssociates : StoreAssociates,
            allStores : Stores
        });
    } else {
        ISML.renderTemplate('reports/EAReportError');
    }
}

/*
 * Web exposed methods
 */
exports.Sales = guard.ensure([ 'https', 'get' ], Sales);
exports.ItemsSold = guard.ensure([ 'get', 'https' ], ItemsSold);
exports.AssociatesRanking = guard.ensure([ 'get', 'https' ], AssociatesRanking);
exports.StoresRanking = guard.ensure([ 'get', 'https' ], StoresRanking);
