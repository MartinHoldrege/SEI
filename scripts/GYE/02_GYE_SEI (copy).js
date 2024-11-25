/*Purpose: Recreate the main SCD layers for the greater yellowstone ecostem (GYE)
  This is using v3.0 of the SCD, but with a different (less expansive mask)
  
  Author: Martin Holdrege (adapting code written by Dave Theobald)
  
  Date started: Nov. 11, 2024

*/

// dependencies -------------------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// parameters ----------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/';
var yearEnd = 2021;  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3; // inclusive
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = 30;
var resolution = 90;

// load data -----------------------------------------------------------

// 2019-2021 threat based ecostates file (provided by B. Sparklin)
var forMask = ee.Image(path + 'GYE/ThreatBasedEcostates_GYE');
var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area');

var WAFWAecoregions = SEI.WAFWAecoregions; // polygons outlining the 3 regions
var H = SEI.H2019; // human modification dataset from 2019 

var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v3');
var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean();

// checks -------------------------------------------------------------------

if(yearEnd < 2019) {
  throw new Error('code needs to be updated to use different human modification layer');
}

// prepare mask -------------------------------------------------------

var mask = forMask.gt(0).selfMask();
var rangeMaskx = mask;

// note --the tundra layer used in the regular SEI calculation,
// masks out some areas that should be included in the GYE SEI layers,
// so won't be applying the tundra mask (to the cover layers)
Map.addLayer(mask, {palette: 'blue'}, 'mask', false);
Map.addLayer(SEI.tundra.selfMask(), {palette: 'red'}, 'tundra', false);

///////////////////////////////////////
// 1. step 1 - 
// changed logic of years to incorporate fires
// select RAP year images, but remove years prior if a fire occured in years 1, 2, or 3

var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History')
var ones = ee.Image(1)
var lstWeights = [0.25, 0.25, 0.25, 0.25] // equal weighting, as original model // [0.25, 0.25, 0.25, 0.25] 
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 
  Map.addLayer(imageWildfire, {min:0, max:1}, 'imageWildfire ' + y, false)
  var xIndex = yearStart - y + 3
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean()
    .multiply(ee.Image(lstWeights[xIndex]))
    .multiply(imageWildfire.selfMask()) // remove,  
  var lstRap = lstRap.add(rap1)
}
var rap = ee.ImageCollection(lstRap).sum() // replace rap collection with wildfire filtered images

var rapAnnualG = rap.select('AFG') // AFG

var rapPerennialG = rap.select('PFG') // PFG 

var rapShrub = rap.select('SHR')

var rapTree = rap.select('TRE')

Map.addLayer(rapAnnualG,{},'rapAnnualG',false)
Map.addLayer(rapPerennialG,{},'rapPerennialG',false)
Map.addLayer(rapShrub,{},'rapShrub',false)
Map.addLayer(rapTree,{},'rapTree',false)

// NOTE: sagebrush does not have removal of previous wildfire 
var lstRCMAPsage = ee.List([])
for (var i=yearStart; i<=yearEnd; i++) {
  var rcmapSage = ee.Image("USGS/NLCD_RELEASES/2019_REL/RCMAP/V5/COVER/" + i).select('rangeland_sagebrush')
  //var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i) // REPLACED
  var lstRCMAPsage = lstRCMAPsage.add(rcmapSage)
}
// remove pixels classified as sage that are "tundra" in high-elevation mountain settings above timerline
var nlcdSage = ee.ImageCollection(lstRCMAPsage).mean();

Map.addLayer(nlcdSage.selfMask(),{},'nlcdSage',false);

/**
 * Step 2. smooth raw data
 */
var nlcdSage560m = nlcdSage.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0)
  .unmask(0.0);
var rapAnnualG560m = rapAnnualG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0)
  .unmask(0.0);
var rapPerennialG560m = rapPerennialG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0)
  .unmask(0.0);
var H560m = H.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .unmask(0.0);
var rapTree560m = rapTree.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0)
  .unmask(0.0);
  
     /**
     * Step 3. convert smoothed % cover to quality using HSI curves
     * Note that remap values for HSI are grouped ecoregion specific: 1st column=Great Basin, 2nd column: Intermountain, 3rd column: Great Plains
     */
     
