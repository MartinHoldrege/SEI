/********************************************************
 * Calculate the CLIMATE CHANGE Sagebrush Ecosystem Integrity model 
 * for the WAFWA Landscape Conservation Design project
 * Written by David Theobald, EXP, dmt@davidmtheobald.com
 * 
*/

// notes made by me Martin Holdrege start with MH

// User-defined variables.
var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90     // output resolution, 90 initially, 30 m eventually
var sampleResolution = 270
var radius = 560    // used to set radius of Gaussian smoothing kernel
var radiusCore = 2000  // defines radius of overall smoothing to get "cores"
var version = '11'

var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019") // defines the study region
var region = biome.geometry()
var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal") 

// image visualization params
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']};
var imageVisQ5sc = {"opacity":1,"bands":["constant_mean"],"min":1, "max":10,"palette":["e7ed8b","23b608","107a0e","082b08"]};

var yearNLCD = '2019'  // needs to be a string

Map.addLayer(ee.Image(1),{},'background',false)

// Human modification dataset (Q4)
var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush');

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

var rangeMaskx = rangeMask.eq(0)
  .multiply(tundra)
  .selfMask().clip(biome)
Map.addLayer(rangeMaskx.selfMask(),{min:1,max:1},'rangeMask from NLCD with playas',false)

// MH--this currently loads v2, there is now a v3 that came out that we may want to use. 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2') // MH--this loads

var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean() // ??? use median instead?

// Load module with functions and HSI curves used below
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js")

/**
* Model overview with steps: 
* 0. calculate ratio of forecast to current biomass predictions
* 1. get 4 year average of % cover from RAP, adjusted by fire perimeters
* 2. smooth % cover from RAP by "ecological" context using Gaussian kernel radius
* 3. convert smoothed % cover to "quality" through HSI curves
* 4. combine resources (sage, perennial) and threats (annual grass, tree, human modification) by multiplication
* 5. smooth quality by "management" level context using Gaussian kernel radius
* 6. find deciles and then reclass to 3-classes: core, grow, treat
* 7. export image with data layers as bands in an image asset
*/


///////////////////////////////////////
// 0. Generate climate change ratio

var RCP = 'RCP85'
var epoch = '2030-2060'  //'2070-2100' // //
var root = 'ClimateOnly_' // 'ClimateOnly_'
//var lstScenarios = ['CESM1-CAM5','CSIRO-Mk3-6-0','CanESM2','FGOALS-g2','FGOALS-s2','GISS-E2-R',
//  'HadGEM2-CC','HadGEM2-ES','IPSL-CM5A-MR','MIROC-ESM','MIROC5','MRI-CGCM3','inmcm4']
  
// mh--for testing same list but without miroc-esm (that one is missing for sagebrush)
var lstScenarios = ['CESM1-CAM5','CSIRO-Mk3-6-0','CanESM2','FGOALS-g2','FGOALS-s2','GISS-E2-R',
'HadGEM2-CC','HadGEM2-ES','IPSL-CM5A-MR','MIROC5','MRI-CGCM3','inmcm4']

var ratioCheatgrass = ee.Image().float()
var ratioPgrass = ee.Image().float()
var ratioSagebrush = ee.Image().float()


for (var i=0; i<lstScenarios.length; i++) {
  print(i)
  var futureCheatgrass = ee.Image('users/DavidTheobald8/USGS/Biomass/' + root + 'Cheatgrass_ChangePropHistoricalMax_' + RCP + '_' + epoch + '_' + lstScenarios[i])

  var x = futureCheatgrass.add(1.0).rename('Cheatgrass'+ '_' + RCP + '_' + epoch + '_' + lstScenarios[i])
  // MH--looks like the file being read in is already the ratio
  var ratioCheatgrass = ratioCheatgrass.addBands(x)

  var futurePgrass = ee.Image('users/DavidTheobald8/USGS/Biomass/' + root + 'Pgrass_ChangePropHistoricalMax_' + RCP + '_' + epoch + '_' + lstScenarios[i])
  var x = futurePgrass.add(1.0).rename('Pgrass'+ '_' + RCP + '_' + epoch + '_' + lstScenarios[i])
  var ratioPgrass = ratioPgrass.addBands(x)

  var futureSagebrush = ee.Image('users/DavidTheobald8/USGS/Biomass/' + root + 'Sagebrush_ChangePropHistoricalMax_' + RCP + '_' + epoch + '_' + lstScenarios[i])
  var x = futureSagebrush.add(1.0).rename('Sagebrush'+ '_' + RCP + '_' + epoch + '_' + lstScenarios[i])
  var ratioSagebrush = ratioSagebrush.addBands(x)
}


