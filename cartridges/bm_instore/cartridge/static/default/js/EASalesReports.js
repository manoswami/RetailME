/**
 * ©2015-2018 salesforce.com, inc. All rights reserved.
 * 
 * EASalesReports.js - loads with the reports/index.isml page and has UI control
 * functions.
 * 
 */

/*
 * String.format - format string text by replacing the curly braces with passed
 * in arguments
 * 
 */
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

/**
 * jQuery.animateRightIn - animate div to expand horizontally from right to left
 * 
 * @param {number}
 *            duration - The speed amount
 * @param {string}
 *            easing - The easing method
 * @param {function}
 *            complete - A callback function
 */
jQuery.fn.animateRightIn = function(duration, easing, complete) {
    this.css('margin-left', this.outerWidth());
    return this.animate({
        marginLeft : 0
    }, jQuery.speed(duration, easing, complete));
};

/**
 * jQuery.animateRightOut - animate div to expand horizontally from left to
 * right
 * 
 * @param {number}
 *            duration - The speed amount
 * @param {string}
 *            easing - The easing method
 * @param {function}
 *            complete - A callback function
 */
jQuery.fn.animateRightOut = function(duration, easing, complete) {
    this.css('margin-right', this.outerWidth());
    return this.animate({
        marginRight : 0
    }, jQuery.speed(duration, easing, complete));
};

