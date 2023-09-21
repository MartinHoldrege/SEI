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

var resolution = 90;     // output (and input) resolution, 30 m eventually

// which stepwat output to read in?
var versionFull = 'vsw4-3-2';


// which stepwat output to read in?
var root = 'fire1_eind1_c4grass1_co20_';
var RCP =  'RCP45';
var epoch = '2070-2100';

// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fig = require("users/mholdrege/SEI:src/fig_params.js");
var clim = require("users/mholdrege/SEI:src/loadClimateData.js");
var path = SEI.path;

//Custom Basemap
var snazzy = require("users/aazuspan/snazzy:styles");
// snazzy.addStyleFromName("Light Monochrome");


// fig params --------------------------------------------------------------

// var visQDiff = {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']};
var visSEI = {min:0, max: 1, palette: ['white', 'black']};
var sldRampDiff1 = fig.sldRampDiff1;
// setup app environment 

ui.root.clear();
//var panel = ui.Panel({style: {width: '250px'}});
var map = ui.Map();
//ui.root.add(panel).add(map); // order that you add panl vs map affects if panel is right or left
ui.root.add(map); 

map.style().set('cursor', 'crosshair');
snazzy.addStyleFromName("Interface map"); // doesn't seem to work inside app ?

// read in v11 dataset --------------------------------------------------------

// * v11 dataset
// c9 transitions from the initial version (v11) of the dataset. 
//(e.g. current to future changes)
// the RCP8.5 mid-century layer shows the same data as was shown in Doherty et al 2022 
// reading this image in b/ there is no 'products' image for this version (yet at least)
var c9_v11a =  ee.Image(path + 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224');
var c9_v11b = c9_v11a.select('SEIv11_2017_2020_90_ClimateOnly_RCP85_2030-2060_median_20220215');
var curV11 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');

// prepare climate data -----------------------------------------------------
// This is interpolated climate data from STEPWAT (historical and future) (i.e.,
// this data only has 200 unique values);

var climCur = clim.loadHistoricalSwClim();

var climFut = clim.loadFutureSwClim(RCP, epoch); // image collection, one image per GCM

// change in climate variables
var climDelta = climFut.map(function(image) {
  return ee.Image(image).subtract(climCur);
});

var reducers = ee.Reducer.max().combine({
  reducer2: ee.Reducer.min(),
  sharedInputs: true
}).combine({
  reducer2: ee.Reducer.median(),
  sharedInputs: true
});

// 'reduced' delta MAP and MAT (i.e., pixelwise min, max, and median across GCMs)
var climDeltaRed = climDelta.reduce(reducers);


// map background ------------------------------------------

map.centerObject(c9_v11b, 6);
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'white background', false); 
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "gray"},'gray background', false); 
map.addLayer(fig.statesOutline, {}, 'state outlines', false); // outline of states (white background)
// Map 3 class 

map.addLayer(curV11.select('Q5sc3'), fig.visc3, 'c3 v11', false);
map.addLayer(SEI.cur.select('Q5sc3'), fig.visc3, 'c3 v30', false);

// c9 map v11 dataset ------------------------------------------------------------


map.addLayer(c9_v11b, fig.visc9, 'c9 v11', false);
map.add(fig.legendc9);

// read in data product  -------------------------------------------------

var version = SEI.removePatch(versionFull);

var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;

var p = ee.Image(path + version + '/products/' + productName);

// c9 maps ----------------------------------------------------------------------

map.addLayer(p.select('p6_c9Med'), fig.visc9, 'c9 median', true);


// * robust change c9
// considering robust if all but 1 GCM agree on future classification
var whereNotRobust = p.select('p5_numAgree').lt(ee.Image(SEI.GCMList.length - 1));

map.addLayer(whereNotRobust.selfMask(), {palette: 'white'}, 'not robust change', false);

// GCM level results -------------------------------------------------------------

// bands of interest and their descriptions
var diffBands = ['sage560m', 'perennial560m', 'annual560m', 'Q1raw', 'Q2raw', 'Q3raw', 'Q5s'];
var namesBands = ['sage', 'perennial', 'annual', 'Q1 (sage)', 'Q2 (perennial)', 'Q3 (annual)', 'SEI'];

var GCM = 'CESM1-CAM5'; // specific GCM pulling out as an example

// future SEI
var assetName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';

// this image should have bands showing sei (continuous, 'Q5s_' prefix) and 3 class (Q5sc_ prefix) for each GCM
var fut0 = ee.Image(path + version + '/forecasts/' + assetName);

// these are the bands created when there was (artificially) no change in stepwat values from current
// to future conditions. version 4-3-2 has these bands (earlier one's, and 4-3-20 don't)
var cur0 = fut0.select('.*_control');
var cur1 = cur0.regexpRename('_control', '');

// removing the control bands
var fut1 = fut0.select(
  fut0.bandNames().removeAll(cur0.bandNames())
);

var futList = ee.List(SEI.GCMList).map(function(GCM) {
  var GCM = ee.String(GCM)
  return fut1.select(ee.String('.*').cat(GCM))
      // removing GCM from bandName
      .regexpRename(ee.String('_').cat(GCM), '')
      // setting GCM property
      .set('GCM', GCM);
});

