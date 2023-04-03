/********************************************************
 * Purpose:
 * Examine the products image created in the 05_create_data_products.js
 * script. These are the fundamental data products that are being created
 * by this project. Here, maps made to compare different versions of the products
 * 
 * 
 * Script Started: April 3, 2023
 * 
 * Author: Martin Holdrege
 * 
 *  Notes
 * This script does not create any output, and is meant to be for examination
 * Later will be converted to an earthengine app
 * 
* 
 * *******************************************************
*/ 

// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output (and input) resolution, 30 m eventually

var versions = ['vsw2', 'vsw2']; // version
// date identifier
var dateStrings = [
  '_20230327', // biomass-cover equations used to create q curves
  '_20230331' // samed as 20230327 except quantile matched q curve used for annuals
  ];  

// which stepwat output to read in?
// (this is in addition to 'Current' conditions)
var root = 'c4on_';
var RCP =  'RCP85';
var epoch = '2030-2060';
var graze = 'Light';

// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fig = require("users/mholdrege/SEI:src/fig_params.js");
var path = SEI.path;

// fig params --------------------------------------------------------------

var visQDiff = {min:-1, max: 1, palette: ['red', 'white', 'blue']};
var visSEI = {min:0, max: 1, palette: ['white', 'black']};

// read in v11 dataset --------------------------------------------------------

// * v11 dataset
// c9 transitions from the initial version (v11) of the dataset. 
//(e.g. current to future changes)
// the RCP8.5 mid-century layer shows the same data as was shown in Doherty et al 2022 
// reading this image in b/ there is no 'products' image for this version (yet at least)
var c9_v11a =  ee.Image(path + 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224');
var c9_v11b = c9_v11a.select('SEIv11_2017_2020_90_ClimateOnly_RCP85_2030-2060_median_20220215');

// c9 map v11 dataset ------------------------------------------------------------

Map.centerObject(c9_v11b, 6);
Map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'background'); // white background
Map.addLayer(fig.statesOutline, {}, 'outline'); // outline of states (white background)
Map.addLayer(c9_v11b, fig.visc9, 'c9 v11', false);
Map.add(fig.legendc9);

// loop through data products -------------------------------------------------


// loop through versions
for (var i=0; i<versions.length; i++) {
  var version = versions[i];
  var dateString = dateStrings[i];
  var s = ' (' + version + dateString + ')';

  var productName = 'products_' + version + '_2017_2020_' + resolution + "_" + root +  RCP + '_' + epoch + dateString;
  var p = ee.Image(path + version + '/products/' + productName);
  
  // c9 maps ----------------------------------------------------------------------
  
  Map.addLayer(p.select('p6_c9Med'), fig.visc9, 'p6_c9Med' + s, false);
  
}


