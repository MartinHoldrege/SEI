/**
 * The SEI module contains functions, lists, and other objects
 * These are functions and objects that are re-used in multiple
 * scripts for calculating sagebrush ecological integrity (SEI).
 * Module created by Martin Holdrege, but uses
 * code written by David Theobald
 * 
 * load like this:
 * var m = require("users/mholdrege/SEI:src/SEIModule.js");
 * 
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
  [0.15,1.00,0.9,1.0],
  [0.2,1.0,0.95,1.0],
  [0.25,1.0,1.0,1.0],
  [0.50,1.00,1.00,1.00],
  [0.75,1.00,1.00,1.00],
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
 *     defined above (e.g. lstSage2Q)
 * @param {Number} e The ecoregion for which HSI is calculated (1, 2, or 3)
 * @return {ee.Image} The image with the HSI (Q) values calculated for each pixel,
 *     for the given ecoregion and index of choice (e.g. sagebrush cover)
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
 *    are based on the observed decile classes.
 * @param {ee.Image} Q5sThis is the smoothed sagebrush ecological integrity score
 *     (i.e. described as SEI2000 in the manuscript draft)
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
  .add(Q5s.gt(0.565)).add(1); // so range is 1-10
  return(out);
};

/**
 * Smooth pixels within a 560 m neighborhood
 * @param {ee.Image} image to smooth
 * @return {ee.Image} image with smoothed pixel values
 */
exports.mean560 = function(image) {
  var out = image.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'));
  return out;
};


/**
 * return a list with element repeated n times
 * I'm just copying this function from here:
 * https://stackoverflow.com/questions/12503146/create-an-array-with-same-element-repeated-multiple-times
 * @ param elem to be repeated
 * @ param n number of times to repeat the element
 * @ returns a list
 */
var repeatelem = exports.repeatelem = function(elem, n){
    // both exporting and assigning to a variable so that it can be 
    // used in the function below
    // returns an array with element elem repeated n times.
    var arr = [];

    for (var i = 1; i <= n; i++) {
        arr = arr.concat(elem);
    }

    return arr;
};

/**
 * return a list with each element of elemList return nList times
 * @ param elemList list of elements to be repeated
 * @ param nList, same length as elemList, defining how many times
 *    each element of that list should be repeated
 * @ returns a list
 */
exports.repeatelemList = function(elemList, nList) {
  
  if (elemList.length != nList.length) {
    throw 'arguments must have the same length';
  }
  
  var out = [];
  for (var i = 0; i < elemList.length; i++) {
    var out = out.concat(repeatelem(elemList[i], nList[i]));
  }
  return out;
};

/**
 * Read in a number of images that have the same path except
 * for one substitution
 * @ param string, genericpath is a string that is the path to the
 * images including the full asset name except 'ZZZZ' is put in
 * the location of the string that differs between the assets
 * @ param nameList, a list of strings to replace the 'ZZZZ' part of
 * the file path
 * @ returns an image where each band has a name from nameList
 */
exports.readImages2Bands = function(genericPath, nameList, combineRename) {
    sw1 = ee.Image(0);
    for (var i=0; i<nameList.length; i++) {
      var name = nameList[i];
      var newPath = genericPath.replace('ZZZZ', name);
      var image = ee.Image(newPath)
        .rename(name);
        
      var sw1 = sw1.addBands(image);
    
    }
    // set default to true;
    if (combineRename === undefined || combineRename === null){
      var combineRename = true;
    }
    if(combineRename){
      var annual = sw1.select('Aforb')
        .add(sw1.select('Cheatgrass'))
        .rename('afg');
        
      // perennial forb and grass aboveground biomass (simulated)
      var perennial = sw1.select('Pherb')
        .rename('pfg');  
        
      // sagebrush aboveground biomass (simulated)
      var sage = sw1.select('Sagebrush')
        .rename('sage');
        
      var out = annual.addBands(perennial).addBands(sage);
    } else {
      var out = sw1;
    }
    return out;
  };

/**
 * Remap all bands in an image
 * @param {ee.Image} image The multiband image you wan't to remap
 * @param {list} from list of values to remap from
* @param {list} t list of values to remap to
 * @return {ee.Image} Image with the same bandNames as the input
*/
var remapAllBands = function(image, from, to) {
  var bands = image.bandNames();
  
  var renamedList = bands.map(function(band) {
    var out = image
      .select(ee.String(band))
      .remap(from, to);
    
    return out;
  });
  
  var remappedImage = ee.ImageCollection(renamedList)
    .toBands()
    .rename(bands);
    
  return remappedImage;
};

exports.remapAllBands = remapAllBands;

// transitions between classes (median) --------------------------------------
  
