/**
 * ©2016-2018 salesforce.com, inc. All rights reserved.
 * 
 * EASalesReportUtils.js - contains function helpers for generating data to be displayed as chart
 *
 */

/**
 * get number of years to section the order data into based on globals dateTo and dateFrom would return something like this [2013,2014,2015]
 * 
 * @returns {Object} [2013,2014,2015]
 */
function getYearFilters() {
    var yearArray = [];
    var endYear = dateTo.getFullYear(), startYear = dateFrom.getFullYear();

    if (endYear - startYear <= 0) {
        yearArray.push(startYear);
    } else {
        var range = endYear - startYear;
        for (var idx = 0; idx <= range; idx++) {
            yearArray.push(startYear + idx);
        }
    }

    return yearArray;
}

/**
 * get number of months to section the order data into based on globals dateTo and dateFrom would return something like this [1,2,3] months ranges from 1-12
 * 
 * @returns {Object} [1,2,3]
 */
function getMonthFilters() {
    var monthArray = [];
    var endMonth = dateTo.getMonth() + 1, startMonth = dateFrom.getMonth() + 1;

    if (endMonth - startMonth <= 0) {
        monthArray.push(startMonth);
    } else {
        var range = endMonth - startMonth;
        for (var idx = 0; idx <= range; idx++) {
            monthArray.push(startMonth + idx);
        }
    }

    return monthArray;
}

/**
 * get number of days to section the order data into based on globals dateTo and dateFrom would return something like this [1,2,3] days ranges from 1-31
 * 
 * @returns {Object} [1,2,3]
 */
function getDayFilters() {
    var dayArray = [];
    var endDay = dateTo.getDate(), startDay = dateFrom.getDate();

    if (endDay - startDay <= 0) {
        dayArray.push(startDay);
    } else {
        var range = endDay - startDay;
        for (var idx = 0; idx <= range; idx++) {
            dayArray.push(startDay + idx);
        }
    }

    return dayArray;
}

/**
 * determine whether report should be broken down into days
 * 
 * @returns {Boolean}
 */
function isDayBreakDown() {

    var yearFilters = getYearFilters();

    if (yearFilters.length == 1) { // if within same year
        var endMonth = dateTo.getMonth(), startMonth = dateFrom.getMonth();
        if (endMonth - startMonth <= 2) { // and month range is less or equal
            // to 2
            return true;
        }
    }
    return false;
}

/**
 * determine whether report should be broken down into hours
 * 
 * @returns {Boolean}
 */
function isHourBreakDown() {

    if (isDayBreakDown()) {
        var endMonth = dateTo.getMonth(), startMonth = dateFrom.getMonth(), endDay = dateTo.getDate(), startDay = dateFrom.getDate();
        if (endMonth - startMonth == 0 && endDay - startDay >= 0 && endDay - startDay < 2) {
            // if same month and same day
            return true;
        }
    }
    return false;
}

/**
 * generate report data by months
 * 
 * @param {Object} dataArray - collection sales data or order
 * @returns {Object} sales report data by months
 */
function generateMonthlyBarChartData(dataArray) {
    var rows = [];
    var yearFilters = getYearFilters();
    yearFilters.forEach(function(currentYear) {

        for (var cMonth = 1; cMonth < 13; cMonth++) {

            var salesPerMonth = dataArray.filter(function(order) {
                var currentOrderDate = new Date(order.creationDate);
                return ((currentOrderDate.getMonth() + 1) == cMonth && currentOrderDate.getFullYear() == currentYear);
            });
            if (salesPerMonth.length > 0) {
                var lastDateString = salesPerMonth[salesPerMonth.length - 1].creationDate;
                lastDateString = lastDateString.split("-");
                lastDateString[2] = '15';
                lastDateString = lastDateString.join("-");
                var row = [ new Date(lastDateString), getTotalSales(salesPerMonth), generateTooltipContent(salesPerMonth, moment(lastDateString).format('MMMM YYYY')) ];
                rows.push(row);
            }

        }
    });
    return rows;
}

/**
 * generate report data by days
 * 
 * @param {Object} dataArray - collection sales data or order
 * @returns {Object} sales report data by days
 */
function generateDailyBarChartData(dataArray) {
    var rows = [];
    var monthFilters = getMonthFilters();
    monthFilters.forEach(function(currentMonth) {
        for (var cDay = 1; cDay < 32; cDay++) {

            var salesPerDay = dataArray.filter(function(order) {
                var currentOrderDate = new Date(order.creationDate);
                return ((currentOrderDate.getMonth() + 1) == currentMonth && currentOrderDate.getDate() == cDay);
            });

            if (salesPerDay.length > 0) {
                var lastDateString = salesPerDay[salesPerDay.length - 1].creationDate;

                var row = [ new Date(lastDateString), getTotalSales(salesPerDay), generateTooltipContent(salesPerDay, moment(lastDateString).format('LL')) ];
                rows.push(row);
            }
        }

    });
    return rows;
}

