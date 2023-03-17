
/********************************************************
 * Purpose:
 * Use SEI calculated from stepwat biomass for current and future
 * scenarios, then calculate a delta (% change) and multiply that
 * delta by the current actual observed SEI to get a 'future' SEI
 * 
 * Script Started: March 8, 2023
 * 
 * Author: Martin Holdrege
 * 
 * Steps:
 * read in current  SEI as calculated from stepwat biomass
 * read in current observed SEI
 * read in future (by GCM) SEI as calculate from stepwat biomass
 * for each pixel calculate delta SEI for each GCM
 * Where delta is calculated as (future - current)/current, where
 * future and current are stepwat SEI2000 values calculated based on current and future
 * stepwat biomass
 * 
 * calculate future SEI based on delta (at 560m?)
 * calculate future core, grow, other, for each gcm
 *    
 * Notes:
 * current and future SEI calculated from stepwat biomass assets
 * were created in 03_SEIsw.js
 * 
 * 
 * Next steps:
 * 
 * problems some areas are simulated to have near 0 sei--b/ of quantile matching
 * causes huge swings in percent change SEI. Consider absolute change in SEI?
 * Also consider a different quantile matching approach b/ stepwat never simulates really
 * low SEI
 * 
 * Maps of change in core, grow, other classification
 * based on current sei modified by 'diff' SEI
 * Compare to those maps that used the previous (doherty et al 2022) method
 * 
 * *******************************************************
*/ 


// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output resolution, 90 initially, 30 m eventually
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = 'vsw1'; // first version calculating sei directly from stepwat output
var dateString = '_20230308'; // for appending to output file names

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

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var region = SEI.region;
var mask = SEI.mask;

// fig params --------------------------------------------------------------

var visQDiff = {min:-1, max: 1, palette: ['red', 'white', 'blue']};
var visSEI = {min:0, max: 1, palette: ['white', 'black']};

// Read in SEI images -------------------------------------------------------

// Read in current stepwat SEI

var fileName = 'SEI' + version + '_' + resolution + "_" + root +  'Current_Current_by-GCM' + dateString;
var curSw1 = ee.Image(path + version + '/sw_SEI/' + fileName) // 'stepwat current'
  .mask(mask);
var curSeiSw1 = curSw1.select('Q5s_Current'); // SEI2000 band, 

// Read in current actual observed SEI

// band Q5 is SEI560, and Q5s is SEI2000
var cur1 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');
//print(cur1.bandNames())

// Read in Future stepwat SEI 

var fileNameFut = 'SEI' + version + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM' + dateString;
var futSw1 = ee.Image(path + version + '/sw_SEI/' + fileNameFut)
  .mask(mask); 
var futSeiSw1 = futSw1.select('Q5s_.*'); // SEI2000 bands, (future stepwat SEI)

// maps of current (sw and observed) SEI ------------------------------------
Map.addLayer(cur1.select('Q5s'), visSEI, 'SEI observed current', false);
Map.addLayer(curSeiSw1, visSEI, 'SEI sw current', false);

// median sw future SEI ------------------------------------------------------
var futSeiSwMed1 = futSeiSw1.reduce('median');
Map.addLayer(futSeiSwMed1, visSEI, 'futSeiSw1 median', false);

// maps of all the bands (one for each GCM)
// var bands = futSeiSw1.bandNames().getInfo()
// for (var i=0; i<bands.length; i++) {
//   var band = bands[i];
//   Map.addLayer(futSeiSw1.select(band), {min:0, max: 1, palette: ['white', 'black']}, band, false);
// }

// Calculate sw SEI diff -------------------------------------------------------

var diff1 = futSeiSw1.subtract(curSeiSw1); // change in SEI

var GCMNames = diff1.bandNames().map(function(string) {
  return ee.String(string).replace('Q5s_', '');
});
var diff1 = diff1.rename(GCMNames);
var diffMed1 = diff1.reduce('median');

Map.addLayer(diffMed1, {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'SEI diff median', false);

// sw proportion change SEI ------------------------------------------------------------

var delta1 = diff1.divide(curSeiSw1); // proportion change in SEI
var deltaMed1 = delta1.reduce('median');
Map.addLayer(deltaMed1, visQDiff, 'SEI delta (proportion) median ', false);

// maps of all the bands (one for each GCM)
var bands = GCMNames.getInfo();
// for (var i=0; i<bands.length; i++) {
//   var band = bands[i];
//   Map.addLayer(delta1.select(band), visQDiff, 'delta ' + band, false);
//   Map.addLayer(diff1.select(band), {min:-.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'diff ' + band, false);
// }

// Change in individual Q values ------------------------------------------

// plot current sw q values
Map.addLayer(curSw1.select('Q1raw_Current'), visSEI, 'Q1 (sage) sw current', false);
Map.addLayer(curSw1.select('Q2raw_Current'), visSEI, 'Q1 (perennial) sw current', false);
Map.addLayer(curSw1.select('Q3raw_Current'), visSEI, 'Q1 (annual) sw current', false);

// sage q values
var diffQ1Raw = futSw1.select("Q1raw_.*")
  .subtract(curSw1.select('Q1raw_Current'));
var diffQ1RawMed = diffQ1Raw.reduce('median');
Map.addLayer(diffQ1RawMed, visQDiff, 'Q1 (sage) diff median', false);

// perennial q values
var diffQ2Raw = futSw1.select("Q2raw_.*")
  .subtract(curSw1.select('Q2raw_Current'));
var diffQ2RawMed = diffQ2Raw.reduce('median');
Map.addLayer(diffQ2RawMed, visQDiff, 'Q2 (perennial) diff median', false);
  
// annual q values
var diffQ3Raw = futSw1.select("Q3raw_.*")
  .subtract(curSw1.select('Q3raw_Current'));
var diffQ3RawMed = diffQ3Raw.reduce('median');
Map.addLayer(diffQ3RawMed, visQDiff, 'Q3 (annual) diff median', false);
  
// Calculate future SEI -----------------------------------------------------

// adjust observed SEI by the 'percent' change (delta) as estimate from the changes
// stepwat SEI.
// creating one band of future SEI for each GCM
var fut1 = cur1.select('Q5s')
  .add(cur1.select('Q5s').multiply(delta1));

// Calculate future core, grow, other ----------------------------------------

// decile-based classes, derived and hard-coded 
var Q5scdeciles = SEI.decileFixedClasses(fut1);

// Classify Q5sdeciles into 3 major classes, called: core, grow, other
var Q5sc3 = SEI.remapAllBands(Q5scdeciles, [1,2,3,4,5,6,7,8,9,10], [3,3,3,2,2,2,2,2,1,1]);  
print(Q5sc3);
