/**
 * @module calculate.js
 *
 * This javascript file implements methods (via Common.js exports) that are needed by
 * the new (smaller) CalculateCart.ds script file.  This allows OCAPI calls to reference
 * these tools via the OCAPI 'hook' mechanism
 *
 */

/**
 * @function calculate
 *
 * calculate is the arching logic for computing the value of a basket.  It makes
 * calls into cart/calculate.js and enables both SG and OCAPI applications to share
 * the same cart calculation logic.
 *
 * @param {object} basket The basket to be calculated
 */

 importPackage( dw.system );
 importScript("retailme_storefront_core:cart/CalculateCart.ds");
 var calculateCart = new CalculateCart();
 /*
 * the calculate basket hook
 */
exports.calculate = function(basket) {
	// call the script
	calculateCart.calculateCart(basket);
	return new Status(Status.OK);
};

 