/**
 * generate report data by hours
 * 
 * @param {Object} dataArray - collection sales data or order
 * @returns {Object} sales report data by hours
 */
function generateHourlyBarChartData(dataArray) {
    var rows = [];
    var dayFilters = getDayFilters();
    dayFilters.forEach(function(currentDay) {
        for (var cHour = 0; cHour < 24; cHour++) {

            var salesPerHour = dataArray.filter(function(order) {
                var currentOrderDate = new Date(order.creationDate);
                return (currentOrderDate.getDate() == currentDay && currentOrderDate.getHours() == cHour);
            });

            if (salesPerHour.length > 0) {

                var lastDateString = salesPerHour[salesPerHour.length - 1].creationDate;

                var row = [ new Date(lastDateString), getTotalSales(salesPerHour), generateTooltipContent(salesPerHour, moment(lastDateString).format('LLL')) ];
                rows.push(row);
            }
        }

    });
    return rows;
}

/**
 * generate associates ranking reports data
 * 
 * @param {Object} storeEmployees - collection of associates to particular store
 * @param {Object} orders - collection of orders from particular store
 * @returns {Object} associates ranking reports data
 */
function generateAssociateRankingChartData(storeEmployees, orders) {
    var rows = [];
    storeEmployees.forEach(function(employee) {
        var salesPerAssociate = orders.filter(function(order) {
            return order.employeeId == employee.id;
        });
        var associateFullName = employee.firstName + " " + employee.lastName;
        var cTotalSales = Number(getTotalSales(salesPerAssociate).toFixed(2));
        if (cTotalSales > 0) {
            var row = [ associateFullName, cTotalSales, generateAssociateTooltipContent(salesPerAssociate, associateFullName) ];

            rows.push(row);
        }

    });

    rows.sort(sortChartDataRows);

    return rows;
}

/**
 * generate stores ranking reports data
 * 
 * @param {Object} storeObj - collection of stores
 * @param {Object} orders - collection of orders from all stores
 * @returns {Object} stores ranking reports data
 */

function generateStoreRankingChart(storeObj, orders) {
    var rows = [];
    for ( var storeId in storeObj) {
        var salesPerStore = orders.filter(function(order) {
            return order.storeId == storeId;
        });
        var totalSold = Number(getTotalSales(salesPerStore).toFixed(2));
        var row = [ storeObj[storeId], totalSold, generateStroreRankingTooltipContent(totalSold, storeObj[storeId]) ];

        rows.push(row);
    }
    rows.sort(sortChartDataRows);
    return rows;
}

/**
 * generate product categories reports data.
 * 
 * @param {Object} allProducts - collection of products sold
 * @param {Object} categoryTree - tree of products categories
 * @param {Number} depth - depth or level of tree to target
 * @param {String} ID - category ID
 * @param {Bolean} drilldown - find Sub categories of category ID above
 * @returns {Object} contains report data, array of same level categories IDs , and Sub categories' parent if drilldown is true
 */
function generateProductCategoriesChartData(allProducts, categoryTree, depth, ID, drilldown) {
    var categoryRow;
    if (!ID) { // if no category ID is passed get same level category from
        // categoryTree
        categoryRow = getAllSameDepthNodes(categoryTree, depth);
    } else {
        if (drilldown) {
            categoryRow = findSubcategoriesByID(categoryTree, depth, ID);
        } else {
            categoryRow = findParentCategoriesByID(categoryTree, depth, ID);
        }
    }

    var rows = [];
    var chartData = [];
    var orderedIDs = [];
    var p = allProducts;
    var totalQuantitySold = 0;
    categoryRow.forEach(function(cat) {
        var productPerCat = p.filter(function(prod) {
            var cPCats = prod.categories;
            for ( var key in cPCats) {
                var cPCat = cPCats[key];
                while (cPCat != null) {
                    if (cPCat.ID == cat.ID) {
                        return cPCat.ID == cat.ID;
                    }
                    cPCat = cPCat.child;
                }
            }
        })
        var PQSold = getTotalProductQuantitySold(productPerCat);
        var row = [ cat.name, PQSold, cat.ID ];

        rows.push(row);
    })
    rows.forEach(function(cRow) {
        totalQuantitySold += cRow[1];
    });

    rows.sort(sortChartDataRows);
    rows.forEach(function(cRow) {
        chartData.push([ cRow[0], cRow[1], generateCategoriesTooltipContent(totalQuantitySold, cRow[1], cRow[0]) ]);
        orderedIDs.push(cRow[2])
    });

    return {
        chartData : chartData,
        orderdCatIDs : orderedIDs,
        parent : (categoryRow.length > 0 ? categoryRow[0].parent : {})
    };
}

