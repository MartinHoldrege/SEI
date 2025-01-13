/*
 Export assets to tif, that are created in 02_GYE_SEI.js

*/

// dependencies -------------------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// parameters -------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/';
var resolution = 30;
var yearEnd = 2021;  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3; // inclusive
var resolution = 30;
var version = 30; 

// read in assets------------------------------------------------------
var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area');
var fileName =  'SEI_v' + version + '_' + yearStart + '_' + yearEnd + '_' + resolution + '_GYE_ecoStateMask_20241127';
var gye = ee.Image(path + 'GYE/v' + version + '/' + fileName);

// export --------------------------------------------------------------
print(gye.select(['.*raw', 'Q5s']).bandNames());

// exporting different bands in separate filesl
// in part b/ datatypes need to be the same within a file

Export.image.toDrive({
  image: gye.select(['Q5s', '.*raw']),
  description: fileName + '_Q',
  folder: 'SEI',
  maxPixels: 1e13, 
  scale: resolution,
  region: region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: false
  }
});

Export.image.toDrive({
  image: gye.select('Q5sc3'),
  description: fileName + '_c3',
  folder: 'SEI',
  maxPixels: 1e13, 
  scale: resolution,
  region: region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: false
  }
});

Export.image.toDrive({
  image: gye.select('.*560m'),
  description: fileName + '_cover',
  folder: 'SEI',
  maxPixels: 1e13, 
  scale: resolution,
  region: region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: false
  }
});