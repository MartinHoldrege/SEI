/*
Purpose--export layers useful for making maps for the manuscript
These are exported at a lower resolution, b/ they're just for making
static maps

Author: Martin Holdrege

Data started: November 21, 2023
*/

// params ---------------------------------------------------

var resolutionOut = 500; // resolution of output
var root_fire1 = 'fire1_eind1_c4grass1_co20_2311_';
var root_fire0 = 'fire0_eind1_c4grass1_co20_';

// dependencies ---------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");

// read in data --------------------------------------------

var d_fire1 = lyrMod.main({root: root_fire1}); // using the default args
var d_fire0 = lyrMod.main({root: root_fire0}); // using the default args

// c9 layer ------------------------------------------------

var c9_fire1 = ee.Image(d_fire1.get('p')).select('p6_c9Med');

var s = d_fire1.get('versionFull').getInfo() + '_9ClassTransition_' + resolutionOut + '_' + d_fire1.get('root').getInfo()
  + d_fire1.get('RCP').getInfo()  + '_' + d_fire1.get('epoch').getInfo();

Export.image.toDrive({
  image: c9_fire1,
  description: s,
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

// c9 fire difference layer -------------------------------------
// to show where habitat classification is different

var c9_fire0 = ee.Image(d_fire1.get('p')).select('p6_c9Med');
// first digit is c9 with fire, second is c9 without fire

// CONTINUE HERE --using where (1 = same, 2= fire1 better, 3 = fire1 worse)
c9Diff = ee.image(0)
  
  .add(ee.Image(d_fire0.get('p')).select('p6_c9Med'));
  
  