/**
 * on click generate categories tooltip html source
 * 
 * @param {Number} totalSold - total number of products sold under current category
 * @param {Number} totalSoldPerCategory - total number of products sold under category clcked on
 * @param {String} catName - name of category
 * @returns {String} html string
 */
function generateCategoriesTooltipContent(totalSold, totalSoldPerCategory, catName) {
    var percentage = '(' + ((totalSoldPerCategory * 100) / totalSold).toFixed(2) + '%)';
    return '<div  class="currentTooltip_">'
            + '<table class="">'
            + '<tr><td  class="centerText fullWidth"><p><b>'
            + catName
            + '</b></p><hr class="separator"></td></tr>'
            + '<tr><td  class="centerText fullWidth"><p>'
            + localizedStrings.totalSold
            + ': <b>'
            + totalSoldPerCategory
            + ' '
            + percentage
            + '</b></p><hr class="separator"></td></tr>'
            + '<tr><td  class="centerText fullWidth"><p style="margin-bottom:10px;"><a  class="tdButton categoryDrilldown"  style=" width:100%" onclick="drilldownEventHandler(event);" ontouchend="drilldownEventHandler(event);" >'
            + localizedStrings.show + '</a></p></td></tr>' + '</table>' + '</div>';

}
/**
 * on click generate Product tooltip html source
 * 
 * @param {Number} totalSold - total number of products sold
 * @param {String} prodName - name of Product
 * @returns {String} html string
 */
function generateProductsTooltipContent(totalSold, prodName) {

    return '<div  class="currentTooltip_">'
            + '<table class="">'
            + '<tr><td  class="centerText fullWidth"><p><b>'
            + prodName
            + '</b></p><hr class="separator"></td></tr>'
            + '<tr><td  class="centerText fullWidth"><p>'
            + localizedStrings.totalSold
            + ': <b>'
            + totalSold
            + '</b></p><hr class="separator"></td></tr>'
            + '<tr><td  class="centerText fullWidth"><p style="margin-bottom:10px;"><a class="tdButton categoryDrilldown"  style=" width:100%" onclick="showImageEventHandler(event);" ontouchend="showImageEventHandler(event);" >'
            + localizedStrings.showImage
            + '</a></p><hr class="separator"></td></tr>'
            + '<tr><td  class="centerText fullWidth"><p style="margin-bottom:10px;"><a class="tdButton categoryDrilldown"  style=" width:100%" onclick="variantDrilldownEventHandler(event);" ontouchend="variantDrilldownEventHandler(event);" >'
            + localizedStrings.showVariants + '</a></p></td></tr>' + '</table>' + '</div>';

}

/**
 * generate report data for Product that falls under given category
 * 
 * @param {Object} products - collection of products sold
 * @param {String} categoryID - category ID
 * @returns {Object} contains chart data, array of product IDs and product Image URls
 */
function generateProductChartDataByCategory(products, categoryID) {
    var rows = [];
    var chartData = [];
    var orderedImageURLs = [];
    var orderedIDs = [];

    var productIds = {};
    var productsOfCurrentCategory = products.filter(function(product) {
        productIds[product.ID] = product.name;
        return product.categories[categoryID];
    });

    for ( var pId in productIds) {
        var productsPerID = productsOfCurrentCategory.filter(function(product) {
            return product.ID == pId;
        });

        if (productsPerID.length > 0) {
            var totalSold = getTotalProductQuantitySold(productsPerID);
            var row = [ productIds[pId], Number(totalSold), productsPerID[0].imageURL, pId ];
            rows.push(row);
        }

    }
    rows.sort(sortChartDataRows);
    rows.forEach(function(cRow) {
        chartData.push([ cRow[0], cRow[1], generateProductsTooltipContent(cRow[1], cRow[0]) ]);
        orderedImageURLs.push(cRow[2]);
        orderedIDs.push(cRow[3]);
    });
    return {
        chartData : chartData,
        orderedPIDs : orderedIDs,
        orderedImageURLs : orderedImageURLs
    };
}
/**
 * generate report data for variants that falls under given product sold
 * 
 * @param {Object} products - collection of products sold
 * @param {String} productID - product ID
 * @returns {Object} contains chart data
 */