// each image in collection from a different GCM
var futIc = ee.ImageCollection(futList);

// differences relative to current conditions for relavent bands
var diffIc = futIc.map(function(image) {
  return ee.Image(image).select(diffBands)
    // subtract current conditions
    .subtract(cur1.select(diffBands))
    .copyProperties(ee.Image(image));
});

// reducing to get min, max, median across GCMs for the differences
var diffRed1 = diffIc.reduce(reducers);

// future values for the given GCM
var futGCM = futIc.filter(ee.Filter.eq('GCM', GCM))
  // IC only has one image, but this way just have the image
  .first();
  
// difference relative to current conditions
var diffGCM = futGCM
  .select(diffBands)
  .subtract(cur1.select(diffBands))
  .regexpRename('$', '_' + GCM);

// combing min, max etc. deltas with delta for one specific GCM
var diffRed2 = diffRed1.addBands(diffGCM);
 
// calculating 'worst and best' case c9
// reduced c3 (i.e., includes layers for best and worst)
var c3Red = fut1.select('Q5sc3_.*').reduce(reducers)
  .addBands(futGCM.select('Q5sc3').rename(GCM));
var c9Red = SEI.calcTransitions(cur1.select('Q5sc3'), c3Red);

map.addLayer(c9Red.select('min'), fig.visc9, 'c9 best (across GCMs)', false); 
map.addLayer(c9Red.select('max'), fig.visc9, 'c9 worst (across GCMs)', false);  
map.addLayer(c9Red.select(GCM), fig.visc9, 'c9 ' + '(' + GCM + ')', false);

// Delta (fut-historical) values (min, max, median, etc) ----------------------------------

for (var j = 0; j < diffBands.length; j++) {
  var band = diffBands[j];
  
  map.addLayer(diffRed2.select(band + '_min').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (min across GCMs)', false);
  map.addLayer(diffRed2.select(band + '_max').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (max across GCMs)', false);
  
  // median is already pre-computed for Q5s
  if (diffBands == 'Q5s') {
    var medianLyr = p.select('p1_diffQ5sMed');
  } else {
    var medianLyr = diffRed2.select(band + '_median');
  }
  map.addLayer(medianLyr.sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (median)', false);
  map.addLayer(diffRed2.select(band + '_' + GCM).sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (' + GCM + ')', false);
}

// contributions by each Q compontent to changes --------------------------------------

var qBands = ['Q1raw', 'Q2raw', 'Q3raw']

var qPropIc = diffIc.select(qBands).map(function(x) {
  // Absolute proportion change in Qs
  // abs prob = abs( (future-current)/current
  var absProp = ee.Image(x).divide(cur1.select(qBands)).abs();
  
  var sum = absProp.reduce('sum');
  // divide all layers by the total to normalize each value
  // (ie. for each q) so they fall between 0 and 1, 1 meaning
  // all the change was due to that q
  var absPropNorm = absProp.divide(sum)
    // mask out areas where denominator would be 0
    .updateMask(sum.gt(0));
  return absPropNorm.copyProperties(ee.Image(x));
});


// for now choosing mean because otherwise the 3 contributions
// won't sum to 1
var qPropMean = qPropIc.reduce('mean')
  .regexpRename('_mean', '');

// creating RGB maps
// R = sage, G = perennials, B = annuals

var rgbViz = {
  bands: qBands,
  min: 0,
  max: 1
};

var rgbLab = ' (R = Q1, G= Q2, B = Q3)';
map.addLayer(qPropMean, rgbViz, 'RGB mean' + rgbLab, false);

// RGB but just for one GCM
map.addLayer(
  qPropIc.filter(ee.Filter.eq('GCM', GCM)).first(),
  rgbViz, 
  'RGB ' + GCM + rgbLab, 
  false);

// plot climate data -----------------------------------------------------------------
var deltaMATvis = {min: 1, max: 6, palette: ['white', '#67001f']};
var deltaMAPvis = {min: -130, max: 130, palette: ['#67001f', 'white', '#053061']};

// historical
map.addLayer(climCur.select('MAP'), {min: 0, max: 800, palette: ['white', '#053061']}, 'MAP (historical, interpolated)', false);
map.addLayer(climCur.select('MAT'), {min: 0, max: 18, palette: ['white', '#67001f']}, 'MAT (historical, interpolated)', false);

// change under future conditions
var bandsRed = ['min', 'max', 'median'];

// MAP
for (var i = 0; i < bandsRed.length; i++) {
  var b = bandsRed[i];
  map.addLayer(climDeltaRed.select('MAP_' + b), deltaMAPvis, 'delta MAP future (' + b + ', interpolated)', false);
}

// MAT
for (var i = 0; i < bandsRed.length; i++) {
  var b = bandsRed[i];
  map.addLayer(climDeltaRed.select('MAT_' + b), deltaMATvis, 'delta MAT future (' + b + ', interpolated)', false);
}

// misc labels -------------------------------------------------------------------------

// label providing simulations settings
var panel = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});
 
// Create legend title
var panelDescript = ui.Label({
  value: 'STEPWAT simulation settings: ' + root + ' (' + RCP + ', ' + epoch + ')',
  style: {
    fontSize: '12px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
panel.add(panelDescript);
map.add(panel);
