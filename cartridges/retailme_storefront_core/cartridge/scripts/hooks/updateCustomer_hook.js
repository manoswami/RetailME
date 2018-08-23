var Customer = require('dw/customer/Customer');
var CustomerMgr = require('dw/customer/CustomerMgr');
var System = require('dw/system/System');
var StringUtils = require('dw/util/StringUtils');
var Status = require('dw/system/Status');

exports.beforePatchCustomer = function(customer : Customer , customerInput)
{
	customerInput.c_ZoneLastModified = StringUtils.formatCalendar(System.getCalendar(),"yyyy-MM-dd'T'HH:mm:ss.SSSZ");
	return new Status(Status.OK); 
};