function generateVariantChartDataByProduct(products, productID) {
    var rows = [];
    var variantIDs = {};
    var productsOfCurrentPID = products.filter(function(product) {
        product.variants.forEach(function(variant) {
            variantIDs[variant.ID] = variant.name;
        });

        return product.ID == productID;
    });
    for ( var vId in variantIDs) {
        var productsPerID = productsOfCurrentCategory.filter(function(product) {
            return product.ID == pId;
        });

        if (productsPerID.length > 0) {
            var totalSold = getTotalProductQuantitySold(productsPerID);
            var row = [ productIds[pId], Number(totalSold), productsPerID[0].imageURL, pId ];
            rows.push(row);
        }

    }
    rows.sort(sortChartDataRows);
    return rows;
}
/**
 * gets number of products sold from a collection of products
 * 
 * @param {Object} products - collection of products sold
 * @returns {Number} total number of products sold
 */
function getTotalProductQuantitySold(products) {
    var total = 0;
    products.forEach(function(product) {
        total += product.quantity;
    });
    return total;
}
// generic function for sorting chart data
// pass function as agrgument to array.sort funtion
function sortChartDataRows(a, b) {
    if (a[1] > b[1]) {
        return -1;
    }
    if (a[1] < b[1]) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

/**
 * on click generate Order tooltip html source from bar chart in main sales eport
 * 
 * @param {Object} salesData - data of current bar
 * @param {Date} prodName - date of order
 * @returns {String} html string
 */
function generateTooltipContent(salesData, currentDate) {
    var overridesObj = getTotalOverridesObj(salesData);
    return '<div class="tooltipTextStyle">' + '<p style="text-align:center;"><b>' + currentDate + '</b></p>' + '<hr class="separator">' + '<p>' + localizedStrings.totalOrders + '<b>'
            + getTotalSalesWithCurrencyCode(salesData) + '</b></p>' + '<p>' + localizedStrings.numberOfOrders + '<b>' + salesData.length + '</b></p>' + '<p>' + localizedStrings.totalProductOverides
            + '<b>' + overridesObj.amount + '</b></p>' + '<p>' + localizedStrings.totalNumberOfProductsOverides + '<b>' + overridesObj.count + '</b></p>' + '</div>';
}

/**
 * on click generate Associate Sales tooltip html source from bar chart inassociate ranking report
 * 
 * @param {Object} salesData - data of current Associate
 * @param {Date} associateName - associate Name
 * @returns {String} html string
 */
function generateAssociateTooltipContent(salesData, associateName) {
    var overridesObj = getTotalOverridesObj(salesData);
    return '<div class="tooltipTextStyle" >' + '<p style="text-align:center;"><b>' + associateName + '</b></p>' + '<hr class="separator">' + '<p>' + localizedStrings.totalOrders + '<b>'
            + getTotalSalesWithCurrencyCode(salesData) + '</b></p>' + '<p>' + localizedStrings.numberOfOrders + '<b>' + salesData.length + '</b></p>' + '<p>' + localizedStrings.totalProductOverides
            + '<b>' + overridesObj.amount + '</b></p>' + '<p>' + localizedStrings.totalNumberOfProductsOverides + '<b>' + overridesObj.count + '</b></p>' + '</div>';
}

/**
 * Generate Store Ranking Sales tooltip html source
 * 
 * @param {Number} totalSold - Total Sold
 * @param {String} storeName - Store Name
 * @returns {String} html string
 */
function generateStroreRankingTooltipContent(totalSold, storeName) {
    return '<div class="tooltipTextStyle" >' + '<p style="text-align:left;"><b>' + storeName + '</b></p>' + '<p>' + localizedStrings.sales + ': <b>' + currencyCode + totalSold + '</b></p>' + '</div>';
}
/**
 * compute total sold from collection of orders
 * 
 * @param {Object} salesData - collection of orders
 * @returns {String} currency code of site gen and total sold
 */
function getTotalSalesWithCurrencyCode(salesData) {
    var totalSales = 0;
    for (var idx = 0; idx < salesData.length; idx++) {
        totalSales += salesData[idx].totalNetPrice;
    }
    return currencyCode + ' ' + totalSales.toFixed(2);
}
/**
 * compute total sold from collection of orders
 * 
 * @param {Object} salesData - collection of orders
 * @returns {Number} total amount sold
 */
function getTotalSales(salesData) {
    var totalSales = 0;
    for (var idx = 0; idx < salesData.length; idx++) {
        totalSales += salesData[idx].totalNetPrice;
    }
    return totalSales;
}
/**
 * compute total Adjustments from collection of orders
 * 
 * @param {Object} salesData - collection of orders
 * @returns {String} total amount of Adjustment and sitegen currency code
 */
function getTotalAdjustments(salesData) {
    var totalAdjustments = 0;
    for (var idx = 0; idx < salesData.length; idx++) {
        totalAdjustments += salesData[idx].adjustment;
    }
    return currencyCode + ' ' + totalAdjustments.toFixed(2);
}

/**
 * compute total Override amount and count from collection of orders
 * 
 * @param {Object} salesData - collection of orders
 * @returns {Object} total Override amount and count
 */
function getTotalOverridesObj(salesData) {

    var totalOverrides = 0;
    var count = 0;
    for (var idx = 0; idx < salesData.length; idx++) {
        totalOverrides += salesData[idx].totalOverrides;
        count += salesData[idx].OverridesCount;
    }
    return {
        amount : currencyCode + ' ' + totalOverrides.toFixed(2),
        count : count
    };
}

/**
 * this function is called by IOS client to return global var JSONData
 * 
 * @returns {String} JSONData
 */
function getJSONData() {

    if (JSONData) {
        return JSONData;
    } else {
        return "{}";
    }
}
/**
 * Returns a collection of category objects with the same depth number
 * 
 * @param {Object} tree - category tree
 * @param {Number} depth - depth of tree
 * @returns {Object} Collection of category objects with the same depth number
 */
function getAllSameDepthNodes(tree, depth) {
    tree = tree.root;
    if (tree == null) {
        return null;
    }
    var queue = [];
    queue.push(tree);
    var sameDepthNodes = [];

    while (queue.length > 0) {
        var cNode = queue.shift();
        if (cNode.depth == depth) {
            break;
        }
        for ( var key in cNode.children) {
            if (cNode.children[key].depth == depth) {
                sameDepthNodes.push(cNode.children[key]);
            }
            queue.push(cNode.children[key]);
        }
    }
    return sameDepthNodes;
}

/**
 * Returns a collection of sub category objects from a given category
 * 
 * @param {Object} tree - category tree
 * @param {Number} depth - depth parent category in the tree
 * @param {String} ID - ID of parent category in the tree
 * @returns {Object} Collection of sub category objects from a given category
 */
function findSubcategoriesByID(tree, depth, ID) {
    if (tree == null) {
        return null;
    }
    tree = tree.root;

    var queue = [];
    queue.push(tree);
    var sameDepthNodes = [];

    while (queue.length > 0) {
        var cNode = queue.shift();
        for ( var key in cNode.children) {
            if (cNode.children[key].depth == depth && cNode.children[key].ID == ID) {
                var nodeFound = cNode.children[key].children;
                for ( var key in nodeFound) {
                    sameDepthNodes.push(nodeFound[key]);

                }
                return sameDepthNodes;
            }
            queue.push(cNode.children[key]);
        }
    }
    return sameDepthNodes;
}

/**
 * given a category id and depth This function return a collection category nodes that are one level above the given category
 * 
 * @param {Object} tree - category tree
 * @param {Number} depth - depth category in the tree
 * @param {String} ID - ID of category in the tree
 * @returns {Object} Collection of parent categories objects
 */
function findParentCategoriesByID(tree, depth, ID) {
    if (tree == null) {
        return null;
    }

    if (depth - 2 <= 0) {
        return getAllSameDepthNodes(tree, 1);
    }
    tree = tree.root;

    var queue = [];
    queue.push(tree);
    var sameDepthNodes = [];

    while (queue.length > 0) {
        var cNode = queue.shift();
        if (cNode) {
            for ( var key in cNode.children) {
                if (cNode.children[key].depth == depth - 2) {
                    var nodeFound = cNode.children[key].children;
                    for ( var key in nodeFound) {
                        if (nodeFound[key].children[ID] && nodeFound[key].children[ID].depth == depth) {
                            for ( var catKey in nodeFound) {
                                sameDepthNodes.push(nodeFound[catKey]);
                            }

                            return sameDepthNodes;
                        }

                    }

                }
                queue.push(cNode.children[key]);
            }
        }

    }
    return sameDepthNodes;
}
/**
 * computes height of horizontal bar chart based on number of bars to be shown
 * 
 * @param {Number} barNum - number of bars to be shown
 * @returns {Number} chart height
 */
function getAdjustedHorizontalBarChartHeight(barNum) {
    var chartHeight = barNum * 40;
    if (chartHeight < window.innerHeight) {
        chartHeight = window.innerHeight + 1;
        if (chartHeight < 400) {
            chartHeight = 400;
        }
    }
    return chartHeight;
}
