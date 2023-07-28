/********************************************************
 * 
 * Purpose: Calculate sagebrush ecosystem integrity, except
 * where one of the components is converted to having a perfect score 
 * (i.e. Q = 1), which effectively means SEI is calculated as the
 * product of the 4 other components. This was done to create 5 sei
 * layers, where each one had a different component excluded.
 * 
 * These layers help answer the question if annuals, trees etc. weren't limiting
 * what could the SEI be. 
 * 
 * Started: June 26, 2023; by Martin Holdrege
 * 
*/


// User-defined variables.

/********************************************************
 * 
 * Calculate sensitivity of SEI under current conditions
 * to changes (increases) in annual covers
 * 
 * Author Martin Holdrege
 * 
 * Date started 4/6/2023
 * 
 * Details:
 * Output includes a layers showing the chaning in sei with fixed percentage
 * point increases in annuals, as wells as the change in the Q values
 * of annuals as a response to those increases in annuals
*/


// User-defined variables.

// User-defined variables.

var yearEnd = 2020;  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3; // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90;     // output resolution, 90 initially, 30 m eventually
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = '11';
var SEI = require("users/mholdrege/SEI:src/SEIModule.js"); // functions and other objects


// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var biome = SEI.biome;
var region = SEI.region;
var rangeMaskx = SEI.mask; 

// read in current SEI data

var seiPath = path  + 'v' + version + '/current/SEIv' + version + '_' + yearStart + '_' + yearEnd + '_30_Current_20220717';
var cur = ee.Image(seiPath);

// Extract Q values

var Q1 = cur.select('Q1raw'); // Sage
var Q2 = cur.select('Q2raw'); // Pfg
var Q3 = cur.select('Q3raw'); // Afg
var Q4 = cur.select('Q4raw'); // Hmod
var Q5 = cur.select('Q5raw'); // Tree


// Step 4.  multiplying each factor by the earlier one
var Q5y_original = Q1
  .multiply(Q2)
  .multiply(Q3)
  .multiply(Q4)
  .multiply(Q5)
  .rename('original');
  
var Q5y = Q5y_original;
var Q5y = Q5y
  .addBands(Q5y_original.divide(Q1).rename('noSage')) // dividing by given Q to remove that component from SEI
  .addBands(Q5y_original.divide(Q2).rename('noPfg'))
  .addBands(Q5y_original.divide(Q3).rename('noAfg'))
  .addBands(Q5y_original.divide(Q4).rename('noH'))
  .addBands(Q5y_original.divide(Q5).rename('noTree'))
  .clip(biome);

  /**
   * Step 5. Smooth quality values to reflect "management" scale
   */
   
var Q5s = Q5y // this is SEI2000
  .unmask(0)
  .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
  .multiply(rangeMaskx);
  
var newNames = Q5s.bandNames().map(function(x) {
  return ee.String(x).replace('_mean', "");
});
  
var Q5s = Q5s.rename(newNames);

// difference between 4 component and 5 component SEI
var Q5sDelta = Q5s.select('no.*').subtract(Q5s.select('original'))

// adding back to original 5 component SEI. Do this b/
// there is a reproducibility problem that is making 'original' layer above, not exactly
// the same as Q5s. Unsur why this is the case. Because Q5y are the same when reproduced here
// something to do with masking, pyramiding or the smoothing algorithm itself having changed?
var Q5s2 = cur.select('Q5s').add(Q5sDelta)

// some testing code--to examine descrepencies when re-calculating Q5s
// var test = Q5y.select('original').subtract(cur.select('Q5'))
// Map.addLayer(test.abs().gte(0.01), {min:0, max: 1, palette: ['white', 'black']}, 'is difference', false)
// Map.addLayer(test, {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'difference 5y')
// Map.addLayer(Q5s.select('original').subtract(cur.select('Q5s')), {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'difference 5s')
// Map.addLayer(rangeMaskx, {}, 'mask')

/**
 * Step 6. Classify
 * Calculate and classify Q5s into decile classes.
 */
 
// decile-based classes, derived and hard-coded from Q5s_deciles
var Q5scdeciles = SEI.decileFixedClasses(Q5s2);

var Q5sc3 = SEI.remapAllBands(Q5scdeciles, [1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1]);
print(Q5sc3)
// calculating class transisition from original SEI to SEI with one component removed
var bandNames = ee.List(['noSage', 'noPfg', 'noAfg', 'noH', 'noTree']);
var c9List = bandNames
  .map(function(x) {
    var future = Q5sc3.select(ee.String(x));
    return SEI.calcTransitions(cur.select('Q5sc3'), future).rename(ee.String(x));
});
    
var c9Image = ee.ImageCollection(c9List).toBands();

var newNamesC9 = c9Image.bandNames().map(function(x) {
  return ee.String(x).replace('^\\d', "c9");
});

var c9Image = c9Image.rename(newNamesC9);

var outputs = Q5s2.select("no.*"); // not selecting original SEI band

// prepending Q5s to bandnames
var newNamesQ5s = outputs.bandNames().map(function(x) {
  return ee.String(x).replace("^no", "Q5s_no");
});

var outputs = outputs.rename(newNamesQ5s)
  .addBands(c9Image);

Export.image.toAsset({ 
    image: outputs, //single image with multiple bands
    assetId: path + 'v' + version + '/sensitivity/SEI4component_' + 'v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20230714',
    description: 'SEI4component_' + 'v' + version + '_' + yearStart + '_' + yearEnd,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326'    // set to WGS84, decimal degrees
});




