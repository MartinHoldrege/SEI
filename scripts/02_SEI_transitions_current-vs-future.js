/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var image = ee.Image("users/MartinHoldrege/SEI/v11/current/SEIv11_2017_2020_90_Current_20220215"),
    image2 = ee.Image("users/MartinHoldrege/SEI/v11/forecasts/SEIv11_2017_2020_500_ClimateOnly__RCP85_2030-2060_median_20220215");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
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
 * Steps:
 * 1. read in data
 * 2. Combine rasters
 * 3. Export
*/

// parameters --------------------------------------------------------
// visualization
var imageVisQc3 = {"opacity":1,"min":1,"max":3};


// Read in data -------------------------------------------------------

// Current SEI classification
var current = ee.Image("users/MartinHoldrege/SEI/v11/current/SEIv11_2017_2020_90_Current_20220215");
print(current.bandNames());
var Q5Current = current.select('Q5sc3'); // band with 3 category classification
// Future SEI classification

var Q5Future = ee.Image("users/MartinHoldrege/SEI/v11/forecasts/SEIv11_2017_2020_500_ClimateOnly__RCP85_2030-2060_median_20220215");

Map.addLayer(Q5Current, imageVisQc3, "Q5 Current", false);
Map.addLayer(Q5Future, imageVisQc3, "Q5 Future", false);