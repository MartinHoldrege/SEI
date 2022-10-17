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
 * This is done for median future conditions, as well as
 * for each GCM seperately
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
var imageVisQc9 = {'min': 1, 'max':9,
  palette: ['#000000', // stable core (black)
             '#f4a582', // core becomes grow
             '#b2182b', // core becomes impacted
             '#92c5de', // grow becomes core
             '#757170', // stable grow
             '#d6604d', // grow becomes impacted
             '#2166ac', // impacted becomes core
             '#4393c3', // impacted becomes grow
             '#D9D9D9']
}

// params for the gcm level projections
var rootListGCM = ['ClimateOnly_', 'ClimateOnly_', 'ClimateOnly_', 'ClimateOnly_'];
var RCPListGCM = ['RCP85', 'RCP85', 'RCP45', 'RCP45'];
var epochListGCM = ['2030-2060', '2070-2100', '2030-2060', '2070-2100'];

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

// Using this to define region to export. 
var biome = ee.FeatureCollection(path + "US_Sagebrush_Biome_2019"); // defines the study region
var region = biome.geometry(); 

// Future SEI classification --------------------------------------------

// median 
var c3Future = ee.Image().float(); // empty image
var futureStringList = [];
// Using a for loop isn't efficient but I could get ee.Image() to work when 
// a ee.String() was passed to it (was would be need if running something like list.iterate(function)
var c3Future = ee.List([])
for (var i = 0; i < rootList.length; i++) {
  var s =  "_" + yearStart + '_' + yearEnd + "_" + resolution + "_" + rootList[i] + RCPList[i] + "_" + epochList[i] + "_";

  var futureString = "SEIv11" + s + "median_20220215";

  var futureStringList = futureStringList.concat(futureString);
  
  // SEI for the given climate scenario
  var tempImage = ee.Image(path + "v11/forecasts/" + futureString); 
  var bandName = 'c9_' + rootList[i] + RCPList[i] + "_" + epochList[i];
  
  Map.addLayer(tempImage, imageVisQc3, "Q5c3 Future " + rootList[i] + RCPList[i] + "_" + epochList[i], false);
  
  // each band is the SEI classification for a different scenario
  var c3Future = c3Future.add(tempImage.rename(futureString)); 
  
} 

// by GCM
var fImageListGCM = [];

for (var i = 0; i < rootListGCM.length; i++) {
  
  var root = rootListGCM[i];
  var RCP = RCPListGCM[i];
  var epoch = epochListGCM[i];
  var s =  "_" + yearStart + '_' + yearEnd + "_" + resolution + "_" + root + RCP + "_" + epoch +"_";

  var futurePath = path + "v11/forecasts/SEIv11" + s + "by-GCM_20221010";

  var image = ee.Image(futurePath)
  // adding image properties
    .set(
      {modelRun : root + RCP + "_" + epoch,
      root: root,
      RCP: RCP,
      epoch: epoch
    });
    
  var fImageListGCM =   fImageListGCM.concat(image);
} 

//print(fImageListGCM);

// ic where images are for a given simulation (time period etc), where each
// image contains band(s) for each GCM. The most important bands are labeld Q5sc3
// those are the core, grow, other classified images
var allFutureGCM1 = ee.ImageCollection(fImageListGCM);

// print(allFutureGCM1.first().bandNames())

// remove the 'empty' band (keeping bands that contain 'Q5sc3' in the name)
var c3FutureGCM1 = allFutureGCM1.map(function(x) {
  var bands = ee.Image(x)
    .bandNames()
    .filter(ee.Filter.stringContains('item', 'Q5sc3'));
  
  // rename bands so just name of GCM remains
  var newNames = bands.map(function(x) {
    return ee.String(x).replace("Q5sc3_", "");
  });
  var out = ee.Image(x)
    .select(bands)
    .rename(newNames);
  
  return out;
});

var namesGCM = c3FutureGCM1.first().bandNames();

// transitions between classes (median) --------------------------------------
  
var c3Current10 = c3Current.multiply(10); // 3 categories now becomes 10, 20, and 30

// adding the two rasters together, this creates 9 categories (hence 'c9' in object names),
// for example: 
// 11 means that an area was a core area and stayed a core area
// 12 = core area becomes grow
// 13 = core becomes impacted
// 32 = impacted becomes grow
// etc.


var c3FutureCollection = ee.ImageCollection(c3Future); // convert list to image collection

 // c3Current only has one band, so adding that to each image (scenario) of c3Futer
var c9a = c3FutureCollection.map(function(image) {
  return ee.Image(image).add(c3Current10);
});

