/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var AIM = ee.FeatureCollection("BLM/AIM/v1/TerrADat/TerrestrialAIM"),
    image = ee.Image("users/DavidTheobald8/TWS/currentProject_2"),
    geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-113.20991715670063, 43.94377005018131],
          [-113.20991715670063, 42.53525218838522],
          [-111.29829606295063, 42.53525218838522],
          [-111.29829606295063, 43.94377005018131]]], null, false),
    table = ee.FeatureCollection("users/DavidTheobald8/WBDHUC12_201602_30m_mp"),
    imageVisParam5 = {"opacity":1,"bands":["constant"],"min":-0.25,"max":0.25,"palette":["2208ff","bebebe","ff0000"]},
    imageVisParam6 = {"opacity":1,"bands":["constant"],"min":-0.5,"max":0.5,"palette":["2208ff","bebebe","ff0000"]},
    imageVisShrub = {"opacity":1,"bands":["SHR"],"max":40,"palette":["ededed","818729"]},
    imageVisParam8 = {"opacity":1,"bands":["AFGC"],"max":5,"palette":["ededed","ad08b8"]},
    imageVisTree = {"opacity":1,"bands":["TREE"],"max":10,"palette":["e7e7e7","7d9302"]},
    ecoregionalGeometry = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-119.95152547822688, 46.11285630205455],
          [-121.46763875947688, 43.12665463152686],
          [-121.20396688447688, 40.507125047485125],
          [-119.62193563447688, 37.937274439684195],
          [-117.88609579072688, 37.815867951835216],
          [-113.62340047822688, 37.850575936339744],
          [-112.65660360322688, 37.065706124849214],
          [-109.11293513752128, 37.02833272242481],
          [-105.14195516572688, 36.819847746228],
          [-105.97691610322688, 39.76802237981562],
          [-105.22435262666438, 42.71635441680955],
          [-105.44957235322688, 45.70004865717727],
          [-109.18492391572688, 46.264969086535615],
          [-110.83287313447688, 46.85418817680895],
          [-114.98570516572688, 45.530987540977804],
          [-117.60045125947688, 45.592523282039366]]]),
    imageVisParam12 = {"opacity":1,"bands":["PFGC"],"min":-1,"palette":["ff7804","fbff00","dee0db","65ff52","004e02"]},
    imageVisParam13 = {"opacity":1,"bands":["remapped_mean"],"min":0.05000000074505806,"max":0.75,"palette":["ff5606","03ba1a"]},
    imageVisParam14 = {"opacity":1,"bands":["remapped_mean"],"min":0,"max":0.75,"palette":["f3ef81","029114"]},
    imageVisGrass = {"opacity":1,"bands":["PFGC"],"min":-0.9245283018867925,"palette":["ff0000","feffab","00852f"]},
    imageVisParam24 = {"opacity":1,"bands":["remapped_mean_mean"],"min":1,"palette":["000004","180f3e","721f81","cd4071","fd9567","fcfdbf"]},
    imageVisParam25 = {"opacity":1,"bands":["PFGC"],"palette":["e4e6d4","f7ff7c","00852f","004519"]},
    imageVisParam26 = {"opacity":1,"bands":["constant"],"palette":["f3ffe9","0832ff"]},
    imageVisParam27 = {"opacity":1,"bands":["PFGC"],"max":0.2,"palette":["ff0000","feffab","00852f"]},
    imageVisParam28 = {"opacity":1,"bands":["constant"],"min":0,"palette":["f3f1e0","f1eb38","ff7412","d01515","521203"]},
    imageVisParam29 = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["9bbaff","446cda","0d0589"]},
    imageVisHT = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["f4ffb6","77da75","08257a"]},
    imageVisQ5sc = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["e7ed8b","23b608","107a0e","082b08"]},
    image2 = ee.Image("users/DavidTheobald8/WAFWA/v30/SEI_Q5_30_2018_2021_90_20230222");
/***** End of imports. If edited, may not auto-convert in the playground. *****/


/********************************************************
 * Calculate the Sagebrush Ecosystem Integrity model 
 * for the WAFWA Landscape Conservation Design project
 * Written by David Theobald, EXP, dmt@davidmtheobald.com
 *  
*/

//var proj = ee.Image('users/DavidTheobald8/WAFWA/SEI_snapraster_20230118').projection().getInfo()

// User-defined variables.
var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

var connectivityRun = true
var onlySEIQ5 = true
var resolution = 90     // output resolution, 90 initially, 30 m eventually
var sampleResolution = 270
var radius = 560    // used to set radius of Gaussian smoothing kernel
var radiusCore = 2000  // defines radius of overall smoothing to get "cores"
var version = '30'   // value of 30 or more is "version 2 of SEI that uses RAP v3.
//var RAP = true // 'true= rap, false = NLCD', remnant from past decision/work
var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal")
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']}
var sensitivity = 1.0  // multiplier times random normal to generate power exponent for PINNED sensitivity analysis. =0 is best estimate, 0.5, using 1 SD as bounds


