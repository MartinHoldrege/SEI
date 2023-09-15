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

// which stepwat output to read in?
// (this is in addition to 'Current' conditions)
var versionsFull = ['vsw4-3-2'];


// which stepwat output to read in?
var root = 'fire1_eind1_c4grass1_co20_';
var RCP =  'RCP45';
var epoch = '2070-2100';
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
var curV11 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');

// map background ------------------------------------------

Map.centerObject(c9_v11b, 6);
Map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'background'); // white background
Map.addLayer(fig.statesOutline, {}, 'outline'); // outline of states (white background)
// Map 3 class 

Map.addLayer(curV11.select('Q5sc3'), fig.visc3, 'c3 v11', false);
Map.addLayer(SEI.cur.select('Q5sc3'), fig.visc3, 'c3 v30', false);

// c9 map v11 dataset ------------------------------------------------------------


Map.addLayer(c9_v11b, fig.visc9, 'c9 v11', false);
Map.add(fig.legendc9);

// loop through data products -------------------------------------------------


// loop through versions
for (var i=0; i<versionsFull.length; i++) {
  var versionFull = versionsFull[i];
  var version = SEI.removePatch(versionFull)
  var s = ' (' + versionFull.replace(/vsw/, '') + ')';

  var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
  var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;
 
  var p = ee.Image(path + version + '/products/' + productName);
  
  // c9 maps ----------------------------------------------------------------------
  
  Map.addLayer(p.select('p6_c9Med'), fig.visc9, 'p6_c9Med' + s, false);
  Map.addLayer(p.select('p1_diffQ5sMed'), {min: -0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'diffQ5sMed' + s , false);
  
  // * robust change c9
  // considering robust if all but 1 GCM agree on future classification
  var whereNotRobust = p.select('p5_numAgree').lt(ee.Image(SEI.GCMList.length - 1));
  
  Map.addLayer(whereNotRobust.selfMask(), {palette: 'white'}, 'not Robust' + s);
  
  
}