//print(futureCheatgrass);
var visParamRatio = {"opacity":1,"min":-0.1,"max":0.1,"palette":["0a3fff","bababa","a50000"]}
Map.addLayer(ratioCheatgrass,{},'Cheatgrass'+ '_' + RCP + '_' + epoch ,false)
Map.addLayer(ratioPgrass,{},'Pgrass'+ '_' + RCP + '_' + epoch ,false)
Map.addLayer(ratioSagebrush,{},'Sagebrush'+ '_' + RCP + '_' + epoch ,false)


///////////////////////////////////////
// 1. step 1 - 
// changed logic of years to incorporate fires
// select RAP year images, but remove years prior if a fire occured in years 1, 2, or 3
var mtbs = ee.FeatureCollection('users/DavidTheobald8/MTBS/mtbs_perims_DD_2018') 
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History') 
Map.addLayer(wildfires,{},'wildfires',false)
var ones = ee.Image(1)
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 
  Map.addLayer(imageWildfire, {min:0, max:1}, 'imageWildfire ' + y, false)
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean().multiply(imageWildfire.selfMask()) // remove,  
  Map.addLayer(rap1, {}, 'rap1 ' + y, false)
  var lstRap = lstRap.add(rap1)
}


var rap = ee.ImageCollection(lstRap).mean() // replace rap collection with wildfire filtered images
Map.addLayer(rap,{},'rap all 4 years',false)

var lstRCMAPsage = ee.List([])
for (var i=yearStart; i<=yearEnd; i++) {
  var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i) // this loads
  var lstRCMAPsage = lstRCMAPsage.add(rcmapSage)
}
var rcmapSage = ee.ImageCollection(lstRCMAPsage).mean().rename('nlcdSage')
Map.addLayer(rcmapSage)

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

var rapAnnualGscenarios = ee.Image().float()
var rapPerennialGscenarios = ee.Image().float()
var nlcdSageScenarios = ee.Image().float()

// apply biomass ratios to RAP data

var Q5yAllList = ee.List([]) // empty container that will hold Q5y for each GCM

