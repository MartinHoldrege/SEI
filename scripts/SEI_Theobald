/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var AIM = ee.FeatureCollection("BLM/AIM/v1/TerrADat/TerrestrialAIM"),
    geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-117.42866715670063, 46.72327480678781],
          [-117.42866715670063, 42.53525218838522],
          [-111.29829606295063, 42.53525218838522],
          [-111.29829606295063, 46.72327480678781]]], null, false),
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
    imageVisParam = {"opacity":1,"bands":["Cheatgrass_RCP85_2030-2060_CESM1-CAM5"],"min":-0.1,"max":0.1,"palette":["0a3fff","bababa","a50000"]};
/***** End of imports. If edited, may not auto-convert in the playground. *****/



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
var RAP = true // 'true= rap, false = NLCD', remnant from past decision/work
// MH--this feature is present
var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019") // defines the study region
var region = biome.geometry()
var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal") // MH this loads
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']}

var yearNLCD = '2019'  // needs to be a string

Map.addLayer(ee.Image(1),{},'background',false)


var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush')// MH-- this loads

var explore = true // MH whether to run exploratory code chunks


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

// MH--the stepwat2 rasters below are not available to read in. 


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



// MH--none of the files read in in this list are available to load
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

if (true) { //MH
print('cheat', ratioCheatgrass)
print('sage', ratioSagebrush)
print('Pgras', ratioPgrass)
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
var mtbs = ee.FeatureCollection('users/DavidTheobald8/MTBS/mtbs_perims_DD_2018') // MH--this loads
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History') // MH--this loads
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
for (var i=0; i<lstScenarios.length; i++) {
//var j = 0
//for (var i=j; i<j+1; i++) {
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
//}

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
 
// MH--i don't get how these lists work. (HSI = habitat suitability index). I think columns 2-4, correspond to the 3 ecoregiions
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

//MH I don't understand this function
var raw2HSI = function( image, lst, e) { // generate a linear interpolated reclass for HSI
  var HSI0 = ee.Image(0.0).float()
  for (var i=0; i<lst.length-1; i++) {
    var inMin = ee.Image(lst[i][0])
    var inMax = ee.Image(lst[i+1][0])
    var outMin = ee.Image(lst[i][e])
    var outMax = ee.Image(lst[i+1][e])
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
Map.addLayer(Q5y,imageVisQ,'Q5y',false)
Map.addLayer(Q5y.updateMask(Q5y.gt(0.0)),imageVisQ,'Q5y selfMask',false)

/**
 * Step 5. Smooth quality values to reflect "management" scale
 */
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
 print('Percentiles for Q5s',Q5s_deciles)

// decile-based classes, derived and hard-coded from Q5s_deciles
var Q5scdeciles = Q5s.gt(0.002)
  .add(Q5s.gte(0.009))
  .add(Q5s.gt(0.068))
  .add(Q5s.gt(0.115))
  .add(Q5s.gt(0.173))
  .add(Q5s.gt(0.244))
  .add(Q5s.gt(0.326))
  .add(Q5s.gt(0.431))
  .add(Q5s.gt(0.565)).add(1) // so range is 1-10
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

Export.image.toAsset({ 
  image: WAFWAoutputs, //single image with multiple bands
  assetId: 'users/MartinHoldrege/SEI/v' + version + '/forecasts/SEIv' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_'  + root + '_' + s + '_20211216',
  description: 'SEI' + yearStart + '_' + yearEnd + '_' + resolution + s,
  maxPixels: 1e13, scale: resolution, region: region,
  crs: 'EPSG:4326'    // set to WGS84, decimal degrees
})

}
/////////////////////////////////////////
// Display additional overlay layers.
var imageBiome = empty.paint(biome,1,2)
Map.addLayer(imageBiome,{},'Biome boundary')

Map.addLayer(imageEcoregions,{},'WAFWA Ecoregions boundary',false)

