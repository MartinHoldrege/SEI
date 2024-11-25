/*Purpose: Recreate the main SCD layers for the greater yellowstone ecostem (GYE)
  This is using v3.0 of the SCD, but with a different (less expansive mask)
  
  Author: Martin Holdrege (adapting code written by Dave Theobald)
  
  Date started: Nov. 11, 2024

*/

// dependencies -------------------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// parameters ----------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/';

// load data -----------------------------------------------------------

// 2019-2021 threat based ecostates file (provided by B. Sparklin)
var forMask = ee.Image(path + 'GYE/ThreatBasedEcostates_GYE');
var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area');



// prepare mask -------------------------------------------------------

var mask = forMask.gt(0).selfMask();
Map.addLayer(mask, {palette: 'blue'}, 'mask', false)

SEI.tundra