// this loop runs almost all they way to the 
// end of the data, cycling through GCMs
for (var i=0; i<lstScenarios.length; i++) {

  print(i)
  var s = '_' + RCP + '_' + epoch + '_' + lstScenarios[i]
  // apply ratio to rap & nlcd data
  var rapAnnualG = rap.select('AFGC')
    .multiply(ratioCheatgrass.select('Cheatgrass' + s))
  var rapAnnualGscenarios = rapAnnualGscenarios.addBands(rapAnnualG.rename('Cheatgrass' + s))
  
  var rapPerennialG = rap.select('PFGC')
    .multiply(ratioPgrass.select('Pgrass' + s))

  var nlcdSage = nlcdSage.select('nlcdSage')
    .multiply(ratioSagebrush.select('Sagebrush' + s))

  Map.addLayer(rapAnnualG,imageVisQ,'rapAnnualG'+s, false)
  Map.addLayer(rapPerennialG,imageVisQ,'rapPerenniallG'+s, false)
  Map.addLayer(nlcdSage,imageVisQ,'nlcdSage'+s, false)


  /**
   * Step 2. smooth raw data
   */
   
  // MH--I think this works by averaging the cells within 560 m of a given focal cell, but weighting the further cells less.
  //the weights are derived from a normal distribution with a sd of 560. 
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
   
  var Q1 = ee.Image(0.0).float()
  var Q2 = ee.Image(0.0).float()
  var Q3 = ee.Image(0.0).float()
  var Q4 = ee.Image(0.0).float()
  var Q5 = ee.Image(0.0).float()
  
  var lstEcoregionIds = ['00000000000000000000','00000000000000000001','00000000000000000002'] // GB, IM, Pl
  for (var e=1; e<=lstEcoregionIds.length; e++) {
    var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('system:index', lstEcoregionIds[e-1])) //
    var Q1x = SEI.raw2HSI(nlcdSage560m, SEI.lstSage2Q, e)
      .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
    // Step 4. is integrated here, multiplying each factor by the earlier one
    var Q1 = Q1.max(Q1x)
  
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
  Map.addLayer(Q1,imageVisQ,'Q1',false)
  var Q2y = Q1.multiply(Q2).clip(biome)
  Map.addLayer(Q2y,imageVisQ,'Q2y',false)
  var Q3y = Q2y.multiply(Q3).clip(biome)
  Map.addLayer(Q3y,imageVisQ,'Q3y',false)
  var Q4y = Q3y.multiply(Q4).clip(biome)
  Map.addLayer(Q4y,imageVisQ,'Q4y',false)
  var Q5y = Q4y.multiply(Q5).clip(biome)
  Map.addLayer(Q5y,imageVisQ,'Q5y',false)
  Map.addLayer(Q5y.updateMask(Q5y.gt(0.0)),imageVisQ,'Q5y selfMask',false)
  
  /**
   * Step 5. Smooth quality values to reflect "management" scale
   */
   
   // creating a image that has a band of Q5y (ie. SEI560) for each GCM (to be used later)

  var Q5yAllList = Q5yAllList.add(Q5y) 
   
  var Q5s = Q5y
    .unmask(0)
    .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
    .multiply(rangeMaskx)
  
  Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s rangeMaskx',false)
    
  /**
   * Step 6. Classify
   * Calculate and classify Q5s into decile classes.
   */
  var Q5s_deciles = Q5s.reduceRegion({reducer: ee.Reducer.percentile([1,10,20,30,40,50,60,70,80,90,100]),
      maxPixels: 1e13, geometry: biome.geometry(), scale: sampleResolution});
   // print('Percentiles for Q5s',Q5s_deciles)
  
  // decile-based classes, derived and hard-coded from Q5s_deciles
  var Q5scdeciles = SEI.decileFixedClasses(Q5s);
  
  // Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
  // Note that the team had discussions about removing "island" < corePatchSize. V1.1 results did NOT include their removal.
  var Q5sc3 = Q5scdeciles.remap([1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1])
  Map.addLayer(Q5scdeciles.selfMask(),imageVisQ5sc,'Q5s decile classes',false)
  Map.addLayer(Q5sc3.selfMask(),{},'Q5s 3 classes',false)
  
  /**
   * Step 7. Export stack of images into bands sent to GEE asset.
   * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
   * and needs to be unpacked when exporting to GeoTIFF.
  */
  var empty = ee.Image().byte()
  
   // MH--this seems to just make a raster of 0s, where 0s represent the \
   // area inside the WAFWA ecoregion polygons
  var imageEcoregions = empty.paint(WAFWAecoregions,1)
  
  var WAFWAoutputs = Q1.float().rename('Q1raw').addBands([
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
    ])
  
  /** Currently not exporting these, run this when have all the 
  Export.image.toAsset({ 
    image: WAFWAoutputs, //single image with multiple bands
    assetId: 'users/MartinHoldrege/SEI/v' + version + '/forecasts/SEIv' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_'  + root + '_' + s + '_20220215',
    description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution + s,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326'    // set to WGS84, decimal degrees
  })
  */

}
/////////////////////////////////////////
// Display additional overlay layers.
var imageBiome = empty.paint(biome,1,2)
Map.addLayer(imageBiome,{},'Biome boundary')

Map.addLayer(imageEcoregions,{},'WAFWA Ecoregions boundary',false)

var Q5yAll = ee.ImageCollection(Q5yAllList)
Map.addLayer(Q5yAll.median(), imageVisQ, "median")