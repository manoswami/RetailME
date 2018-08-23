/**
 * ©2015-2018 salesforce.com, inc. All rights reserved.
 * 
 * itemsSold.js - loads with itemsSoldReport.isml page. contains functions for handling all UI interactions with charts
 * 
 */

// --------------------- Global Variables -----------------------------------------
var productSalesCategoryData, mainCategoryTree = JSON.parse(orderData.mainCategoryTree), currentCategoryDepth = 1, productChart, categoryChart, goBackEventHandler, drilldownEventHandler, categoryChartOptions = {
    title : localizedStrings.categories,
    height : (window.innerHeight < 500 ? 500 : window.innerHeight + 1),
    width : "100%",
    titleTextStyle : {
        fontSize : 18,
        bold : true
    },
    tooltip : {
        trigger : 'none',
        isHtml : true
    },
    legend : {
        textStyle : {
            fontSize : 18,
            bold : true
        }
    }
}, toolTipLocation = {};
// --------------------- Global Variables -----------------------------------------

function drawCategoriesChart(event, catToRender) { // render all categories charts

    var data = new google.visualization.DataTable();
    data.addColumn('string', localizedStrings.categories);
    data.addColumn('number', localizedStrings.sales);
    data.addColumn({
        type : 'string',
        role : 'tooltip',
        'p' : {
            'html' : true
        }
    });

    categoryChart = new google.visualization.PieChart(document.getElementById('mainChartArea'));

    drilldownEventHandler = function(event) {
        event.preventDefault(); // prevents click from being triggered on IOS
        $('.currentTooltip_').remove(); // remove tooltip if present
        var selection = categoryChart.getSelection();
        if (selection.length <= 0) {
            return;
        } // no selection returned from chart
        var orderdCatIDs = productSalesCategoryData.orderdCatIDs;
        var selectedCategory = orderdCatIDs[selection[0].row];
        var categoryName = data.getValue(selection[0].row, 0);
        var categoryCount = data.getValue(selection[0].row, 1);
        data.removeRows(0, data.getNumberOfRows()); // clean up old data
        var generatedCatData = generateProductCategoriesChartData(orderData.products, mainCategoryTree, currentCategoryDepth, selectedCategory, true);
        if (generatedCatData.chartData.length == 0) { // if selectedCategory is a leaf category, render products chart instead of categories
            showGoBackButton();
            drawProductsChart(orderData.products, selectedCategory, categoryName + ' (' + categoryCount + ')');
        } else {
            productSalesCategoryData = generatedCatData;
            currentCategoryDepth += 1; // keep track of the current level or depth of the category tree
            hideShowGoBackButton();
            data.addRows(productSalesCategoryData.chartData); // add new data
            categoryChartOptions.title = localizedStrings.itemSold.categoryChartTitle + categoryName + ' (' + categoryCount + ')';
            categoryChart.draw(data, categoryChartOptions); // rerender category chart with new data
        }

    };

    goBackEventHandler = function(event) { // go back to the parent category level
        event.preventDefault(); // prevents click from being triggered on IOS
        $('.currentTooltip_').remove();
        var orderdCatIDs = productSalesCategoryData.orderdCatIDs;
        var selectedCategory = orderdCatIDs[0];
        data.removeRows(0, data.getNumberOfRows());
        productSalesCategoryData = generateProductCategoriesChartData(orderData.products, mainCategoryTree, currentCategoryDepth, selectedCategory, false);
        var categoryName = productSalesCategoryData.parent.name;
        currentCategoryDepth -= 1; // keep track of the current level or depth of the category tree
        hideShowGoBackButton();
        data.addRows(productSalesCategoryData.chartData);
        if (currentCategoryDepth <= 1) {
            categoryChartOptions.title = localizedStrings.categories;
        } else {
            categoryChartOptions.title = localizedStrings.itemSold.categoryChartTitle + categoryName;
        }
        categoryChart.draw(data, categoryChartOptions);
    };

    productSalesCategoryData = (catToRender ? catToRender : generateProductCategoriesChartData(orderData.products, mainCategoryTree, currentCategoryDepth));
    data.addRows(productSalesCategoryData.chartData);
    google.visualization.events.addListener(categoryChart, 'select', function() {
        var sel = categoryChart.getSelection();
        if (sel.length > 0) {
            var customTooltip = $(data.getValue(sel[0].row, 2));
            customTooltip.css(toolTipLocation);
            $('body').append(customTooltip); // show selected chart data tooltip or detailed view and option to drill down
        }
    });
    categoryChart.draw(data, categoryChartOptions); // Category Level 1 chart render
}

