/********************************************************
 * Purpose:
 * Examine the diagnostics asset (image) created in the 04_SEIsw_future.js
 * script. This, for examples, allows for the assessment of the effects of different ways
 * of creating q curves to use with stepwat biomass output. 
 * 
 * Script Started: April 3, 2023
 * 
 * Author: Martin Holdrege
 * 
 *  Notes
 * 
 * 
* 
 * *******************************************************
*/ 

// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output (and input) resolution, 30 m eventually
var versions = ['vsw1', 'vsw2', 'vsw2']; // version
var sampleSize = 1e4; // for random sample 
// if set to true, random sample is taken of the bands and exported to csv
// so can compare observed and sw SEI
var exportSamples = true; 
// date identifier
var dateStrings = [
  '_20230308', // q curves created from quantile matching
  '_20230327', // biomass-cover equations used to create q curves
  '_20230331', // samed as 20230327 except quantile matched q curve used for annuals
  '_20230422' // samed as 20230327 except annual cover vs biomass from mahood
  ];  
  
var versions = ['vsw1', 'vsw2', 'vsw2', 'vsw3'];

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
var path = SEI.path;

// fig params --------------------------------------------------------------

var visQDiff = {min:-1, max: 1, palette: ['red', 'white', 'blue']};
var visSEI = {min:0, max: 1, palette: ['white', 'black']};

// read in assets -----------------------------------------------------------


// Read in current actual observed SEI

// band Q5 is SEI560, and Q5s is SEI2000
var cur1 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');

Map.centerObject(cur1, 6);
Map.addLayer(cur1.select('Q5s'), visSEI, 'SEI observed current', false);

// objects for sampling pixels
var one = ee.Image(1).rename('one');
var sampleFc = ee.FeatureCollection([]);

// loop through versions
for (var i=0; i<versions.length; i++) {
  var version = versions[i];
  var dateString = dateStrings[i];
  var s = ' (' + version + dateString + ')';

// Read in diagnostic images 
  var diag = ee.Image(path + version + '/diagnostics_' + version + "_" + root +  RCP + '_' + epoch + dateString);
  
// maps ---------------------------------------------------------------------
  
  
  // SEI calculated from stepwat data (current conditions)
  Map.addLayer(diag.select('Q5s_Current'), visSEI, 'SEI sw current' + s, false);
  
  // median sw future SEI
  
  Map.addLayer(diag.select('futSeiSwMed'), visSEI, 'futSeiSw1 median' + s, false);
  
  // change in SEI
  Map.addLayer(diag.select('diffSeiSwMed'), {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'SEI diff median' + s, false);
  
  
  // Q values
  Map.addLayer(diag.select('Q1raw_Current'), visSEI, 'Q1 (sage) sw current' + s, false);
  Map.addLayer(diag.select('Q2raw_Current'), visSEI, 'Q2 (perennial) sw current' + s, false);
  Map.addLayer(diag.select('Q3raw_Current'), visSEI, 'Q3 (annual) sw current' + s, false);
  
  // change in Q values
  Map.addLayer(diag.select('diffQ1RawMed'), visQDiff, 'Q1 (sage) diff median' + s, false);
  Map.addLayer(diag.select('diffQ2RawMed'), visQDiff, 'Q2 (perennial) diff median' + s, false);
  Map.addLayer(diag.select('diffQ3RawMed'), visQDiff, 'Q3 (annual) diff median' + s, false);
  
  // sampling points --------------------------------------------------------

  if (exportSamples) {
    var sample = diag
      .addBands(cur1.select('Q5s').rename('Q5s_current_observed'))
      .addBands(one)
      .stratifiedSample({
        numPoints: sampleSize,
        classBand: 'one',
        region: SEI.region,
        scale: resolution,
        projection: SEI.crs,
        seed: 123
      }).map(function(x) {
          var out = ee.Feature(x).set({
            version: version,
            date: dateString
          });
          return out;
      });
      
    var sampleFc = sampleFc.merge(ee.FeatureCollection(sample));
  }
}

if(exportSamples) {
  Export.table.toDrive({
    collection: sampleFc,
    description: 'diagnostics_' + sampleSize + 'obs_'+ resolution + 'm' + dateStrings.slice(-1),
    folder: 'SEI',
    fileFormat: 'CSV'
  });
}


// print(sampleFc);
