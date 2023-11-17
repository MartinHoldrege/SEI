/*
Purpose--take a statified sample of current and future (for each GCM)
SEI, Q, Cover, and classification category

This will be outputted, and then analyzed in R

Author: Martin Holdrege

Started: October 4, 2023

*/

// params ---------------------------------------------------------------

var resolution = 90;     // output (and input) resolution

// which version used to calculate SEI?
var versionFull = 'vsw4-3-3';

// which stepwat output to read in?
// var roots = ['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 'fire1_eind1_c4grass1_co21_2311_'];
var roots = ['fire1_eind1_c4grass1_co20_2311_', 'fire1_eind1_c4grass1_co21_2311_'];
var RCP =  'RCP45';
var epoch = '2070-2100';

var nSamples = 20000; // approximate number of grid cells to sample
// var nSamples = 20; // for testing
// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var clim = require("users/mholdrege/SEI:src/loadClimateData.js");
var path = SEI.path;
var region = SEI.region;

for (var i = 0; i < roots.length; i++) {
  var root = roots[i];
  
  // read in data --------------------------------------------------------
  var version = SEI.removePatch(versionFull);
  // * future SEI ---------
  var assetName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';
  
  // this image should have bands showing sei (continuous, 'Q5s_' prefix) and 3 class (Q5sc_ prefix) for each GCM
  var fut0 = ee.Image(path + version + '/forecasts/' + assetName);
  
  // * SEI 'data product' image
  var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
  var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;
  var p = ee.Image(path + version + '/products/' + productName);
  
  // * climate data -----------
  // This is interpolated climate data from STEPWAT (historical and future) (i.e.,
  // this data only has 200 unique values);
  
  var climCur = clim.loadHistoricalSwClim();
  
  var climFut = clim.loadFutureSwClim(RCP, epoch); // image collection, one image per GCM
  
  // * grouping layer
  // for each grid cell this shows which of the 200 stepwat sites the data was interpolated from
  // (i.e. this layer has 200 unique values)
  var groups1 = ee.Image(path + 'interpolation_data/interp_locations_200sites');
  
  // Prepare sample groups -----------------------------------------------
  
  var groups2 = groups1.updateMask(SEI.mask)
    .toInt()
    .rename('site');
    
  var image = groups2;
  
  var areaImage = ee.Image.pixelArea()
    .addBands(image.select('site'));
   
  var areaDict = areaImage.reduceRegion({
        reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'site',
      }),
      geometry: region,
      scale: resolution, // replace with resolution for more accurate estimates
      maxPixels: 1e12
      }); 
    
  // site numbers (1-200)
  var sitesList = ee.List(areaDict.get('groups')).map(function(x) {
    return ee.Dictionary(x).get('site');
  });
  
  // area corresponding to each site
  var areaList = ee.List(areaDict.get('groups')).map(function(x) {
    return ee.Dictionary(x).get('sum');
  });
  
  var areaTotal = areaList.reduce(ee.Reducer.sum());
  
  // fraction of total area, by group
  var areaFrac = areaList.map(function(x) {
    return ee.Number(x).divide(areaTotal);
  });
  
  // number of samples to draw from each group 
  var groupN = areaFrac.map(function(x) {
    return ee.Number(x).multiply(ee.Number(nSamples)).ceil();
  });
  
  
  // creating multiband image to sample -----------------------------------------------
  
  // combining into one image with bands containing GCM name
  var climFutImage = climFut.map(function(x) {
      var image = ee.Image(x);
      var GCM = ee.String('_').cat(image.get('GCM'));
      var newNames = image.bandNames().map(function(x) {
        return ee.String(x).cat(GCM);
      });
      return image.rename(newNames);
    })
    .toBands()
    // removing leading numbers added by toBands
    .regexpRename('^[[:digit:]]+_', '');
  
  // combining bands with historical ('control') and future climate
  var climComb = climCur
    .regexpRename('$', '_control')
    .addBands(climFutImage);
  
  // all bands want to sample from
  var allComb = fut0
    .select(['Q5s_.*', 'Q1raw.*', 'Q2raw.*', 'Q3raw.*', 'Q5sc3_.*', '.*560m.*'])
    // adding the classification change bands
    .addBands(p.select('p7_c9_.*').regexpRename('p7_', ''))
    .addBands(climComb)
    .addBands(groups2);
    
  print(allComb.bandNames());
  
  
  // sampling the image --------------------------------------------------------------
  
  
  var sample1 = allComb.stratifiedSample({
    numPoints: nSamples,
    classBand: 'site',
    region: region,
    scale: resolution,
    projection: SEI.crs,
    seed: 1234,
    classValues: sitesList,
    classPoints: groupN,
    geometries: true
  });
  
  
  // writing output ------------------------------------------------------------------
  
  Export.table.toDrive({
    collection: sample1,
    description: 'lyr-samples_' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM_' + nSamples + 'n',
    folder: 'SEI',
    fileFormat: 'CSV'
  });
  

} // end looping of roots