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

var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90;     // output resolution, 90 initially, 30 m eventually

var radius = 560;    // used to set radius of Gaussian smoothing kernel
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = '11'
var SEI = require("users/mholdrege/SEI:src/SEIModule.js"); // functions and other objects
var addToAnnuals = [0, -5, -10, -15, -100, 5, 10, 15]; // for the sensitivity analysis how much to add/subtract to annual cover 
// list of strings for naming layers based on the changes in addToAnnuals
var sList = ['plus0', 'minus5', 'minus10', 'minus15', '0Cover', 'plus5', 'plus10', 'plus15'];
var includeH = true; // true; //logical, whether to include H (human modification) in the calculation of SEI

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var biome = SEI.biome;
var region = SEI.region;
var WAFWAecoregions = SEI.WAFWAecoregions; // polygons outlining the 3 regions
var H = SEI.H2019; // human modification dataset from 2019
var tundra = SEI.tundra;
var rangeMaskx = SEI.mask; 


/// from USGS GAP land cover	
var LC = ee.Image("USGS/GAP/CONUS/2011")	


// MH--this currently loads v2, there is now a v3 that came out that we may want to use. 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2') //

var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean() // ??? use median instead?


/**
* Model overview with steps: 
* 1. get 4 year average of % cover from RAP, adjusted by fire perimeters
* 2. smooth % cover from RAP by "ecological" context using Gaussian kernel radius
* 3. convert smoothed % cover to "quality" through HSI curves
* 4. combine resources (sage, perennial) and threats (annual grass, tree, human modification) by multiplication
* 5. smooth quality by "management" level context using Gaussian kernel radius
* 6. find deciles and then reclass to 3-classes: core, grow, treat
* 7. export image with data layers as bands in an image asset
*/


///////////////////////////////////////
// 1. step 1 - 
// changed logic of years to incorporate fires
// select RAP year images, but remove years prior if a fire occured in years 1, 2, or 3
// DT has made this file public, and I ran into issue exporting it (contains both polygons and lines which
// can't both be in a shapefile)
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History'); 


var ones = ee.Image(1)
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  
  // MH creates a raster where 0 is area of fire, 1 is no fire (that year)
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 

  // MH mean across layers of ic. then multiply to remove areas that are fire
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean().multiply(imageWildfire.selfMask()) // remove,  
  var lstRap = lstRap.add(rap1)
}


var rap = ee.ImageCollection(lstRap).mean() // replace rap collection with mean of wildfire filtered images

// Data characterize the percentage of each 30-meter pixel in the Western United States covered by sagebrush
var rcmap = ee.ImageCollection('USGS/NLCD_RELEASES/2019_REL/RCMAP/V4/COVER');

var yearStartString = ee.Number(yearStart).format("%.0f");
var yearEndString = ee.Number(yearEnd).format("%.0f");
  
//  average sagebrush cover across 4 years
var rcmapSage = rcmap.filter(ee.Filter.gte('system:index', yearStartString))
  .filter(ee.Filter.lte('system:index', yearEndString))
  .select('rangeland_sagebrush')
  .mean()
  .rename('nlcdSage'); 


// remove pixels classified as sage that are "tundra" in high-elevation mountain settings above timerline
var rapAnnualG = rap.select('AFGC') // AFG
  .multiply(tundra) // mask out tundra grass/shrub
var rapPerennialG = rap.select('PFGC') // PFG 
  .multiply(tundra) // mask out tundra grass/shrub
var rapTree = rap.select('TREE') // PFG 
  .multiply(tundra) // mask out tundra grass/shrub
var nlcdSage = rcmapSage
  .multiply(tundra) // mask out tundra grass/shrub


var rapAnnualGscenarios = ee.Image().float()
var rapPerennialGscenarios = ee.Image().float()
var nlcdSageScenarios = ee.Image().float()


var s = '_Current'; // this string contains the GCM when running for future scenarios

// apply ratio to rap & nlcd data
var rapAnnualG = rap.select('AFGC')

var rapPerennialG = rap.select('PFGC')