if (connectivityRun) {
  var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019_20k") // defines the study region
}
else {
  var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019") // defines the study region
}
var region = biome.geometry()

var stateLevel = false

// Specify the NLCD year because annual data are not available. Eventually could include incremental NLCD year (2013, 2009, 2003, etc.)
if (yearEnd >= 2019) {
  var yearNLCD = '2019'  // needs to be a string
}
else if ((yearEnd >= 2016) && (yearEnd < 2019)) {
  var yearNLCD = '2016'
}
else if ((yearEnd >= 2011) && (yearEnd < 2016)) {
  var yearNLCD = '2011'
}
else if ((yearEnd >= 2006) && (yearEnd < 2011)) {
  var yearNLCD = '2006'
}
else if ((yearEnd >= 2000) && (yearEnd < 2006)) {
  var yearNLCD = '2001'
}

var corePatchPixels = 319 // 640 * 4046.86 / (90 * 90) // in pixels!
var x = 640 * 4046.86 / (resolution * resolution) // in pixels!

Map.addLayer(ee.Image(1),{},'background',false)
var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush')

/// from USGS GAP land cover	
var LC = ee.Image("USGS/GAP/CONUS/2011")	
Map.addLayer(LC.randomVisualizer(),{},'LC cover',false)
var tundra = LC.remap([149,151,500,501,502,503,504,505,506,507,549,550,551],[1,1,1,1,1,1,1,1,1,1,1,1,1]).unmask(0).eq(0)	

var rangeMask = ee.Image('users/chohnz/reeves_nlcd_range_mask_union_with_playas') // mask from Maestas, Matt Jones
var rangeMaskx = rangeMask.eq(0)
  .multiply(tundra)
  .selfMask().clip(biome)
Map.addLayer(rangeMaskx.selfMask(),{min:1,max:1},'rangeMask from NLCD with playas',false)

var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v3')
var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean() // ??? use median instead?

// Javascript code to calculate random normal distribution for sensitivity analysis, using Standard Normal variate using Box-Muller transform.
function randn_bm() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

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
var mtbs = ee.FeatureCollection('users/DavidTheobald8/MTBS/mtbs_perims_DD_2018')
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History')
Map.addLayer(wildfires,{},'wildfires',false)
var ones = ee.Image(1)
var lstWeights = [0.4, 0.3, 0.2, 0.1] // [0.25, 0.25, 0.25, 0.25] // equal weighting, as original model
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 
  Map.addLayer(imageWildfire, {min:0, max:1}, 'imageWildfire ' + y, false)
  var xIndex = yearStart - y + 3
  print(xIndex)
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean()
    .multiply(ee.Image(lstWeights[xIndex]))
    .multiply(imageWildfire.selfMask()) // remove,  
  Map.addLayer(rap1, {}, 'rap1 ' + y, false)
  var lstRap = lstRap.add(rap1)
}
var rap = ee.ImageCollection(lstRap).sum() // replace rap collection with wildfire filtered images
Map.addLayer(rap,{},'rap all 4 years',false)

var rapAnnualG = rap.select('AFG') // AFG
  .multiply(tundra) // mask out tundra grass/shrub
var rapPerennialG = rap.select('PFG') // PFG 
  .multiply(tundra) // mask out tundra grass/shrub
var rapShrub = rap.select('SHR')
  .multiply(tundra) // mask out tundra grass/shrub
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
var nlcdSage = ee.ImageCollection(lstRCMAPsage).mean()
  .multiply(tundra) // mask out tundra grass/shrub
Map.addLayer(nlcdSage.selfMask(),{},'nlcdSage',false)

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
var lstSage2Q = [
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
  ]
var lstPerennialG2Q = [
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
  ]
var lstAnnualG2Q = [
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
  ]
var lstH2Q = [
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
  ]
var lstTree2Q = [
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
  ]

var raw2HSI = function( image, lst, e) { // generate a linear interpolated reclass for HSI
  var HSI0 = ee.Image(0.0).float()
  for (var i=0; i<lst.length-1; i++) {
    var inMin = ee.Image(lst[i][0])
    var inMax = ee.Image(lst[i+1][0])
    var sensitivityPower = (Math.min(Math.max(randn_bm(),-1),1) * sensitivity) + 1.0

    var outMin = ee.Image(lst[i][e]).pow(sensitivityPower)
    var outMax = ee.Image(lst[i+1][e]).pow(sensitivityPower)
    var mask = image.gte(inMin).multiply(image.lt(inMax)) // 0/1 mask
    var y = mask.multiply(image).unitScale(lst[i][0],lst[i+1][0]) // 0 to 1 values
    var y = y.multiply(outMax.subtract(outMin)).add(outMin).multiply(mask)
    var HSI0 = HSI0.add(y)
  }
  return HSI0
}

