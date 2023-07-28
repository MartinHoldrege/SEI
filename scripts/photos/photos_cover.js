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

var resolution = 90     // 

var radius = 560;    // used to set radius of Gaussian smoothing kernel

var SEI = require("users/mholdrege/SEI:src/SEIModule.js"); // functions and other objects


// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var H = SEI.H2019; // human modification dataset from 2019


var photos1 = ee.FeatureCollection(path + 'photo_coords_v1'); // coordinates of photo locations

// MH--this currently loads v2, there is now a v3 that came out that we may want to use. 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2'); //

var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean(); // ??? use median instead?


/**
* Overview of steps: 
* 1. get 4 year average of % cover from RAP, adjusted by fire perimeters
* 2. smooth % cover from RAP by "ecological" context using Gaussian kernel radius
* 3. extract smoothed cover at photo points
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

var lstRCMAPsage = ee.List([])
for (var i=yearStart; i<=yearEnd; i++) {
  // Data characterize the percentage of each 30-meter pixel in the Western United States covered by sagebrush
  var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i)
    // Note--I somehow screwed up ingesting these rcmap rasters so at least for now keep
    // loading the ones DT made publically available
  //var rcmapSage = ee.Image(path + "rcmap/rcmap_sagebrush_" + i) // from DT
  var lstRCMAPsage = lstRCMAPsage.add(rcmapSage)
}

var rcmapSage = ee.ImageCollection(lstRCMAPsage).mean().rename('nlcdSage') // MH average sagebrush cover across 4 years



var rapAnnualG = rap.select('AFGC') // AFG
var rapPerennialG = rap.select('PFGC') // PFG 
var rapTree = rap.select('TREE') 
var nlcdSage = rcmapSage


var rapAnnualG = rap.select('AFGC')

var rapPerennialG = rap.select('PFGC')

var nlcdSage = nlcdSage.select('nlcdSage')

/**
 * Step 2. smooth raw data
 */
 
var nlcdSage560m = nlcdSage.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0) // MH convert from % cover to proportion

var rapPerennialG560m = rapPerennialG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0);

var rapAnnualG560m = rapAnnualG.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0)
  
var H560m = H.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'));

var rapTree560m = rapTree.reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(560,560 * 1,'meters'))
  .divide(100.0);
  

/*
  Step 3. Extract data at photo locations
*/

var cover560 = nlcdSage560m.rename('sage560')
  .addBands(rapPerennialG560m.rename('pft560'))
  .addBands(rapAnnualG560m.rename('afg560'))
  .addBands(H560m.rename('hmod560'))
  .addBands(rapTree560m.rename('tree560'));


var photoStats1 = cover560.reduceRegions(photos1, ee.Reducer.mean(), resolution);

Export.table.toDrive({
  collection: photoStats1, 
  description: 'photos_cover560_v1',
  folder: 'SEI',
  fileFormat: 'CSV'
});











