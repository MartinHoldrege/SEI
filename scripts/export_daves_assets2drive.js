/**
 * Martin Holdrege
 * 
 * script started 2/18/2022
 * 
 * Purpose of this script is to export the assets that Dave shared
 * So that they are fixed in time, and also so that they can be
 * used from my usgs gee account.
 * These are assets needed to run the 01_SEI_future.js script.
 * This script can only be run if these assets have been shared
 * (i.e. it works with the MartinHoldrege gee account)
 * Note missing from this script ar the fire perimiters which
 * I also exported (but forgot to save the code)
*/

var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

// biome asset

var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019");


Export.table.toDrive({
  collection: biome,
  description: "US_Sagebrush_Biome_2019",
  folder: "USGS",
  fileFormat: "SHP"});

  
 // wafwa ecorections
var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal") ;


Export.table.toDrive({
  collection: WAFWAecoregions,
  description: "WAFWAecoregionsFinal",
  folder: "USGS",
  fileFormat: "SHP"});
  


// Human modification dataset (Q4)
var yearNLCD = '2019'  // needs to be a string
var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush');
var hScale = H.projection().nominalScale();

Export.image.toDrive({
  image: H,
  description: 'HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush',
  folder: 'USGS',
  maxPixels: 1e13, 
  scale: hScale.getInfo(),
  fileFormat: 'GeoTIFF'
});

// rcmap images
for (var i=yearStart; i<=yearEnd; i++) {
  
  var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i); // this loads

  rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i);
  var sageScale = rcmapSage.projection().nominalScale();

  Export.image.toDrive({
    image: rcmapSage,
    description: 'rcmap_sagebrush_' + i,
    folder: 'USGS',
    maxPixels: 1e13, 
    scale: sageScale.getInfo(),
    fileFormat: 'GeoTIFF'
  });

}