var Q1 = ee.Image(0.0).float()
var Q2 = ee.Image(0.0).float()
var Q3 = ee.Image(0.0).float()
var Q4 = ee.Image(0.0).float()
var Q5 = ee.Image(0.0).float()

var lstEcoregionIds = ['00000000000000000000','00000000000000000001','00000000000000000002'] // GB, IM, Pl
for (var e=1; e<=lstEcoregionIds.length; e++) {
  var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('system:index', lstEcoregionIds[e-1])) //
  var Q1x = raw2HSI(nlcdSage560m, lstSage2Q, e)
    .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
  // Step 4. is integrated here, multiplying each factor by the earlier one
  var Q1 = Q1.max(Q1x)

  var Q2x = raw2HSI(rapPerennialG560m, lstPerennialG2Q, e)
    .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
  var Q2 = Q2.max(Q2x)

  var Q3x = raw2HSI(rapAnnualG560m, lstAnnualG2Q, e)
    .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
  var Q3 = Q3.max(Q3x)

  var Q4x = raw2HSI(H560m, lstH2Q, e)
    .max(0.001).multiply(rangeMaskx).clip(ecoregion).unmask(0.0)
  var Q4 = Q4.max(Q4x)

  var Q5x = raw2HSI(rapTree560m, lstTree2Q, e)
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
  .rename('Q5_' + yearStart + '_' + yearEnd)
Map.addLayer(Q5y,imageVisQ,'Q5y',false)
Map.addLayer(Q5y.updateMask(Q5y.gt(0.0)),imageVisQ,'Q5y selfMask',false)

/** 
 * Export just the Q5 layer for dynamic connectivity
 */