// lists for remapping
var c9From = ee.List([11, 12, 13, 21, 22, 23, 31, 32, 33]); 
var c9To = ee.List([1, 2, 3, 4, 5, 6, 7, 8, 9]);

// remapping from 1-9 for figure creation reasons
var c9b = c9a.map(function(image) {
  var image = ee.Image(image);
  var name = ee.String(image.bandNames().get(0)); // the image only has on band, getting it's name
  var remapped = image.remap(c9From, c9To);
  return remapped.rename(name);
});

// convert collection to one image, where each original image becomes its own band
var c9c = c9b.toBands();

// renaming bands so they don't have leading numbers and _, which causes errors when exporting
var names = c9c.bandNames().map(function(name){
  var out = ee.String(name)
    .replace('^\\d+_', ''); 
  return out;
});

var c9d = c9c.rename(names);
//print(c9c);
//print(c9d.bandNames());

// transitions between classes (by GCM) --------------------------------------

var c9GCM1 = c3FutureGCM1.map(function(image) {
  var out = ee.Image(image).add(c3Current10)
  // so RCP etc. properties are retained
    .copyProperties(ee.Image(image));
  return out;
});




// remap one band of an image but keep the other bands
var remapOneBand = function(bandName, image) {
  
  var oldImage = ee.Image(image);
  var names = ee.Image(oldImage).bandNames();
  
  //single band image of just remapped band
  var remappedImage = ee.Image(image).remap({
    from: c9From,
    to: c9To,
    bandName: bandName
  }).rename([bandName]);
  
  var otherBands = names.removeAll([bandName]);
  
  // select bands not remapped in this step
  var out = oldImage.select(otherBands)
  // add remapped band back in
    .addBands(remappedImage);
  
  return out;
};

var c9GCM2 = c9GCM1.map(function(image) {
  var out = namesGCM.iterate(remapOneBand, image);
  return ee.Image(out);
});

//print('c9GCM2 image', c9GCM2.first());
Map.addLayer(c9GCM2.first().select('CESM1-CAM5'), imageVisQc9, 'c9 CESM1-CAM5', false);

// area by c9 and GCM -------------------------------------------------------
// calculating the amount of area belonging to each class



 
var areaAllBands = function(image) {
  var areaImage = ee.Image.pixelArea();
  
  var bandNames = image.bandNames();
  
  
  
  
};
// test code

// area and 1 band of the c9 image
var areaBand = areaImage
  .addBands(c9GCM2.first().select('CESM1-CAM5').rename('c9'));
  
var areaReduced = areaBand.reduceRegion({
    reducer: ee.Reducer.sum().group({
    groupField: 1,
    groupName: 'c9',
  }),
  geometry: region,
  scale: 10000,
  maxPixels: 1e12
  }); 
  
print('area', areaReduced)

/*
// looping through each unique bin, calculating the area of each suid
// falling into that bin, creating feature that has properties including the bin, the suid, and the area
// and next all these features are combined into one big feature collection
// that should have all combinations of suid and bin. 
var areas = binUnique.map(function(bin) {
  var binImage = cwfBinImageM.eq(ee.Number(bin)).selfMask();
  
  var suidMasked = suid1.updateMask(binImage.unmask());
  
  var suidArea = areaImage.addBands(suid1);
  
  var reduced = suidArea.reduceRegion({
      reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'suid',
    }),
    geometry: region,
    scale: scale,
    maxPixels: 1e12
    }); 
    
    // list where each component is a feature
  var areasList = ee.List(reduced.get('groups')).map(function (x) {
    return ee.Feature(null, 
      // using this code here to rename the parts as needed
      {suid: ee.Number(ee.Dictionary(x).get('suid')),
      // binary code of fire year
      bin: ee.Number(bin),
      // area in m^2
      area_m2: ee.Dictionary(x).get('sum')
    });
  });

  return ee.FeatureCollection(areasList);
});
*/
// Saving the layer ----------------------------------------------------------
//Map.addLayer(c9d.select('SEIv11_2017_2020_90_ClimateOnly_RCP45_2030-2060_median_20220215'), {min: 1, max: 9});

if (false) { // turn to true when want to re-run this. 
Export.image.toAsset({
  image: c9d,
  assetId: path + 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224',
  description: 'SEIv11_9ClassTransition_byScenario_median',
  maxPixels: 1e13, 
  scale: resolution,
  region: region,
  crs: 'EPSG:4326' 
});


// export to drive (for now using low resolution)
Export.image.toDrive({
  image: c9d,
  description: 'SEIv11_9ClassTransition_1000_byScenario_median_20220224',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: 1000,
  region: region,
  crs: 'EPSG:4326',
  fileFormat: 'GeoTIFF'
});

}
