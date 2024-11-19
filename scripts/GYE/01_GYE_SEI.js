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

var forMask = ee.Image(path + 'GYE/Ecostate_SagebrushBiome_v4_21_23')


var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area')
print(region)

Map.addLayer(region, {}, 'region', false)
Map.addLayer(forMask, {min: 0, max: 7}, 'ecostate', false)

var cur = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/SEI_v30_2018_2021_90_20230828')

print(cur.bandNames())

Map.addLayer(cur.select('sage560m').selfMask(), {min: 0, max: 30}, 'sage')
Map.addLayer(Q, {min: 0, max: 30}, 'sage')
Map.addLayer(SEI.mask, {palette: 'blue'}, 'mask')