var nlcdSage = nlcdSage.select('nlcdSage')


  /**
   * Step 2. smooth raw data
   */
   
  // MH--I think this works by averaging the cells within 560 m of a given focal cell, but weighting the further cells less.
  //the weights are derived from a normal distribution with a sd of 560. 
  var nlcdSage560m = nlcdSage.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
    .divide(100.0) // MH convert from % cover to proportion
    .unmask(0.0); // MH masked pixels converted to 0
  var rapAnnualG560m = rapAnnualG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
    .divide(100.0)
    .unmask(0.0);
  var rapPerennialG560m = rapPerennialG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
    .divide(100.0)
    .unmask(0.0);
  var H560m = H.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
    .unmask(0.0); // MH this is human modification
  var rapTree560m = rapTree.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
    .divide(100.0)
    .unmask(0.0);
  
  /**
   * Step 3. convert smoothed % cover to quality using HSI curves
   * Note that remap values for HSI are grouped ecoregion specific: 1st column=Great Basin, 2nd column: Intermountain, 3rd column: Great Plains
   */
   
  var Q1 = ee.Image(0.0).float()
  var Q2 = ee.Image(0.0).float()
  var Q3 = ee.Image(0.0).float()
  var Q4 = ee.Image(0.0).float()
  var Q5 = ee.Image(0.0).float()
  
  var lstEcoregionIds = ['00000000000000000000','00000000000000000001','00000000000000000002'] // GB, IM, Pl
  for (var e=1; e<=lstEcoregionIds.length; e++) {
    var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('system:index', lstEcoregionIds[e-1])) //
    var Q1x = SEI.raw2HSI(nlcdSage560m, SEI.lstSage2Q, e)
      .max(0.001) // MH replaces values less than 0.001 with 0.001
      .multiply(rangeMaskx) // MH values that are not rangeland become zero, 
      .clip(ecoregion) // MH clip to the ecoregion being looped through
      .unmask(0.0) // MH convert masked values to 0.
       
    var Q1 = Q1.max(Q1x) // MH combining ecoregions (because values will be 0 if pixel not in the ecoregion of interest)
  
    var Q2x = SEI.raw2HSI(rapPerennialG560m, SEI.lstPerennialG2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q2 = Q2.max(Q2x)
  
    var Q3x = SEI.raw2HSI(rapAnnualG560m, SEI.lstAnnualG2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q3 = Q3.max(Q3x)
  
    var Q4x = SEI.raw2HSI(H560m, SEI.lstH2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q4 = Q4.max(Q4x)
  
    var Q5x = SEI.raw2HSI(rapTree560m, SEI.lstTree2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q5 = Q5.max(Q5x)
  }
  
  /**
   * Step 3. convert smoothed % cover to quality using HSI curves
   * Note that remap values for HSI are grouped ecoregion specific: 1st column=Great Basin, 2nd column: Intermountain, 3rd column: Great Plains
   */
   
  var Q1 = ee.Image(0.0).float()
  var Q2 = ee.Image(0.0).float()
  var Q3 = ee.Image(0.0).float()
  var Q4 = ee.Image(0.0).float()
  var Q5 = ee.Image(0.0).float()
  
  var lstEcoregionIds = ['00000000000000000000','00000000000000000001','00000000000000000002'] // GB, IM, Pl
  for (var e=1; e<=lstEcoregionIds.length; e++) {
    var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('system:index', lstEcoregionIds[e-1])) //
    var Q1x = SEI.raw2HSI(nlcdSage560m, SEI.lstSage2Q, e)
      .max(0.001) // MH replaces values less than 0.001 with 0.001
      .multiply(rangeMaskx) // MH values that are not rangeland become zero, 
      .clip(ecoregion) // MH clip to the ecoregion being looped through
      .unmask(0.0) // MH convert masked values to 0.
       
    var Q1 = Q1.max(Q1x) // MH combining ecoregions (because values will be 0 if pixel not in the ecoregion of interest)
  
    var Q2x = SEI.raw2HSI(rapPerennialG560m, SEI.lstPerennialG2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q2 = Q2.max(Q2x)
  
    var Q3x = SEI.raw2HSI(rapAnnualG560m, SEI.lstAnnualG2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q3 = Q3.max(Q3x)
  
    var Q4x = SEI.raw2HSI(H560m, SEI.lstH2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q4 = Q4.max(Q4x)
  
    var Q5x = SEI.raw2HSI(rapTree560m, SEI.lstTree2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    var Q5 = Q5.max(Q5x)
  }
  

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

/**
 * Step 6. Classify
 * Calculate and classify Q5s into decile classes.
 */
 
// decile-based classes, derived and hard-coded from Q5s_deciles
var Q5scdeciles = SEI.decileFixedClasses(Q5s);

var Q5sc3 = SEI.remapAllBands(Q5scdeciles, [1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1]);
var cur = ee.Image('projects/usgs-gee-drylandecohydrology/assets/SEI/v11/current/SEIv11_2017_2020_30_Current_20220717');
Map.addLayer(cur.select('Q5sc3'), {min:1, max:3}, 'c3 published', false)
Map.addLayer(cur.select('Q5s'), {min:0, max:1}, 'Q5s published', false)
print(cur.select('Q5s'))
print(Q5sc3.select('original').byte())
Map.addLayer(Q5sc3.select('original').byte(), {min:1, max:3}, 'c3 re-calculated', false)
Map.addLayer(Q5s.select('original'), {min:0, max:1}, 'q5s re-calculated')

// calculating class transisition from original SEI to SEI with one component removed
var bandNames = ee.List(['noSage', 'noPfg', 'noAfg', 'noH', 'noTree']);
var c9List = bandNames
  .map(function(x) {
    var current = Q5sc3.select('original');
    var future = Q5sc3.select(ee.String(x));
    return SEI.calcTransitions(current, future).rename(ee.String(x));
});
    
var c9Image = ee.ImageCollection(c9List).toBands();

var newNamesC9 = c9Image.bandNames().map(function(x) {
  return ee.String(x).replace('^\\d', "c9");
});

var c9Image = c9Image.rename(newNamesC9);

var outputs = Q5s.select("no.*"); // not selecting original SEI band

// prepending Q5s to bandnames
var newNamesQ5s = outputs.bandNames().map(function(x) {
  return ee.String(x).replace("^no", "Q5s_no");
});

var outputs = outputs.rename(newNamesQ5s)
  .addBands(c9Image);



// Export.image.toAsset({ 
//     image: outputs, //single image with multiple bands
//     assetId: path + 'v' + version + '/sensitivity/SEI4component_' + 'v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20230627',
//     description: 'SEI4component_' + 'v' + version + '_' + yearStart + '_' + yearEnd,
//     maxPixels: 1e13, scale: resolution, region: region,
//     crs: 'EPSG:4326'    // set to WGS84, decimal degrees
// });




