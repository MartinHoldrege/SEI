
/********************************************************
 * 
 * Calculate the Sagebrush Ecosystem Integrity model 
 * under current conditions
 * 
 * This code was modified by Martin Holdrege but is almost 
 * entirely based on the code David Theobald (dmt@davidmtheobald.com)
 * wrote
 * 
 * The purspose is to calculate SEI, this is done by removing
 * step 0, of the Climate change script where the rasters
 * where multiplied by the climate change ratios
 * 
 * Note thate in feb 21, 2022 this code was updated to source
 * assets from MH's assets folder (projects/gee-guest/assets/SEI).
 * These are the assets that DT shared but that I then exported
 * in the 'export_daves"assets2drive.js' script, and then ingested.
*/


// User-defined variables.

var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90     // output resolution, 90 initially, 30 m eventually
var sampleResolution = 270 // MH--this is only used in one place, with no downstream affects
var radius = 560    // used to set radius of Gaussian smoothing kernel
var radiusCore = 2000  // defines radius of overall smoothing to get "cores"
var version = '11'
var path = 'projects/gee-guest/assets/SEI/' // path to where most assets live

// MH--this feature is present
var biome = ee.FeatureCollection(path + "US_Sagebrush_Biome_2019") // provided by DT
var region = biome.geometry()

// polygons outlining the 3 regions
var WAFWAecoregions = ee.FeatureCollection(path + "WAFWAecoregionsFinal") // provided by DT

// image visualization params
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']};
var imageVisQ5sc = {"opacity":1,"bands":["constant_mean"],"min":1, "max":10,"palette":["e7ed8b","23b608","107a0e","082b08"]};
var yearNLCD = '2019'  // needs to be a string

Map.addLayer(ee.Image(1),{},'background',false)

// MH this is the human modification dataset
// At the moment don't use the copy of this data set that I ingest (it is corrupted somehow)
//var H = ee.Image(path + 'hm/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush')
var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush')

/// from USGS GAP land cover	
var LC = ee.Image("USGS/GAP/CONUS/2011")	

// MH randomVisualizer just applies a random color to each of the unique values of the first layer 
Map.addLayer(LC.randomVisualizer(),{},'LC cover',false) //MH--here false means not showing map (unless you select the layer)

// MH--remap converts selected values (which are turndra landcover) to 1, everything else becomes masked
// MH--unmask(0) replaces all masked values with 0.
// MH--eq(0), returning 1 for all cell values that are 0 (i.e. not tundra), 0 otherwise (i.e. flipping the 0 to 1 and 1 to 0)
var tundra = LC.remap([149,151,500,501,502,503,504,505,506,507,549,550,551],[1,1,1,1,1,1,1,1,1,1,1,1,1]).unmask(0).eq(0)	

// MH--I don't understand this layer, but it is loading
var rangeMask = ee.Image('users/chohnz/reeves_nlcd_range_mask_union_with_playas') // mask from Maestas, Matt Jones

// MH -- here 1's are rangelands, and everything else is masked out
var rangeMaskx = rangeMask.eq(0) // MH returns 1 for ranglelands (ie pixels  that are not water bodies, forests etc._
  .multiply(tundra) // MH here 0 is tundra, so turning tundra cells to 0 by multiplications
  .selfMask() // MH uses the raster values as the mask. i.e. all 0s (not rangelands), are masked out
  .clip(biome)
Map.addLayer(rangeMaskx.selfMask(),{min:1,max:1},'rangeMask from NLCD with playas',false)

// MH--this currently loads v2, there is now a v3 that came out that we may want to use. 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2') //

var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean() // ??? use median instead?

// Load module with functions and HSI curves used below
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js")

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

Map.addLayer(wildfires,{},'wildfires',false)
var ones = ee.Image(1)
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  
  // MH creates a raster where 0 is area of fire, 1 is no fire (that year)
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 
  Map.addLayer(imageWildfire, {min:0, max:1}, 'imageWildfire ' + y, false)
  
  // MH mean across layers of ic. then multiply to remove areas that are fire
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean().multiply(imageWildfire.selfMask()) // remove,  
  Map.addLayer(rap1, {}, 'rap1 ' + y, false) // the rap layer now has 'holes' in it. 
  var lstRap = lstRap.add(rap1)
}


var rap = ee.ImageCollection(lstRap).mean() // replace rap collection with mean of wildfire filtered images
Map.addLayer(rap,{},'rap all 4 years',false)


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


// remove pixels classified as sage that are "tundra" in high-elevation mountain settings above timerline
var rapAnnualG = rap.select('AFGC') // AFG
  .multiply(tundra) // mask out tundra grass/shrub
var rapPerennialG = rap.select('PFGC') // PFG 
  .multiply(tundra) // mask out tundra grass/shrub
var rapTree = rap.select('TREE') // PFG 
  .multiply(tundra) // mask out tundra grass/shrub
var nlcdSage = rcmapSage
  .multiply(tundra) // mask out tundra grass/shrub
