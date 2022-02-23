/**
 * The purpose of this script is to identify transitions
 * in SEI between current and future conditions.
 * For example what grid cells remain core areas, 
 * vs go from core to impacted areas.
 * 
 * Written by Martin Holdrege
 * Script started Feb 15, 2022
 * 
 * Overview:
 *  This script reads in raster of SEI classified
 * into three areas (core, grow, impacted), under current 
 * conditions (created in the 01_SEI_current.js script) and
 * a raster of the classified SEI under future conditions
 * (created in 01_SEI_future.js). 
 * Those two rasters are combined to classify how each pixel
 * changes (or doesn't) from one classification to another
 * 
 * Steps:
 * 1. read in data
 * 2. Calculate transitions between classes
 * 3. Export
*/

// parameters --------------------------------------------------------


// parameters for which images to read in
var yearEnd = 2020;  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3; // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90;    // output resolution, 90 initially, 30 m eventually

var path = 'projects/gee-guest/assets/SEI/'; // path to where most assets live

// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// create lists of simulations types
var rootList = SEI.repeatelemList(
  ['ClimateOnly_', 'CheatgrassFire_', 'CheatgrassFireC4off_'], // epochs
  [4, 4, 2]); // number of assets with each of these epochs
  
// list of RCP scenarios
var RCPList = SEI.repeatelem(['RCP45', 'RCP45', 'RCP85', 'RCP85'], 2) // repeat this list twice
  .concat(['RCP85', 'RCP85']); // CheatgrassFireC4off only run for RCP85 at the moment, so adding seperatly
  
// list of epochs
var epochList = SEI.repeatelem(['2030-2060', '2070-2100'], 5); // repeat this list of epochs  n times

var imageVisQc3 = {"opacity":1,"min":1,"max":3};
// Read in current SEI -------------------------------------------------------

// region of interest
var biome = ee.FeatureCollection(path + 'US_Sagebrush_Biome_2019'); // defines the study region
var region = biome.geometry();

// Current SEI classification
var currentString = "SEIv11" + "_" + yearStart + '_' + yearEnd + "_" + resolution + "_Current_20220215";
var current = ee.Image(path + "v11/current/" + currentString);

print(current.bandNames());
var c3Current = current.select('Q5sc3'); // band with 3 category classification (hence 'c3' in name)
Map.addLayer(c3Current, imageVisQc3, "Q5c3 Current", false);

// Future SEI classification --------------------------------------------

var c3Future = ee.Image().float(); // empty image
var futureStringList = [];
// Using a for loop isn't efficient but I could get ee.Image() to work when 
// a ee.String() was passed to it (was would be need if running something like list.iterate(function)
for (var i = 0; i < rootList.length; i++) {
  var s =  "_" + yearStart + '_' + yearEnd + "_" + resolution + "_" + rootList[i] + RCPList[i] + "_" + epochList[i] + "_";

  var futureString = "SEIv11" + s + "median_20220215";
  print(futureString);
  var futureStringList = futureStringList.concat(futureString);
  
  // SEI for the given climate scenario
  var tempImage = ee.Image(path + "v11/forecasts/" + futureString); 
  
  Map.addLayer(tempImage, imageVisQc3, "Q5c3 Future " + rootList[i] + RCPList[i] + "_" + epochList[i], false);
  
  // each band is the SEI classification for a different scenario
  var c3Future = c3Future.addBands(tempImage.rename(futureString)); 
  
} 

// transitions between classes ----------------------------------------
  
var c3Current10 = c3Current.multiply(10); // 3 categories now becomes 10, 20, and 30

// adding the two rasters together, this creates 9 categories (hence 'c9' in object names),
// for example: 
// 11 means that an area was a core area and stayed a core area
// 12 = core area becomes grow
// 13 = core becomes impacted
// 32 = impacted becomes grow
// etc.

 // c3Current only has one band, so this is then added to each of the bands for c3Futer
var c9a = c3Future.add(c3Current10);

// remapping from 1-9 for figure creation reasons
var c9b = c9a.remap([11, 12, 13, 21, 22, 23, 31, 32, 33], [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  

// Saving the layer ----------------------------------------------------------
// for later use by others
  
Export.image.toAsset({
  image: c9b,
  assetId: path + 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220223',
  description: 'SEIv11_9ClassTransition_byScenario_median',
  maxPixels: 1e13, 
  scale: resolution,
  crs: 'EPSG:4326' 
});



if (false){
Export.image.toDrive({
  image: c9b,
  description: 'SEIv11_9ClassTransition' + s + "median",
  folder: 'USGS',
  maxPixels: 1e13, 
  crs: 'EPSG:4326',    // set to WGS84, decimal degrees
  scale: resolution,
  region: region,
  fileFormat: 'GeoTIFF'
});
}

