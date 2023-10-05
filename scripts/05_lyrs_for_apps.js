/*
Purpose:
Create summary data layers from data products that are used in apps, and also sampled from
in other scripts for later analyses. 
The main poin is that there isn't unnecessary duplication of code in app scripts

Author: Martin Holdrege

Started: October 4, 2023
*/


// User-defined variables -----------------------------------------------------

var resolution = 90;     // output (and input) resolution

// which version used to calculate SEI?
var versionFull = 'vsw4-3-3';
exports.versionFull = versionFull;

// which stepwat output to read in?
var root = 'fire1_eind1_c4grass1_co20_';
exports.root = root;
var RCP =  'RCP45';
exports.RCP = RCP;
var epoch = '2070-2100';
exports.epoch = epoch;

// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fig = require("users/mholdrege/SEI:src/fig_params.js");
var clim = require("users/mholdrege/SEI:src/loadClimateData.js");
var path = SEI.path;


// prepare climate data -----------------------------------------------------
// This is interpolated climate data from STEPWAT (historical and future) (i.e.,
// this data only has 200 unique values);

var climCur = clim.loadHistoricalSwClim();
exports.climCur = climCur;

var climFut = clim.loadFutureSwClim(RCP, epoch); // image collection, one image per GCM

// change in climate variables
var climDelta = climFut.map(function(image) {
  return ee.Image(image).subtract(climCur);
});

var n = SEI.GCMList.length - 1;
// percentiles of the 2nd lowest (ranked) GCM and 2nd highest
var pcents = [1/n*100, (n-1)/n*100];

var reducerLowHigh = ee.Reducer.percentile(pcents, ['low', 'high']);

var reducers = reducerLowHigh.combine({
  reducer2: ee.Reducer.median(),
  sharedInputs: true
});

// 'reduced' delta MAP and MAT (i.e., pixelwise low, median, and median across GCMs)
exports.climDeltaRed = climDelta.reduce(reducers);


// read in data product  -------------------------------------------------

var version = SEI.removePatch(versionFull);

var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;

var p = ee.Image(path + version + '/products/' + productName);
exports.p = p;
// * robust change c9
// considering robust if all but 1 GCM agree on future classification
var whereNotRobust = p.select('p3_numAgree').lt(ee.Image(SEI.GCMList.length - 1));


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
exports.diffRed2 = diffRed2;
// calculating 'worst and best' case c9
// reduced c3 (i.e., includes layers for best and worst)
var c3Red = fut1.select('Q5sc3_.*').reduce(reducers)
  .addBands(futGCM.select('Q5sc3').rename(GCM));
var c9Red = SEI.calcTransitions(cur1.select('Q5sc3'), c3Red);
exports.c9Red = c9Red; 

// contributions by each Q compontent to changes --------------------------------------


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

exports.qPropMean = qPropMean;



