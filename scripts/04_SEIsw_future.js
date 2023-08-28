
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
 * Maps of change in core, grow, other classification
 * based on current sei modified by 'diff' SEI
 * Compare to those maps that used the previous (doherty et al 2022) method
 * 
 * *******************************************************
*/ 


// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output (and input) resolution, 30 m eventually
var version = 'vsw2'; // first version calculating sei directly from stepwat output
var dateString = '_20230331'; //'_20230308'; //  for appending to output file names (and reading in files)
var majorV = '4'; // major version
var minorV = '4'; // minor version (i.e., method for calculating sei using stepwat data)
var patch = '0'; // increment minor changes

// which stepwat output to read in?
// (this is in addition to 'Current' conditions)
var root = 'fire1_eind1_c4grass1_co20_';
var RCP =  'RCP45';
var epoch = '2070-2100';
var graze = 'Light';

// export asset showing layers used for later exploration (not recommended at high res b/ of space):
var export_diagnostics = true; 

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
// versions strings
var version = 'vsw' + majorV + '-' + minorV;
var versionFull = version + '-' + patch;

// Read in current actual observed SEI

// band Q5 is SEI560, and Q5s is SEI2000
var cur1 = SEI.cur;

//print(cur1.bandNames())

// Read in current stepwat SEI (this only applies to minor version (method) 4)

var fileName = 'SEI' + versionFull + '_' + resolution + "_" + root +  'Current_Current_by-GCM';
var curSw1 = ee.Image(path + version + '/sw_SEI/' + fileName) // 'stepwat current'
  .mask(mask);
var curSeiSw1 = curSw1.select('Q5s_Current'); // SEI2000 band, 

// Read in Future stepwat SEI 

var fileNameFut = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';
var futSw1 = ee.Image(path + version + '/sw_SEI/' + fileNameFut)
  .mask(mask); 
var futSeiSw1 = futSw1.select('Q5s_.*'); // SEI2000 bands, (future stepwat SEI)

// median sw future SEI ------------------------------------------------------
var futSeiSwMed1 = futSeiSw1.reduce('median');

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

// sw proportion change SEI ------------------------------------------------------------

var delta1 = diff1.divide(curSeiSw1); // proportion change in SEI
var deltaMed1 = delta1.reduce('median');

// maps of all the bands (one for each GCM)
var bands = GCMNames.getInfo();
// for (var i=0; i<bands.length; i++) {
//   var band = bands[i];
//   Map.addLayer(delta1.select(band), visQDiff, 'delta ' + band, false);
//   Map.addLayer(diff1.select(band), {min:-.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'diff ' + band, false);
// }

// Change in individual Q values ------------------------------------------

// sage q values
var diffQ1Raw = futSw1.select("Q1raw_.*")
  .subtract(curSw1.select('Q1raw_Current'));
var diffQ1RawMed = diffQ1Raw.reduce('median');

// perennial q values
var diffQ2Raw = futSw1.select("Q2raw_.*")
  .subtract(curSw1.select('Q2raw_Current'));
var diffQ2RawMed = diffQ2Raw.reduce('median');

// annual q values
var diffQ3Raw = futSw1.select("Q3raw_.*")
  .subtract(curSw1.select('Q3raw_Current'));
var diffQ3RawMed = diffQ3Raw.reduce('median');

// Calculate future SEI -----------------------------------------------------

// adjust observed SEI by the change in SEI estimated from the changes
// stepwat SEI.
// creating one band of future SEI for each GCM
var fut1 = cur1.select('Q5s')
  .add(diff1);

// Calculate future core, grow, other ----------------------------------------

// decile-based classes
 var Q5scdeciles = SEI.decileFixedClasses(fut1);

// Classify Q5sdeciles into 3 major classes: (1) core, (2) grow, (3) other
var Q5sc3 = SEI.remapAllBands(Q5scdeciles, [1,2,3,4,5,6,7,8,9,10], [3,3,3,2,2,2,2,2,1,1])
  .regexpRename('^', 'Q5sc3_') // adding Q5sc3 prefix
  .toByte(); // to save space 
  
// image with both SEI (continous) and 3 class (core, grow, other) bands for each GCM
var fut2 = fut1
  .regexpRename('^', 'Q5s_')
  .addBands(Q5sc3);

// image for diagnostics -------------------------------------------------------

// creating an export layer that is for diagnostic purposes (i.e. probably most practical for low 
// resolution runs, where want to figure out the effects of various decisions)

var diagnostics = curSeiSw1 // current sei calculated from stepwat biomass
  .addBands(futSeiSwMed1.rename('futSeiSwMed')) // future stepwat sei (median accross GCMs)
  .addBands(diffMed1.rename('diffSeiSwMed')) // difference between current and future sw sei (median)
  // current q values (based on stepwat data)
  .addBands(curSw1.select(['Q1raw_Current', 'Q2raw_Current', 'Q3raw_Current']))
  // q value differences (future - current)
  .addBands(diffQ1RawMed.rename('diffQ1RawMed')) // sage
  .addBands(diffQ2RawMed.rename('diffQ2RawMed')) // perennials
  .addBands(diffQ3RawMed.rename('diffQ3RawMed')); // annuals

// save assets -----------------------------------------------------------------

// the _2017_2020_ corresponds to the current years from which the current observed SEI is based on
// (and should be update if a new observed SEI layer is used)
var assetName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';

Export.image.toAsset({ 
  image: fut2, //single image with multiple bands, 1 SEI (Q5s) and 3 class (Q5sc3) band for each GCM.
  assetId: path + version + '/forecasts/' + assetName,
  description: assetName,
  maxPixels: 1e13, 
  scale: resolution, 
  region: region 
  // not setting crs (temporarily) b/ of (I think) I bug on google's side
  //crs: SEI.crs,
  //crsTransform: SEI.crsTransform
});


if (export_diagnostics) {
  Export.image.toAsset({ 
    image: diagnostics, //single image with multiple bands (1 for each GCM)
    assetId: path + version + '/diagnostics_' + versionFull + "_" + root +  RCP + '_' + epoch,
    description: 'diagnostics_' + versionFull + "_" + root +  RCP + '_' + epoch  + dateString,
    maxPixels: 1e13, 
    scale: resolution, 
    region: region 
    // not setting crs (temporarily) b/ of (I think) I bug on google's side
    //crs: SEI.crs,
    //crsTransform: SEI.crsTransform
  });
}

