/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var image = ee.Image("users/MartinHoldrege/SEI/v11/current/SEIv11_2017_2020_90_Current_20220215"),
    image2 = ee.Image("users/MartinHoldrege/SEI/v11/forecasts/SEIv11_2017_2020_500_ClimateOnly__RCP85_2030-2060_median_20220215"),
    image3 = ee.Image("users/MartinHoldrege/SEI/v11/forecasts/SEIv11_2017_2020_500_ClimateOnly__RCP85_2030-2060_median_20220215");
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
 * 2. Calculate transitions between classes
 * 3. Export
*/

// parameters --------------------------------------------------------
// visualization
// (c3 stands for classification into 3 levels)
var imageVisQc3 = {"opacity":1,"min":1,"max":3};
var c9Palette = ['#000000', // stable core (black)
  '#64AC46', // core becomes grow
  '#ABAB4B', // core becomes impacted
  '#2159B0', // grow becomes core
  '#757170', // stable grow
  '#F0FA77', //grow becomes impacted
  '#7698D8', // impacted becomes core
  '#B1CE94', // impacted becomes grow
  '#D9D9D9' // stable impacted
];
var imageVisc9 = {"opacity":1,"min":1,"max":9, "palette":c9Palette};

// Read in data -------------------------------------------------------

// Current SEI classification
var current = ee.Image("users/MartinHoldrege/SEI/v11/current/SEIv11_2017_2020_90_Current_20220215");
print(current.bandNames());
var c3Current = current.select('Q5sc3'); // band with 3 category classification
// Future SEI classification

var c3Future = ee.Image("users/MartinHoldrege/SEI/v11/forecasts/SEIv11_2017_2020_90_ClimateOnly__RCP85_2030-2060_median_20220215");

Map.addLayer(c3Current, imageVisQc3, "Q5c3 Current", false);
Map.addLayer(c3Future, imageVisQc3, "Q5c3 Future", false);

// transitions between classes ----------------------------------------

var c3Current10 = c3Current.multiply(10); // 3 categories now becomes 10, 20, and 30

// adding the two rasters together, this creates 9 categories:
// for exampl: 
// 11 means that an area was a core area and stayed a core area
// 12 = core area becomes grow
// 13 = core becomes impacted
// 32 = impacted becomes grow
// etc.
var c9a = c3Current10.add(c3Future);

// remapping from 1-9 for figure creation reasons
var c9b = c9a.remap([11, 12, 13, 21, 22, 23, 31, 32, 33], [1, 2, 3, 4, 5, 6, 7, 8, 9]);

// creating a map -------------------------------------------------------------
var empty = ee.Image().byte();

var states = ee.FeatureCollection('TIGER/2016/States'); // for background of map

var statesOutline = empty.paint({
  featureCollection: states,
  color: 1,
  width: 2
});

Map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'background'); // white background
Map.addLayer(statesOutline, {}, 'outline'); // outline of states
Map.addLayer(c9b, imageVisc9, 'c9 transition');