function drawProductsChart(products, selectedCategory, categoryName) {// render all products charts

    var data = new google.visualization.DataTable();
    data.addColumn('string', localizedStrings.products);
    data.addColumn('number', localizedStrings.totalSold);
    data.addColumn({
        type : 'string',
        role : 'tooltip',
        'p' : {
            'html' : true
        }
    });

    var productsData = generateProductChartDataByCategory(products, selectedCategory);
    data.addRows(productsData.chartData);
    var chartHeight = getAdjustedHorizontalBarChartHeight(productsData.chartData.length);

    var options = {
        title : localizedStrings.itemSold.productChartTitle + categoryName,
        titleTextStyle : {
            fontSize : 18,
            bold : true
        },
        height : chartHeight,
        width : "100%",
        colors : [ barChartColor ],
        tooltip : {
            trigger : 'none',
            isHtml : true
        },
        animation : {
            duration : 500,
            easing : 'out',
            startup : true
        },
        hAxis : {
            textStyle : {
                fontSize : 14
            },
            title : localizedStrings.totalSold,
            format : '',
            titleTextStyle : {
                bold : true,
                italic : true
            }
        },
        vAxis : {
            textStyle : {
                fontSize : 14
            },
            title : localizedStrings.products,
            titleTextStyle : {
                bold : true,
                italic : true
            }
        }

    };

    productChart = new google.visualization.BarChart(document.getElementById('mainChartArea'));

    showImageEventHandler = function(event) { // show selected product image
        event.preventDefault();
        var selection = productChart.getSelection();
        var imageURLS = productsData.orderedImageURLs;
        var selectedImage = imageURLS[selection[0].row];
        $('a.image-link').attr('href', selectedImage)
        $('a.image-link').trigger('click');
    };
    variantDrilldownEventHandler = function(event) { // drill down to variants chart
        event.preventDefault();
        $('.currentTooltip_').remove();
        var selection = productChart.getSelection();
        var orderedPIDs = productsData.orderedPIDs;
        var selectedPID = orderedPIDs[selection[0].row];
        $('div[id=mainChartArea]').hide();
        $('div[id=variationChartArea]').show();
        drawVariationsChart(selectedPID);
    };

    goBackEventHandler = function(event) { // overwrite the goback handler
        $('.currentTooltip_').remove();
        event.preventDefault();
        $('div[id=mainChartArea]').show();
        $('div[id=variationChartArea]').hide();
        hideShowGoBackButton()
        drawCategoriesChart(null, productSalesCategoryData)
    };
    google.visualization.events.addListener(productChart, 'select', function() {
        var sel = productChart.getSelection();
        if (sel.length > 0) {
            var customTooltip = $(data.getValue(sel[0].row, 2));
            customTooltip.css(toolTipLocation);
            $('body').append(customTooltip)
        }
    });
    productChart.draw(data, options);

}

