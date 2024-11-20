/*Purpose: Recreate the main SCD layers for the greater yellowstone ecostem (GYE)
  This is using v3.0 of the SCD, but with a different (less expansive mask)
  
  Author: Martin Holdrege
  
  Date started: Nov. 11, 2024


*/


// parameters ----------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/'

// dependencies -------------------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// load data -----------------------------------------------------------

// file shows ecostates, but will be used as the mask (provides the 
// desired mask for the GYE)
var forMask = ee.Image(path + 'GYE/Ecostate_SagebrushBiome_v4_21_23')

// prepare mask ------------------------------------------------------
// values corresponding to ecostates are 1-8.

var mask = forMask.gt(0).selfMask();
Map.addLayer(mask, {palette: 'brown'}, 'new mask', false)


var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area')
print(region)

Map.addLayer(region, {}, 'region', false)
Map.addLayer(forMask, {min: 1, max: 8}, 'ecostate', false)

var cur = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/SEI_v30_2018_2021_90_20230828')

print(cur.bandNames())

Map.addLayer(cur.select('sage560m').selfMask(), {min: 0, max: 30}, 'sage', false)
Map.addLayer(cur.select('Q5sc3'), {palette: 'red'}, 'sage')
Map.addLayer(SEI.mask, {palette: 'blue'}, 'mask')