var Q1 = ee.Image(0.0).float();
var Q2 = ee.Image(0.0).float();
var Q3 = ee.Image(0.0).float();
var Q4 = ee.Image(0.0).float();
var Q5 = ee.Image(0.0).float();

var ecoregionNms = ['GreatBasin', 'Intermountain', 'Plains']; // GB, IM, Pl

for (var e=1; e<=ecoregionNms.length; e++) {
  var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('ecoregion', ecoregionNms[e-1])); //
  var Q1x = SEI.raw2HSI(nlcdSage560m, SEI.lstSage2Q, e)
    .max(0.001) // eplaces values less than 0.001 with 0.001
    .multiply(mask) // values that are not rangeland become zero, 
    .clip(ecoregion) // clip to the ecoregion being looped through
    .unmask(0.0); // convert masked values to 0.
     
  var Q1 = Q1.max(Q1x); // MH combining ecoregions (because values will be 0 if pixel not in the ecoregion of interest)

  var Q2x = SEI.raw2HSI(rapPerennialG560m, SEI.lstPerennialG2Q, e)
    .max(0.001)
    .multiply(mask)
    .clip(ecoregion)
    .unmask(0.0);
  
  var Q2 = Q2.max(Q2x);

  var Q3x = SEI.raw2HSI(rapAnnualG560m, SEI.lstAnnualG2Q, e)
    .max(0.001)
    .multiply(mask)
    .clip(ecoregion)
    .unmask(0.0);
    
  var Q3 = Q3.max(Q3x);
  
  var Q4x = SEI.raw2HSI(H560m, SEI.lstH2Q, e)
    .max(0.001).multiply(mask).clip(ecoregion).unmask(0.0);
  var Q4 = Q4.max(Q4x);

  var Q5x = SEI.raw2HSI(rapTree560m, SEI.lstTree2Q, e)
    .max(0.001).multiply(mask).clip(ecoregion).unmask(0.0);
  var Q5 = Q5.max(Q5x);
}  

// Display Q images
// Step 4. is integrated here, multiplying each factor by the earlier one
// this multiplication is calculating the SEI (continuous), variable
    

    var Q2y = Q1.multiply(Q2); 
    var Q3y = Q2y.multiply(Q3);
    var Q4y = Q3y.multiply(Q4);
    var Q5y = Q4y.multiply(Q5).clip(region)
      .rename('Q5_' + yearStart + '_' + yearEnd);

/**
 * Step 5. Smooth quality values to reflect "management" scale
 */
 
var Q5s = Q5y // this is SEI2000
  .unmask(0)
  .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
  .multiply(mask);
  
// convert to 3 classes. 
var Q5sc3 = SEI.seiToC3(Q5s);

/**
 * Step 7. Export stack of images into bands sent to GEE asset.
 * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
 * and needs to be unpacked when exporting to GeoTIFF.
*/
var WAFWAoutputs = Q1.float().rename('Q1raw').addBands([
  Q2.float().rename('Q2raw'),
  Q3.float().rename('Q3raw'),
  Q4.float().rename('Q4raw'),
  Q5.float().rename('Q5raw'),
  Q5s.float().rename('Q5s'),
  Q5sc3.byte().rename('Q5sc3'),
  nlcdSage560m.multiply(100).byte().rename('sage560m'),
  rapAnnualG560m.multiply(100).byte().rename('annualG560m'),
  rapPerennialG560m.multiply(100).byte().rename('perennialG560m'),
  rapTree560m.multiply(100).byte().rename('tree560m'),
  H560m.multiply(100).byte().rename('H560m')
  ]);
  
Export.image.toAsset({ 
  image: WAFWAoutputs, //single image with multiple bands
  assetId: path  + 'GYE/v' + version + '/SEI_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_GYE_ecoStateMask_20241126',
  description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution,
  maxPixels: 1e13, scale: resolution, region: region,
  crs: 'EPSG:4326',    // set to WGS84, decimal degrees
  //crsTransform: proj.transform
});