/**
 * create 9 class transition raster
 * @param {ee.Image} current containing 1 band, which is the current
 * 3 SEI classes, ie. the raster contains values of 1, 2 or 3 (CSA, GOA, and ORA)
 * @param {ee.Image} future 3 class raster, providing future designations of CSA, GOA and ORA
 * (this can have multiple bands--e.g. one for each gcm)
 * @return {ee.Image} image with same bandNames as the 'future' input layer, pixels have values
 * from 1-9, with the following meanings: 
 * 1:stable core
 * 2: core becomes grow
 * 3: core becomes other
 * 4: grow becomes core
 * 5: stable grow
 * 6: grow becomes other
 * 7: other becomes core
 * 8: other becomes grow
 * 9: stable other
*/
exports.calcTransitions = function(current, future) {
  
  // multiply current c3 values by 10
  var current10 = current.multiply(10);
  
  // adding the two rasters together, this creates 9 categories (hence 'c9' in object names),
  // for example: 
  // 11 means that an area was a core area and stayed a core area
  // 12 = core area becomes grow
  // 13 = core becomes impacted
  // 32 = impacted becomes grow
  // etc.

  var c9a = current10.add(future);
  
  // lists for remapping
  var c9From = ee.List([11, 12, 13, 21, 22, 23, 31, 32, 33]); 
  var c9To = ee.List([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  var out = remapAllBands(c9a, c9From, c9To) // this function can handle multi band images
    .toByte(); // to save space
  
  return(out);
};

/*

Commonly used mask (of the sagebrush region) and outline of the sagebrush region

*/


var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/'; // path to where most assets live
exports.path = path;

var biome = ee.FeatureCollection(path + "US_Sagebrush_Biome_2019"); // defines the study region

exports.biome = biome;
exports.region = biome.geometry();


/// from USGS GAP land cover	
var LC = ee.Image("USGS/GAP/CONUS/2011");

// MH--remap converts selected values (which are turndra landcover) to 1, everything else becomes masked
// MH--unmask(0) replaces all masked values with 0.
// MH--eq(0), returning 1 for all cell values that are 0 (i.e. not tundra), 0 otherwise (i.e. flipping the 0 to 1 and 1 to 0)
var tundra = LC.remap([149,151,500,501,502,503,504,505,506,507,549,550,551],[1,1,1,1,1,1,1,1,1,1,1,1,1])
  .unmask(0)
  .eq(0);	

exports.tundra = tundra;

var rangeMask = ee.Image('users/chohnz/reeves_nlcd_range_mask_union_with_playas'); // mask from Maestas, Matt Jones

// primary sagebrush ecosystem mask used in other scripts
exports.mask = rangeMask.eq(0)
  .multiply(tundra) // mask out tundra grass/shrub
  .selfMask()
  .clip(biome);

// misc datasets commonly used other scripts--so just defining here

// polygons outlining the 3 regions
// here adding a 'ecoregion' name to the ecoregion featurecollection for
// easier subsetting
var ecoregions1 = ee.FeatureCollection(path + "WAFWAecoregionsFinal"); // provided by DT
var ecoregionDict = ee.Dictionary({'00000000000000000000': 'GreatBasin',
  '00000000000000000001': 'Intermountain',
  '00000000000000000002': 'Plains'});

var ecoregions2 = ecoregions1.map(function(x) {
  var feat = ee.Feature(x);
  var index = feat.get("system:index");
  var region = ecoregionDict.values(ee.List([ee.String(index)])); // use dictionary as a lookup table
  // region is a list of length 1
  var out = feat.set('ecoregion', ee.String(region.get(0))); // set ecoregion property
  return out;
});

// Map.addLayer(ecoregions2.filter(ee.Filter.eq('ecoregion', 'Intermountain')), {}, 'Plains')
  
exports.WAFWAecoregions = ecoregions2;

// human modification dataset
exports.H2019 = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_2019_90_60ssagebrush');


// For setting the projection (albers conical equal area)
exports.crs = ee.ImageCollection('USGS/NLCD_RELEASES/2019_REL/NLCD').first().projection().wkt().getInfo();

// SEI raster from Theobald for current time period
var curYearEnd= 2020; // change to 2021 when have v30 asset. 
exports.curYearStart = curYearEnd;
var curYearStart = curYearEnd - 3;
exports.curYearStart = curYearStart;

// at the meoment I don't have access to v30 asset so using v11 asset. 
// exports.cur = ee.Image('users/DavidTheobald8/WAFWA/v30/SEI_v30_' + curYearStart + '_' + curYearEnd + '_90_20230322');
exports.cur = ee.Image('users/DavidTheobald8/WAFWA/v11/SEIv11_' + curYearStart + '_' + curYearEnd + '_90_20211228');

// GCMs
exports.GCMList = ['CESM1-CAM5','CSIRO-Mk3-6-0','CanESM2','FGOALS-g2','FGOALS-s2','GISS-E2-R',
      'HadGEM2-CC','HadGEM2-ES','IPSL-CM5A-MR','MIROC-ESM','MIROC5','MRI-CGCM3','inmcm4'];
      
      