Map.addLayer(rapAnnualG.selfMask(),{},'rapAnnualG',false)
Map.addLayer(rapPerennialG.selfMask(),{},'rapPerennialG',false)
Map.addLayer(nlcdSage.selfMask(),{},'nlcdSage',false)
if (true) {
var rapAnnualGscenarios = ee.Image().float()
var rapPerennialGscenarios = ee.Image().float()
var nlcdSageScenarios = ee.Image().float()


var s = '_Current'; // this string contains the GCM when running for future scenarios

// apply ratio to rap & nlcd data
var rapAnnualG = rap.select('AFGC')

var rapPerennialG = rap.select('PFGC')

var nlcdSage = nlcdSage.select('nlcdSage')

Map.addLayer(rapAnnualG,imageVisQ,'rapAnnualG'+s, false)
Map.addLayer(rapPerennialG,imageVisQ,'rapPerenniallG'+s, false)
Map.addLayer(nlcdSage,imageVisQ,'nlcdSage'+s, false)


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

// Display Q images
// Step 4. is integrated here, multiplying each factor by the earlier one
// MH--this multiplication is calculating the SEI (continuous), variable
Map.addLayer(Q1,imageVisQ,'Q1',false);
var Q2y = Q1.multiply(Q2); //
Map.addLayer(Q2y,imageVisQ,'Q2y',false);
var Q3y = Q2y.multiply(Q3);
Map.addLayer(Q3y,imageVisQ,'Q3y',false);
var Q4y = Q3y.multiply(Q4);
Map.addLayer(Q4y,imageVisQ,'Q4y',false);
// I only left the clip statement in this last multiply
var Q5y = Q4y.multiply(Q5).clip(biome); // MH this is the final multiple (i.e. SEI560)
Map.addLayer(Q5y,imageVisQ,'Q5y',false); 
Map.addLayer(Q5y.updateMask(Q5y.gt(0.0)),imageVisQ,'Q5y selfMask',false);

/**
 * Step 5. Smooth quality values to reflect "management" scale
 */
 
var Q5s = Q5y // MH this is SEI2000
  .unmask(0)
  .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
  .multiply(rangeMaskx);

// MH here the updateMask call dictates that 0 SEI values aren't shown 
Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s rangeMaskx',false);
  
/**
 * Step 6. Classify
 * Calculate and classify Q5s into decile classes.
 */
 
// MH-- the actually calculated deciles were not used, instead the derived/hard coded ones (below)
// are used. 
var Q5s_deciles = Q5s.reduceRegion({reducer: ee.Reducer.percentile([1,10,20,30,40,50,60,70,80,90,100]),
    maxPixels: 1e13, geometry: biome.geometry(), scale: sampleResolution});
 print('Percentiles for Q5s',Q5s_deciles)

// decile-based classes, derived and hard-coded from Q5s_deciles
var Q5scdeciles = SEI.decileFixedClasses(Q5s);
  
// Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
// Note that the team had discussions about removing "island" < corePatchSize. V1.1 results did NOT include their removal.
var Q5sc3 = Q5scdeciles.remap([1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1]);
Map.addLayer(Q5scdeciles.selfMask(),imageVisQ5sc,'Q5s decile classes',false);
Map.addLayer(Q5sc3.selfMask(),{"min":1, "max":3},'Q5s 3 classes',false)

/**
 * Step 7. Export stack of images into bands sent to GEE asset.
 * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
 * and needs to be unpacked when exporting to GeoTIFF.
*/
var empty = ee.Image().byte()
var imageEcoregions = empty.paint(WAFWAecoregions,1)

var WAFWAoutputsCurrent = Q1.float().rename('Q1raw').addBands([
  Q2.float().rename('Q2raw'),
  Q3.float().rename('Q3raw'),
  Q4.float().rename('Q4raw'),
  Q5.float().rename('Q5raw'),
  Q2y.float().rename('Q2'),
  Q3y.float().rename('Q3'),
  Q4y.float().rename('Q4'),
  Q5y.float().rename('Q5'),
  Q5s.float().rename('Q5s'),
  Q5scdeciles.byte().rename('Q5scdeciles'),
  Q5sc3.byte().rename('Q5sc3'),
  imageEcoregions.byte().rename('SEIecoregions')
  ]);

// This tod ~ 33 minutes when the task was run in the task bar

Export.image.toAsset({ 
  image: WAFWAoutputsCurrent, //single image with multiple bands
  assetId: path + 'v' + version + '/current/SEIv' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + s + '_20220215',
  description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution + s,
  maxPixels: 1e13, scale: resolution, region: region,
  crs: 'EPSG:4326'    // set to WGS84, decimal degrees
})


/////////////////////////////////////////
// Display additional overlay layers.
var imageBiome = empty.paint(biome,1,2)
Map.addLayer(imageBiome,{},'Biome boundary')

Map.addLayer(imageEcoregions,{},'WAFWA Ecoregions boundary',false)
}