function drawVariationsChart(productID) {// render all variations charts
    var products = orderData.products.filter(function(prod) {
        return prod.ID == productID;
    }); // get all product with productID
    var variationsChart = new google.visualization.PieChart(document.getElementById('variationChart'));

    var dummyGoBackEventHandler = goBackEventHandler; // keep reference to old goBackEventHandler

    var variationChartOptions = {
        width : "100%",
        height : (window.innerHeight < 500 ? 500 : window.innerHeight + 1),
        legend : {
            textStyle : {
                fontSize : 15,
                bold : true
            }
        },
        is3D : true
    };
    var variantTableOptions = {
        width : "100%",
        height : (window.innerHeight < 500 ? 500 : window.innerHeight + 1),
        allowHtml : true,
        cssClassNames : {
            tableRow : 'tableRowTextStyle',
            oddTableRow : 'tableRowTextStyle',
            selectedTableRow : 'selectedTableRow',
            hoverTableRow : 'hoverTableRow'
        }
    };

    goBackEventHandler = function(event) {
        event.preventDefault(); // prevents click event on IOS
        $('.currentTooltip_').remove();
        $('div[id=mainChartArea]').show();
        $('div[id=variationChartArea]').hide();
        goBackEventHandler = dummyGoBackEventHandler;
        variationChartOptions.title = '';
        // clean up chart table when leaving the view
        variationsChart.draw(new google.visualization.DataTable({
            cols : [ {
                type : 'string',
                label : localizedStrings.itemSold.variantionChartColum1
            }, {
                type : 'number',
                label : localizedStrings.totalSold
            } ],
            rows : []
        }), variationChartOptions);
    }

    if (products.length > 0) {
        var variants = {};
        products.forEach(function(product) {
            product.variants.forEach(function(variant) {
                variants[variant.ID] = variant.name;
            })

        })

        var variantsIDArray = $.map(variants, function(value, key) {
            return [ key ];
        });
        var rows = [];
        for ( var key in variants) {
            rows.push([ variants[key] ]);
        }
        var vData = new google.visualization.DataTable();
        $('#productTitle').html(products[0].name + " (" + products.length + ")");
        vData.addColumn('string', localizedStrings.variants);
        vData.addRows(rows);

        var vTable = new google.visualization.Table(document.getElementById('variationTable'));

        vTable.draw(vData, variantTableOptions);

        var handleTableSelection = function() {
            var selection = vTable.getSelection();
            if (selection.length <= 0) {
                return;
            }
            var selectedVariantID = variantsIDArray[selection[0].row];
            var variantValRows = {};
            products.forEach(function(product) {
                product.variants.forEach(function(variant) {
                    if (variant.ID == selectedVariantID) {
                        if (variantValRows[variant.value]) {
                            variantValRows[variant.value].count += product.quantity;
                        } else {
                            variantValRows[variant.value] = {
                                name : variant.displayValue,
                                count : product.quantity
                            };
                        }
                    }

                });

            });
            var vValData = new google.visualization.DataTable();
            vValData.addColumn('string', localizedStrings.itemSold.variantionChartColum1);
            vValData.addColumn('number', localizedStrings.totalSold);
            for ( var key in variantValRows) {
                vValData.addRow([ variantValRows[key].name + " (" + variantValRows[key].count + ")", variantValRows[key].count ]);
            }

            variationChartOptions.title = vData.getValue(selection[0].row, 0);
            variationsChart.draw(vValData, variationChartOptions);
        };

        // When the variants table is selected, update the variant piechart.
        google.visualization.events.addListener(vTable, 'select', handleTableSelection);
        if (vData.getNumberOfRows() > 0) {
            vTable.setSelection([ {
                row : 0,
                column : null
            } ]);
            google.visualization.events.trigger(vTable, 'select', null);
        }

    }

}
function setTooltipLocation(e) {// determine where tooltip should be displayed on the page
    $('.currentTooltip_').remove();
    /*
     * use below if handling touchEvent toolTipLocation = {'top':e.changedTouches[0].pageY,//e.pageY, 'left':event.changedTouches[0].pageX//e.pageX, };
     * 
     */
    toolTipLocation = {
        top : e.pageY,
        left : e.pageX
    };
}
function hideShowGoBackButton() {
    if (currentCategoryDepth > 1) {
        $('div[id=controlArea]').show();
        $('a[id=goBack]').show();
    } else {
        $('div[id=controlArea]').hide();
        $('a[id=goBack]').hide();
    }
}
function showGoBackButton() {
    $('div[id=controlArea]').show();
    $('a[id=goBack]').show();
}

// -----------------------------------------------------------------------------------
$(function() {
    $('.image-link').magnificPopup({
        type : 'image'
    }); // initialize the image modal
})
google.load('visualization', '1', {
    packages : [ 'corechart', 'bar', 'table' ]
});
google.setOnLoadCallback(drawCategoriesChart);
