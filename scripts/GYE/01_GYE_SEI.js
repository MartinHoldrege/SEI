/*Purpose: Recreate the main SCD layers for the greater yellowstone ecostem (GYE)
  This is using v3.0 of the SCD, but with a different (less expansive mask)
  
  Author: Martin Holdrege
  
  Date started: Nov. 11, 2024


*/


// parameters ----------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/'
// load data -----------------------------------------------------------

var forMask = ee.Image(path + 'GYE/Ecostate_SagebrushBiome_v4_21_23')
print(forMask)

var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area')
print(region)

Map.addLayer(region, {}, 'region')
Map.addLayer(forMask, {min: 0, max: 7}, 'ecostate')