if (onlySEIQ5 ) {
  Export.image.toAsset({ 
  image: Q5y.float(), //single image with multiple bands
  assetId: 'users/DavidTheobald8/WAFWA/v' + version + '/SEI_Q5_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20230222',
  description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution,
  maxPixels: 1e13, scale: resolution, region: region,
  crs: 'EPSG:4326',    // set to WGS84, decimal degrees
 // crsTransform: proj.transform

})
}
else {

  /**
   * Step 5. Smooth quality values to reflect "management" scale
   */
  var Q5s = Q5y
    .unmask(0)
    .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
    .multiply(rangeMaskx)
  
  Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s rangeMaskx',false)
    
  
  
  /** Step x. Prioritize for a given state rather than for the full biome.
   * 
   */
  var decilesIndex = 0 // 0 is for full biome
  if (stateLevel) {
    var stateName = 'WY'
    var decilesIndex = 11 // 6 = Nevada 
    var state = ee.FeatureCollection('users/DavidTheobald8/Census/2020/tl_2020_us_state').filter(ee.Filter.eq('NAME', stateName))
    var Q5s = Q5s.clip(state)
    Map.addLayer(Q5s,imageVisQ,'Q5s for state',false)
  }
  
  /**
   * Step 6. Classify
   * Calculate and classify Q5s into decile classes.
   */
  
  var Q5snormalized = Q5s.unitScale(0.002,0.7988110599354487).min(1.0).max(0) // normalized with 1 and 99% for the BIOME
  
  var Q5s_deciles = Q5snormalized.reduceRegion({reducer: ee.Reducer.percentile([1,10,20,30,40,50,60,70,80,90,100]),
      maxPixels: 1e13, geometry: biome, scale: sampleResolution});
  //print('Percentiles for Q5s',Q5s_deciles)
  
  var lstDeciles = [
    [0.002, 0.009, 0.068, 0.115, 0.173, 0.244, 0.326, 0.431, 0.565], //full biome
    [0.001, 0.001, 0.001, 0.027, 0.066, 0.145, 0.246, 0.394, 0.605], // 1 for Arizona, values rounded...
    [0.001, 0.001, 0.001, 0.027, 0.074, 0.160, 0.293, 0.457, 0.668], // 2 for CA, values rounded...
    [0.001, 0.001, 0.001, 0.035, 0.082, 0.152, 0.262, 0.410, 0.605], // 3 for Colorado, values rounded...
    [0.001, 0.001, 0.011, 0.043, 0.098, 0.176, 0.285, 0.433, 0.644], // 4 for Idaho, values rounded...
    [0.001, 0.001, 0.011, 0.035, 0.082, 0.160, 0.254, 0.402, 0.598], // 5 for Montana, values rounded...
    [0.001, 0.001, 0.011, 0.035, 0.082, 0.152, 0.254, 0.387, 0.574], // 6 for Nevada, values rounded...
    [0.001, 0.001, 0.011, 0.035, 0.089, 0.184, 0.301, 0.449, 0.629], // 7 for New Mexico, values rounded...
    [0.001, 0.001, 0.011, 0.043, 0.105, 0.191, 0.309, 0.433, 0.597], // 8 for Oregon, values rounded...
    [0.001, 0.001, 0.011, 0.043, 0.098, 0.176, 0.293, 0.441, 0.613], // 9 for Utah, values rounded...
    [0.001, 0.001, 0.011, 0.035, 0.082, 0.160, 0.277, 0.434, 0.652], // 10 for Washington, values rounded...
    [0.001, 0.001, 0.011, 0.043, 0.105, 0.191, 0.316, 0.480, 0.691], // 11 for Wyoming, values rounded...
    ]
  // decile-based classes, derived and hard-coded from Q5s_deciles
  var Q5scdeciles = Q5s.gt(lstDeciles[decilesIndex][0])
    .add(Q5s.gte(lstDeciles[decilesIndex][1]))
    .add(Q5s.gt(lstDeciles[decilesIndex][2]))
    .add(Q5s.gt(lstDeciles[decilesIndex][3]))
    .add(Q5s.gt(lstDeciles[decilesIndex][4]))
    .add(Q5s.gt(lstDeciles[decilesIndex][5]))
    .add(Q5s.gt(lstDeciles[decilesIndex][6]))
    .add(Q5s.gt(lstDeciles[decilesIndex][7]))
    .add(Q5s.gt(lstDeciles[decilesIndex][8])).add(1) // so range is 1-10
  Map.addLayer(Q5scdeciles.selfMask(),imageVisQ5sc,'Q5s decile classes',false)
  
  // Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
  // Note that the team had discussions about removing "island" < corePatchSize. V1.1 results did NOT include their removal.
  var Q5sc3 = Q5scdeciles.remap([1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1])
  Map.addLayer(Q5scdeciles.selfMask(),imageVisQ,'Q5s decile classes',false)
  Map.addLayer(Q5sc3.selfMask(),{},'Q5s 3 classes',false)
  
  /**
   * Step 7. Export stack of images into bands sent to GEE asset.
   * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
   * and needs to be unpacked when exporting to GeoTIFF.
  */
  var empty = ee.Image().byte()
  var imageEcoregions = empty.paint(WAFWAecoregions,1)
  
  // TO RUN WHOLE STACK
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
    imageEcoregions.byte().rename('SEIecoregions'),
    nlcdSage560m.multiply(100).byte().rename('sage560m'),
    rapAnnualG560m.multiply(100).byte().rename('annualG560m'),
    rapPerennialG560m.multiply(100).byte().rename('perennialG560m'),
    rapTree560m.multiply(100).byte().rename('tree560m'),
    H560m.multiply(100).byte().rename('H560m')
    ])
  
  // To run just 3 classes
  //var WAFWAoutputs = Q5sc3.byte().rename('Q5sc3')
  
  Export.image.toAsset({ 
    image: WAFWAoutputs, //single image with multiple bands
    assetId: 'users/DavidTheobald8/WAFWA/v' + version + '/SEI_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20220526',
    description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326',    // set to WGS84, decimal degrees
    //crsTransform: proj.transform
  })
  Export.image.toAsset({ 
    image: WAFWAoutputs, //single image with multiple bands
    assetId: 'users/DavidTheobald8/WAFWA/v' + version + '/SEIv_Q5sc3_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20220526',
    description: 'SEI_SEIv_Q5sc3' + yearStart + '_' + yearEnd + '_' + resolution,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326' ,   // set to WGS84, decimal degrees
   // crsTransform: proj.transform
  })
  
  if (sensitivity != 1.0) {
    Export.image.toAsset({ 
      image: WAFWAoutputs.select('Q5s'), //single image with single bands
      assetId: 'users/DavidTheobald8/WAFWA/v' + version + '/s1_Q5s_SEI_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_20211228',
      description: 's_Q5s_SEI' + yearStart + '_' + yearEnd + '_' + resolution,
      maxPixels: 1e13, scale: resolution, region: region,
      crs: 'EPSG:4326',    // set to WGS84, decimal degrees
    //crsTransform: proj.transform
    })
  }
/////////////////////////////////////////
// Display additional overlay layers.
var imageBiome = empty.paint(biome,1,2)
Map.addLayer(imageBiome,{},'Biome boundary',false)

Map.addLayer(imageEcoregions,{},'WAFWA Ecoregions boundary',false)

  
}


