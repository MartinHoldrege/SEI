/*
Purpose--export layers useful for making maps for the manuscript
These are exported at a lower resolution, b/ they're just for making
static maps

Author: Martin Holdrege

Data started: November 21, 2023
*/

// params ---------------------------------------------------

var resolutionOut = 500; // resolution of output
var root = 'fire1_eind1_c4grass1_co20_2311_';

// dependencies ---------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");

// read in data --------------------------------------------

var d = lyrMod.main({root: root}); // using the default args

// c9 layer ------------------------------------------------

var c9 = ee.Image(d.get('p')).select('p6_c9Med');

var s = d.get('versionFull').getInfo() + '_9ClassTransition_' + resolutionOut + '_' + d.get('root').getInfo()
  + d.get('RCP').getInfo()  + '_' + d.get('epoch').getInfo();

Export.image.toDrive({
  image: c9,
  description: s,
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});
