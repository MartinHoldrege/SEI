/**
 * The SEI module contains functions, lists, and other objects
 * These are functions and objects that are re-used in multiple
 * scripts for calculating sagebrush ecological integrity (SEI).
 * Module created by Martin Holdrege, but uses
 * code written by David Theobald
 * @module src/SEIModule
 */


/******************************************************************
 * Habitat suitability index (HSI) curves
 * Here the Column 1 is the break point (i.e x coordinate, a cover value) columns 2-4, 
 * correspond to the Q value for each of the 3 ecoregiions
 * Note that remap values for HSI are grouped ecoregion specific: 
 * 1st column=Great Basin, 2nd column: Intermountain, 3rd column: Great Plains
 * ****************************************************************
*/ 

// HSI for sagebrush
exports.lstSage2Q = [
  [0,0,0,0.33],
  [0.02,0.05,0.05,0.50],
  [0.03,0.10,0.1,0.70],
  [0.05,0.50,0.5,0.90],
  [0.1,1.00,0.75,0.95],
  [0.15,1.00,0.9,1,0],
  [0.2,1.0,0.95,1.0],
  [0.25,1.0,1.0,1.0],
  [0.50,1.00,1.00,1.00],
  [0.75,0.00,1.00,1.00],
  [1.00,1.00,1.00,1.00],
  ];
  
// HSI for perennial grasses
exports.lstPerennialG2Q = [
  [0.00,0.00,0.00,0.00],
  [0.02,0.02,0.02,0.0],
  [0.03,0.05,0.05,0.0],
  [0.05,0.45,0.45,0.2],
  [0.10,1.0,0.70,0.70],
  [0.15,1.0,0.88,0.88],
  [0.20,1.0,0.94,0.94],
  [0.25,1.00,1.00,0.95],
  [0.50,1.00,1.00,1.00],
  [0.75,1.00,1.00,1.00],
  [1.00,1.00,1.00,1.00],
  ];
 
// HSI for annual grasses 
exports.lstAnnualG2Q = [
  [0.00,1.00,1.00,1.00],
  [0.02,0.98,0.98,1.0],
  [0.03,0.95,0.95,1.0],
  [0.05,0.90,0.90,1.0],
  [0.10,0.5,0.50,1.0],
  [0.15,0.25,0.25,0.75],
  [0.20,0.1,0.1,0.55],
  [0.25,0.0,0.0,0.40],
  [0.50,0.00,0.00,0.20],
  [0.75,0.00,0.00,0.00],
  [1.00,0.00,0.00,0.00],
  ];
  
// HSI for human impacts (H stands for human)
exports.lstH2Q = [
  [0.00,1.00,1.00,1.00],
  [0.02,0.95,0.95,0.95],
  [0.03,0.85,0.85,0.85],
  [0.05,0.52,0.52,0.52],
  [0.10,0.10,0.10,0.10],
  [0.15,0.00,0.00,0.00],
  [0.20,0.00,0.00,0.00],
  [0.25,0.00,0.00,0.00],
  [0.50,0.00,0.00,0.00],
  [0.75,0.00,0.00,0.00],
  [1.00,0.00,0.00,0.00],
  ];
  
// HSI for tree cover
exports.lstTree2Q = [
  [0.00,1.00,1.00,1.00],
  [0.02,0.90,0.90,0.90],
  [0.03,0.75,0.75,0.75],
  [0.05,0.50,0.50,0.50],
  [0.10,0.05,0.05,0.05],
  [0.15,0.00,0.00,0.00],
  [0.20,0.00,0.00,0.00],
  [0.25,0.00,0.00,0.00],
  [0.50,0.00,0.00,0.00],
  [0.75,0.00,0.00,0.00],
  [1.00,0.00,0.00,0.00],
  ];

/**
 * generate a linear interpolated reclass for HSI
 * @param {ee.Image} image The image of cover for one of the 5 quality endices 
 * @param {list} lst The list of values that form the HSI curve. These lists are
 * defined above (e.g. lstSage2Q)
 * @param {Number} e The ecoregion for which HSI is calculated (1, 2, or 3)
 * @return {ee.Image} The image with the HSI (Q) values calculated for each pixel,
 * for the given ecoregion and index of choice (e.g. sagebrush cover)
 */
exports.raw2HSI = function( image, lst, e) { // generate a linear interpolated reclass for HSI
  var HSI0 = ee.Image(0.0).float();
  // Note: it may be possible to re-write this as a function applied via map,
  // which could be faster due to parallelization.
  for (var i=0; i<lst.length-1; i++) {
    
    var inMin = ee.Image(lst[i][0]);// 1st column, left side of bin
    var inMax = ee.Image(lst[i+1][0]); // 1st column, right side of bin
    var outMin = ee.Image(lst[i][e]); // Q value 
    var outMax = ee.Image(lst[i+1][e]); // Q value
    var mask = image.gte(inMin).multiply(image.lt(inMax)); // 0/1 mask, 1 if between that range
    var y = mask.multiply(image).unitScale(lst[i][0],lst[i+1][0]); // 0 to 1 values
    var y = y.multiply(outMax.subtract(outMin)).add(outMin).multiply(mask);
    // this addition works because everything not in the cover range, is zero, so subsequent
    // additions (iterations in the loop)
    // are adding to different areas of the raster
    var HSI0 = HSI0.add(y);
  }
  return HSI0;
};

/**
 * Calculated fixed (hard coded decile classes), these are expert derived, and
 * are based on the observed decile classes.
 * @param {ee.Image} Q5sThis is the smoothed sagebrush ecological integrity score
 * (i.e. described as SEI2000 in the manuscript draft)
 * @return {ee.Image} values from 1 to 10, denoting the decile class
 */
exports.decileFixedClasses = function(Q5s) {
  var out = Q5s.gt(0.002)
  .add(Q5s.gte(0.009))
  .add(Q5s.gt(0.068))
  .add(Q5s.gt(0.115))
  .add(Q5s.gt(0.173))
  .add(Q5s.gt(0.244))
  .add(Q5s.gt(0.326))
  .add(Q5s.gt(0.431))
  .add(Q5s.gt(0.565)).add(1) // so range is 1-10
  return(out)
};