jQuery(function() {

    /**
     * matchString - do regex wild card string match
     * 
     * @param {String}
     *            str - string to match
     * @param {String}
     *            rule - rule tomatch
     * @return {Boolean}
     */
    function matchString(str, rule) {
        rule = '*' + rule + '*';
        // "." => Find a single character, except newline or line terminator
        // ".*" => Matches any string that contains zero or more characters

        rule = rule.split("*").join(".*");

        // "^" => Matches any string with the following at the beginning of it
        // "$" => Matches any string with that in front at the end of it
        rule = "^" + rule + "$"
        // Create a regular expression object for matching string
        var regex = new RegExp(rule, "i");
        // Returns true if it finds a match, otherwise it returns false
        return regex.test(str);
    }

    /*
     * prepareHamburgerMenuForAnimation - takes cake of element in hamburger
     * menu before animation
     */

    function prepareHamburgerMenuForAnimation() {
        $('#backToStoreListWrapper').hide()
        $('#associatesList').scrollTop(0);
        $('#sideBarOverlay').show()
        $('#associatesList').css('overflow-y', 'hidden');
    }

    /*
     * hideHamburgerMenuActivityIndicator - Hide activity indicator in hamburger
     * menu
     */
    function hideHamburgerMenuActivityIndicator() {
        $('#sideBarOverlay').hide()
        $('#associatesList').css('overflow-y', 'scroll');
    }

    /**
     * goBackToStoreList - render the stores' list in the hamburger menu on the
     * back button click
     */
    function goBackToStoreList() {
        var nav = $('#storeAssocNav'), wrapper = $('#employeeListWrapper'), search = $('#searchStoresAssocsWrapper'), msg = $('#selectStoreOrAssociateMsg'), textField = $('#searchAssociatesOrStores');
        prepareHamburgerMenuForAnimation();
        renderStoresList(existingStores);
        setTimeout(function() {
            textField.attr('placeholder', localizedStr.searchStores)
            $('#storeAssocListTitle').text(localizedStr.stores)
            msg.text(localizedStr.storeHintText)
            $('#mainUIOverlay').children(':first-child').text(
                    localizedStr.storeHintText)
            $('#backToStoreListWrapper').hide();
            hideHamburgerMenuActivityIndicator();
            nav.animateRightOut('slow');
            search.animateRightOut('slow');
            msg.animateRightOut('slow');
            wrapper.animateRightOut('slow');
        }, 300)

    }

    /**
     * onHamMenuClick - show or hide hamburger menu
     * 
     * @param {Array}
     *            callback - function(s) to be called when hamburger menu
     *            animation is complete
     */
    function onHamMenuClick(callback) {
        if (!$('#associatesList').hasClass('cbp-spmenu-open')) {
            $('#searchAssociatesOrStores').val('');
            $('#associatesList').scrollTop(0);
        } else {
            if (!queryStringObj.storeId || !queryStringObj.employeeId) {
                $("#selectStoreOrAssociateMsg").css('background-color',
                        "#F2DEDE");
                $("#selectStoreOrAssociateMsg").fadeIn(100).fadeOut(100)
                        .fadeIn(100).fadeOut(100).fadeIn(
                                {
                                    duration : 100,
                                    complete : function() {
                                        $("#selectStoreOrAssociateMsg").css(
                                                'background-color', "");
                                    }
                                });
                return;
            }
        }

        $('#associatesList').toggleClass('cbp-spmenu-open');
        $("#mainUIOverlay").toggle({
            duration : 300,
            complete : function() {
                if (callback && callback.length > 0) {
                    callback.forEach(function(currentCall) {
                        currentCall();
                    })
                }

            }
        });
    }
    /**
     * loadAssociatesOnStoreSelect - load associates list from server and render
     * it.
     * 
     * @param storeId -
     *            Id of store
     */
    function loadAssociatesOnStoreSelect(storeId) {
        var nav = $('#storeAssocNav'), wrapper = $('#employeeListWrapper'), search = $('#searchStoresAssocsWrapper'), msg = $('#selectStoreOrAssociateMsg'), textField = $('#searchAssociatesOrStores');
        prepareHamburgerMenuForAnimation();

        $.ajax({
            url : "../AjaxManageAssociates-Associates?storeId=" + storeId,
            type : "GET",
            success : function(response) {
                try {
                    response = JSON.parse(response);
                    textField.attr('placeholder', localizedStr.searchAssoc)
                    $('#storeAssocListTitle').text('Associates')
                    $('#backToStoreListWrapper').show();
                    $('#selectStoreOrAssociateMsg')
                            .text(
                                    localizedStr.assocHintText
                                            .format(currentStoreName)).show();
                    $('#mainUIOverlay').children(':first-child')
                            .text(
                                    localizedStr.assocHintText
                                            .format(currentStoreName))
                    currentStoreAssociates = response.storeEmployees;
                    renderAssociatesList(currentStoreAssociates);
                    hideHamburgerMenuActivityIndicator();
                    nav.animateRightIn('slow');
                    search.animateRightIn('slow');
                    msg.animateRightIn('slow');
                    wrapper.animateRightIn('slow');

                } catch (err) {

                }
            },
            error : function(jqXHR, textStatus, errorThrown) {
                hideHamburgerMenuActivityIndicator();
                alert(localizedStr.failedToLoadAssociates)
            }
        });
    }

    /**
     * renderAssociatesList - render associates list
     * 
     * @param {Array}
     *            data - associates list data array
     */
    function renderAssociatesList(data) {
        $('#employeeListWrapper').empty();
        var els = [];
        var html = '<a href="#" data-id="ALL_STORE"  class=" stores-associates-list '
                + (queryStringObj.employeeId == "ALL_STORE"
                        && previousStoreId == queryStringObj.storeId ? " active"
                        : "")
                + '"  onclick="event.preventDefault();">'
                + localizedStr.allAssoc + '</a>';
        els.push($(html).click(onStoreOrAssociateSelect));
        if (data.length > 0) {
            data.forEach(function(cData) {
                var html = '<a href="#" data-id="'
                        + cData.id
                        + '"  class=" stores-associates-list '
                        + (cData.id == queryStringObj.employeeId ? ' active '
                                : ' ')
                        + '"  onclick="event.preventDefault();">'
                        + cData.firstName + " " + cData.lastName + '</a>';
                els.push($(html).click(onStoreOrAssociateSelect));
            });
        }
        $("#employeeListWrapper").append(els);
        storeListDisplayed = false;
    }

    /**
     * renderStoresList - render stores list
     * 
     * @param {Array}
     *            stores - stores list data array
     */
    function renderStoresList(stores) {
        $('#employeeListWrapper').empty();

        if (stores.length > 0) {
            var els = [];
            stores.forEach(function(cData) {
                var html = '<a href="#" data-id="'
                        + cData.id
                        + '" class=" stores-associates-list '
                        + (cData.id == queryStringObj.storeId ? ' active '
                                : ' ')
                        + '"  onclick="event.preventDefault()" >' + cData.name
                        + '</a>';
                els.push($(html).click(onStoreOrAssociateSelect));
            });
            $("#employeeListWrapper").append(els);
        }
        storeListDisplayed = true;
    }

    /**
     * highlightSelectedButton - highlight which iframe tab or date interval
     * button is clicked
     */
    function highlightSelectedButton() {
        $(this).parent().find('li').removeClass('active');
        $(this).addClass('active');
    }

    /***************************************************************************
     * renderQuickStats - render quickStats list
     * 
     * @param {Array}
     *            data - quickStats list data array
     */
    function renderQuickStats(data) {
        $("#quickStatsColumn").empty();
        var html = '';
        if (data.length > 0) {
            data.forEach(function(cData) {
                html += '<div class="quick-stat-row">'
                        + '<p class="quick-stat-row-value">' + cData.value
                        + '</p>' + '<p class="quick-stat-row-text">'
                        + cData.title + '</p>'
                        + '<hr class="quick-stat-seperator">' + '</div>';

            });
            $("#quickStatsColumn").append(html);
        }
    }

    /**
     * renderDateInterval - display date interval of the current report
     */
    function renderDateInterval() {
        $("#dateIntervalInfo").text(
                moment(queryStringObj.dateFrom).format('LL') + " - "
                        + moment(queryStringObj.dateTo).format('LL'));
    }

    /**
     * renderStoreAndAssociateName - display store name dash the associate for
     * which the report is generated
     */
    function renderStoreAndAssociateName() {
        var title = currentStoreName;
        if (currentAssociateName) {
            title += " - " + currentAssociateName;
        }
        $("#storeAssocNavTitle").text(title);
    }

    /**
     * buildIframeUrl - return URL string
     * 
     * @param {String}
     *            rootURL - iframe URL root
     * @param {Object}
     *            cQueryStringObj - Query string object
     * @return {String}
     */
    function buildIframeUrl(rootURL, cQueryStringObj) {
        var qString = [];
        if (cQueryStringObj.employeeId == 'ALL_STORE') {
            delete (cQueryStringObj.employeeId);
            var isAllStore = true;
        }
        for (key in cQueryStringObj) {
            qString.push(key + '=' + cQueryStringObj[key]);
        }
        if (isAllStore == true) {
            cQueryStringObj.employeeId = 'ALL_STORE';
        }
        return rootURL + qString.join('&');
    }

    /**
     * onStoreOrAssociateSelect - set store ID or Associate ID in query string
     * object and load focused Iframe
     * 
     */
    function onStoreOrAssociateSelect() {
        var el = this;
        if (storeListDisplayed) {
            queryStringObj.storeId = $(el).data('id');
            currentStoreName = $(el).text();
            currentAssociateName = null;
            loadAssociatesOnStoreSelect(queryStringObj.storeId);
        } else {
            queryStringObj.employeeId = $(el).data('id');
            currentAssociateName = $(el).text();
            onHamMenuClick();
            loadFocusedIframe();
            renderStoreAndAssociateName();
        }
        $(el).siblings('a').removeClass('active');
        $(el).addClass('active');
    }

    /**
     * filterAssociatesList - re-render associate list on string search
     * 
     * @param {Array}
     *            data - associate data array
     * @param {String}
     *            searchStr - search text
     */
    function filterAssociatesList(data, searchStr) {
        if (data.length > 0) {
            var res = data.filter(function(cData) {
                var fullName = cData.firstName + ' ' + cData.lastName;
                return matchString(fullName, searchStr);
            });
            renderAssociatesList(res);
        }
    }

    /**
     * filterStoresList - re-render store list on string search
     * 
     * @param {String}
     *            searchStr - search text
     */
    function filterStoresList(searchStr) {
        if (existingStores.length > 0) {
            var res = existingStores.filter(function(cData) {
                return matchString(cData.name, searchStr);
            });
            renderStoresList(res);
        }
    }

    /**
     * getMainIframeData - get data from main Iframe
     * 
     * @return {Object}
     */
    function getMainIframeData() {
        salesIframeWin = salesIframe.contentWindow;
        return JSON.parse(salesIframeWin.JSONData);
    }

    /**
     * onSearchAssociatesChange - handle search text change and render stores or
     * associates list
     */
    function onSearchAssociatesChange() {
        if (storeListDisplayed) {
            if ($(this).val().length > 0) {
                filterStoresList($(this).val());
            } else if ($(this).val().length == 0) {
                renderStoresList(existingStores);
            }
        } else {
            if ($(this).val().length > 0) {
                filterAssociatesList(currentStoreAssociates, $(this).val());
            } else if ($(this).val().length == 0) {
                renderAssociatesList(currentStoreAssociates)
            }
        }

    }

    /**
     * onMainSalesReportLoad - handle the load event of main sales Iframe
     */
    function onMainSalesReportLoad() {
        try {
            salesIframeWin = salesIframe.contentWindow;
            salesIframeWin.scrollTo(0, 0);
            var data = JSON.parse(salesIframeWin.JSONData);
            renderQuickStats(data.quickStats);
        } catch (err) {
            alert(localizedStr.failedToLoadSalesReportData);
        } finally {
            $('#salesSpinner').hide();
            if (deferred) {
                deferred.resolve();
                deferred = null;
            }
            setIframToReloadOnFocus(salesIframe);
        }

    }

    /**
     * onItemsSoldIframeLoad - handle the load event of items sold Iframe
     */
    function onItemsSoldIframeLoad() {
        itemsSoldIframe.contentWindow.scrollTo(0, 0);
        $('#itemsSoldSpinner').hide();
        if (deferred) {
            deferred.resolve();
            deferred = null;
        }
        setIframToReloadOnFocus(itemsSoldIframe)
    }

    /**
     * onAssociatesRankingIframeLoad - handle the load event of associates
     * ranking Iframe
     */
    function onAssociatesRankingIframeLoad() {
        associatesRankingIframe.contentWindow.scrollTo(0, 0);
        $('#associatesRankingSpinner').hide();
        if (deferred) {
            deferred.resolve();
            deferred = null;
        }
        setIframToReloadOnFocus(associatesRankingIframe)
    }

    /**
     * onStoresRankingIframeLoad - handle the load event of items stores ranking
     * Iframe
     */
    function onStoresRankingIframeLoad() {
        storesRankingIframe.contentWindow.scrollTo(0, 0);
        $('#storesRankingSpinner').hide();
        if (deferred) {
            deferred.resolve();
            deferred = null;
        }
        setIframToReloadOnFocus(storesRankingIframe)
    }

    /**
     * setIframToReloadOnFocus - set iframe flag to be reloade in case it was
     * loaded while not being focused
     */
    function setIframToReloadOnFocus(iframe) {

        if ($(iframe).parents('div[class="item active"]').length <= 0) {
            $(iframe).data("reloadonfocus", true)
        } else {
            $(iframe).data("reloadonfocus", null)
        }
    }

    /**
     * isNewRequest - check if the currentURL is different from previousURL
     * 
     * @param {String}
     *            currentURL - current Iframe URL or src
     * @param {String}
     *            previousURL - previous Iframe URL or src
     * @return {Boolean}
     */
    function isNewRequest(currentURL, previousURL) {
        return currentURL !== previousURL;
    }

    /**
     * loadMainSalesReport - load main sales Iframe
     */
    function loadMainSalesReport() {

        var cURL = buildIframeUrl($(salesIframe).data('rooturl'),
                queryStringObj);
        if (isNewRequest(cURL, $(salesIframe).attr('src'))) {
            clearIframe(salesIframe);
            $('#salesSpinner').show();
            $(salesIframe).attr('src', cURL);
        }
    }

    /**
     * hideCurrentIFrame - hide iframe user is sliding away from
     */
    function hideCurrentIFrame() {
        var currentReportWin = carousel.find('div[class="item active"]');
        currentReportWin.find('iframe').hide();
    }

    /**
     * loadFocusedIframe - load the currently displayed Iframe
     */
    function loadFocusedIframe() {
        var currentReportWin = carousel.find('div[class="item active"]');
        var cIframe = currentReportWin.find('iframe');
        var cActivityInd = currentReportWin
                .find('div[class="activity-indicator"]');
        var cURL = buildIframeUrl(cIframe.data('rooturl'), queryStringObj);
        if (isNewRequest(cURL, cIframe.attr('src'))) {
            clearIframe(cIframe[0]);
            cActivityInd.show();
            if (cIframe.attr('id') !== 'salesIframe') {
                deferred = $.Deferred();
                deferred.done(loadMainSalesReport);
            }
            cIframe.attr('src', cURL);
            return true;
        }
        return false;
    }

    /**
     * scrollToAppHeader - Scroll the page to report dashboard navigation bar
     */
    function scrollToAppHeader() {
        if($('#EACountrySelector option').length <=1){
            $('#EACountrySelector').hide();
            $('#countrySelectorLabel').hide();
            $('#EASeparator').parents('html,body').animate(
                {
                    scrollTop : $("#EAMainContainer").offset().top
                            - $("#bm_header_sbx").height() - 2
                }, 500);
        } else {
            $('#EACountrySelector').show();
            $('countrySelectorLabel').show();
        }
    }

    /**
     * clearIframe - clear the current page loaded by the iframe
     * 
     * @param iframe -
     *            iframe object
     */
    function clearIframe(iframe) {
        var frameDoc = iframe.contentDocument || iframe.contentWindow.document;
        frameDoc.documentElement.innerHTML = "";
    }

    /**
     * reloadMainSalesReport - reload the main sales report on reload button
     * click
     */
    function reloadMainSalesReport() {
        clearIframe(salesIframe);
        $('#salesSpinner').show();
        salesIframe.contentWindow.location.reload();
    }

    /**
     * reloadMainSalesReport - reload the items sold report iframe on reload
     * button click
     */
    function reloadItemsSoldReport() {
        clearIframe(itemsSoldIframe);
        $('#itemsSoldSpinner').show();
        itemsSoldIframe.contentWindow.location.reload();
    }

    /**
     * reloadAssociatesRankingReport - reload the reload associates ranking
     * report iframe on reload button click
     */
    function reloadAssociatesRankingReport() {
        clearIframe(associatesRankingIframe);
        $('#associatesRankingSpinner').show();
        associatesRankingIframe.contentWindow.location.reload();
    }

    /**
     * reloadStoresRankingReport - reload the reload stores ranking report
     * iframe on reload button click
     */
    function reloadStoresRankingReport() {
        clearIframe(storesRankingIframe);
        $('#storesRankingSpinner').show();
        storesRankingIframe.contentWindow.location.reload();
    }

    /**
     * 
     * formatDate - return date as string "year-month-day:Thh:mm:ss"
     * 
     * @param {Object}
     *            date - Date object
     * @param {String}
     *            time - string formated like "Thh:mm:ss"
     * @return {String}
     */
    function formatDate(date, time) {
        if (!time) {
            time = 'T23:59:59';
        }
        var d = date, month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d
                .getFullYear();

        if (month.length < 2) {
            month = '0' + month;
        }
        if (day.length < 2) {
            day = '0' + day;
        }
        return [ year, month, day ].join('-') + time;
    }
    ;

    /**
     * loadThisWeek - load this week's report
     */
    function loadThisWeek() {
        var dateObj = {};
        var date = new Date();
        dateObj.dateTo = formatDate(date, TIME_END_DAY);
        var last = getFirstDayOfWeek(date);
        dateObj.dateFrom = formatDate(last, TIME_START_DAY);
        loadReport(dateObj);
    }

    /**
     * loadThisYear - load this year's report
     * 
     */
    function loadThisYear() {
        var dateObj = {};
        var date = new Date();

        dateObj.dateTo = formatDate(date, TIME_END_DAY);
        var first = new Date(date.getFullYear(), 0, 1);
        dateObj.dateFrom = formatDate(first, TIME_START_DAY);

        loadReport(dateObj);

    }

    /**
     * loadThisQuarter - load this quarter's report
     */
    function loadThisQuarter() {
        var dateObj = {};
        var date = new Date();

        dateObj.dateTo = formatDate(date, TIME_END_DAY);
        var month = date.getMonth();
        if (month < 2) {
            month = 0;
        } else {
            month -= 2;
        }
        var first = new Date(date.getFullYear(), month, 1);
        dateObj.dateFrom = formatDate(first, TIME_START_DAY);
        loadReport(dateObj);

    }

    /**
     * renderDropDown - renders country selector drop down
     * 
     */    
    function renderDropDown(countryConfiguration) {
        var countrySelector = ''; 
        for ( var key in countryConfiguration) {
            if (countryConfiguration.hasOwnProperty(key)) {
                countrySelector += "<option value="+key+">" + countryConfiguration[key].displayName + "</option>";
            }
        }
        document.getElementById('EACountrySelector').innerHTML = countrySelector;
    }

    /**
     * getFirstDayOfWeek - return first day of the week
     * 
     * @return {Date}
     */
    function getFirstDayOfWeek(d) {
        if (!startOfWeekConfig || startOfWeekConfig === '') {
            return getMonday(d);
        }
        if (startOfWeekConfig.toLowerCase() === 'monday') {
            return getMonday(d);
        }
        if (startOfWeekConfig.toLowerCase() === 'sunday') {
            return getSunday(d);
        }
        return d;
    }

    /**
     * getMonday - return monday of the current week
     * 
     * @return {Date}
     */
    function getMonday(d) {
        var day = d.getDay();
        if (day == 1) {
            return d;
        }
        var diff = d.getDate() - day;
        diff += (day == 0 ? -6 : 1);
        // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    /**
     * getSunday - return sunday of the current week
     * 
     * @return {Date}
     */
    function getSunday(d) {
        var day = d.getDay();
        if (day == 0) {
            return d;
        }
        var diff = d.getDate() - day;
        diff += (day == 0 ? -6 : 0);
        // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    /**
     * loadThisMonth - load this month's report
     */
    function loadThisMonth() {
        var dateObj = {};
        var date = new Date();

        dateObj.dateTo = formatDate(date, TIME_END_DAY);
        var first = new Date(date.getFullYear(), date.getMonth(), 1);
        dateObj.dateFrom = formatDate(first, TIME_START_DAY);

        loadReport(dateObj);
    }

    /**
     * loadToday - load today's report
     */
    function loadToday() {
        var dateObj = {};
        var date = new Date();
        dateObj.dateFrom = formatDate(date, TIME_START_DAY);
        dateObj.dateTo = formatDate(date, TIME_END_DAY);
        loadReport(dateObj);
    }

    /**
     * loadReport - load report based on date interval
     * 
     * @param {Object}
     *            dateObj - should have the fields dateFrom and dateTo
     */
    function loadReport(dateObj) {
        $.extend(queryStringObj, dateObj);
        renderDateInterval();
        loadFocusedIframe();
    }

    /**
     * verifyDateRange - validate the date range of the custom provided start
     * and end date
     * 
     * @return {Boolean}
     */
    function verifyDateRange() {
        // keep date range set to 90 days
        var cutomDateFrom = $('#customDateFrom'), customDateTo = $('#customDateTo'), customDateErrorMsg = $('#customDateErrorMsg');
        var dateFrom = new Date(formatDate(new Date(cutomDateFrom.val()),
                TIME_START_DAY)), dateTo = new Date(formatDate(new Date(
                customDateTo.val()), TIME_END_DAY));
        var range = dateTo.getTime() - dateFrom.getTime();

        var result = {
            isValid : false
        };

        if (dateTo.getTime() < dateFrom.getTime()) {
            customDateErrorMsg.text(localizedStr.errorCustomEndDateBfStDate);
            customDateErrorMsg.css('color', 'red');
            return result;
        }

        if (range > allowedDateRanger) {
            customDateErrorMsg.text(localizedStr.errorCustomMaxDateRange
                    .format(Math.ceil((range / (24 * 60 * 60 * 1000)))));
            customDateErrorMsg.css('color', 'red');
            return result;
        }

        customDateErrorMsg.text(localizedStr.msgCustomMaxDateAllowed);
        customDateErrorMsg.css('color', '#737373');
        result.dateFrom = formatDate(new Date(cutomDateFrom.val()),
                TIME_START_DAY)
        result.dateTo = formatDate(new Date(customDateTo.val()), TIME_END_DAY);
        result.isValid = true;
        return result;
    }

    /**
     * onCustomDateClick - Show the date picker and highlight the custom date
     * button
     */
    function onCustomDateClick() {
        $('#datePickerModal').modal('show');
        $('.modal-backdrop').first().appendTo($('#EAMainContainer'));
        $('#customDateErrorMsg').css('color', '#737373');

    }

    /**
     * onCustomDatesApplyClick - Hide the date picker and load the valid custom
     * date range report
     */
    function onCustomDatesApplyClick() {
        var data = verifyDateRange();
        if (data.isValid) {
            delete (data.isValid);
            loadReport(data);
            $('#datePickerModal').modal('hide');
        }

    }

    /**
     * redrawIframeChart - redraw report
     */
    function redrawIframeChart(iframeContentWindow) {
        if (iframeContentWindow && iframeContentWindow.drawChart) {
            iframeContentWindow.drawChart();
            return;
        }
    }

    // ------------------CONSTRUCTOR--------------------------
    var $ = jQuery.noConflict();
    var salesIframeWin, itemsSoldIframeWin, rankingIframeWin;
    var JSONData;
    var currentStoreName = '';
    var currentAssociateName = '';
    var previousStoreId;
    var salesIframe = document.getElementById('salesIframe'), itemsSoldIframe = document
            .getElementById('itemsSoldIframe'), associatesRankingIframe = document
            .getElementById('associatesRankingIframe')
    storesRankingIframe = document.getElementById('storesRankingIframe');
    var carousel = $('#iframesCarousel');
    var TIME_START_DAY = 'T00:00:00', TIME_END_DAY = 'T23:59:59';
    // allowedDateRanger correspond to 90 days difference between start date an
    // end date
    var allowedDateRanger = 90 * 24 * 60 * 60 * 1000;
    var self = this;
    var deferred = $.Deferred();
    var todayDate = new Date();
    var queryStringObj = {
        loadEmployeeList : false,
        dateTo : formatDate(todayDate, TIME_END_DAY),
        dateFrom : formatDate(getFirstDayOfWeek(new Date()), TIME_END_DAY)
    };
    var storeListDisplayed = true;
    var currentStoreAssociates = [];
    $('#iframesCarousel').on('slid.bs.carousel', function() {
        var iframe = carousel.find('div[class="item active"]').find('iframe');
        if (!loadFocusedIframe()) {
            if (iframe.data("reloadonfocus")) {
                iframe.show();
                if (iframe.attr("id") == "itemsSoldIframe") {
                    reloadItemsSoldReport();
                } else {
                    redrawIframeChart(iframe[0].contentWindow)
                }
                iframe.data("reloadonfocus", null)
            }
        }
        iframe.show();
    });

    $('#iframesCarousel').on('slide.bs.carousel', hideCurrentIFrame);
    $('#todayRep').click(loadToday);
    $('#weekRep').click(loadThisWeek);
    $('#monthRep').click(loadThisMonth);
    $('#quarterRep').click(loadThisQuarter);
    $('#customDateRep').click(onCustomDateClick);
    $('.iframe-select').click(highlightSelectedButton);
    $('.date-interval').click(highlightSelectedButton);

    $(salesIframe).load(onMainSalesReportLoad);
    $(itemsSoldIframe).load(onItemsSoldIframeLoad);
    $(associatesRankingIframe).load(onAssociatesRankingIframeLoad);
    $(storesRankingIframe).load(onStoresRankingIframeLoad);
    $('#reloadSalesRep').click(reloadMainSalesReport);
    $('#reloadItemsSoldRep').click(reloadItemsSoldReport);
    $('#reloadAssociatesRankingRep').click(reloadAssociatesRankingReport);
    $('#reloadStoresRankingRep').click(reloadStoresRankingReport);
    $('#hamMenu').click(onHamMenuClick);
    $("#mainUIOverlay").click(onHamMenuClick);
    $('#searchAssociatesOrStores').keyup(onSearchAssociatesChange);
    $('#backToStoreList').click(goBackToStoreList);
    $('#applyCustomDates').click(onCustomDatesApplyClick);
    $("#storeAssocNavTitle").click(scrollToAppHeader);

    $('#customDateFrom').datetimepicker({
        format : 'MM/DD/YYYY',
        maxDate : todayDate,
        defaultDate : new Date(todayDate.getTime() - (24 * 60 * 60 * 1000))
    });
    $('#customDateTo').datetimepicker({
        format : 'MM/DD/YYYY',
        maxDate : todayDate,
        defaultDate : todayDate
    });

    setTimeout(scrollToAppHeader, 1000);
    renderStoresList(existingStores);
    less.pageLoadFinished.done(function() {
        setTimeout(function() {
            $('#EAMainContainer').show({
                complete : onHamMenuClick
            });
        }, 300)
    });
    renderDateInterval();
    renderDropDown(countryConfiguration);
    $('#EACountrySelector').change(function(e){
        localStorage.setItem("country", $(this).val());
        localStorage.setItem("currencySymbol", countryConfiguration[$(this).val()].currencySymbol);
        $this = $(e.target);
        location.reload();
        
    });
    
    $(document).ready(function() {
        if(!localStorage.getItem("country") || !countryConfiguration[localStorage.getItem("country")]){
            queryStringObj.country = $("#EACountrySelector").val();
            queryStringObj.currencySymbol = countryConfiguration[$("#EACountrySelector").val()].currencySymbol;
            localStorage.setItem("country", $("#EACountrySelector").val());
            localStorage.setItem("currencySymbol", countryConfiguration[$("#EACountrySelector").val()].currencySymbol);
        } else {
            queryStringObj.country = localStorage.getItem("country");
            queryStringObj.currencySymbol = countryConfiguration[localStorage.getItem("country")].currencySymbol;
            $("#EACountrySelector").val(localStorage.getItem("country"));
        }
    });
});