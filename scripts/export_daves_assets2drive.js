/**
 * Martin Holdrege
 * 
 * script started 2/18/2022
 * 
 * Purpose of this script is to export the assets that Dave shared
 * So that they are fixed in time, and also so that they can be
 * used from my usgs gee account.
 * These are assets needed to run the 01_SEI_future.js script
*/


// biome asset

var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019");
print(biome)
//var biomeScale = biome.projection.nominalScale();
//print(biome.projection())
//print(biomeScale.getInfo());
/**
if (false){

Export.table.toDrive(
  collection: biome,
  description: "US_Sagebrush_Biome_2019",
  folder: "USGS",
  fileformat: "SHP"
  )

var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal") ;

// Human modification dataset (Q4)
//var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush');


//rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i)

}

*/