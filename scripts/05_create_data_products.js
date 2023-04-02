/********************************************************
 * Purpose:
 * 
 * Create data products (image assets) that show future sagebrush integrity, 
 * including uncertainty between GCMs. Most of these are the data products outlined in the data
 * management plant submitted in 2022 titled 'Assessing the future sagebrush core
 *  habitats: impacts of climate & climate uncertainty, wildfire and invasive species'
 * This code is meant to read in current and future SEI, and then create these images,
 * and should be agnostic of the method used to calculate the future SEI (i.e. so that the script
 * can be used with only minor changes, regardless of the upstream approach, 
 * which is still being developed)
 * 
 * 
 * Script Started: April 1, 2023
 * 
 * Author: Martin Holdrege
 * 
 * 
 * Datasets that are/will be created in this script:
 * 
 * 1: Median projected change in SEI relative to current conditions 
 * 2: Median future classification of CSA, GOA, and ORA
 * 3: Confidence in the projected direction of future change in SEI 
 * 4: Range in projected changes in SEI 
 * 5: Agreement among GCMs of future classification of CSA, GOA, and ORA
 * 6: 9 class raster--showing median change in designation of CSA, GOA and ORA 
 * (this one wasn't in the data management plant but would be useful in other
 * analyses I think)
 * 7: 9 class raster, as for 6, but for each GCM (also not part of the datamanagement plan,
 * but useful, I think)
 * 
 * In output these products will be bands in the image with prefix names such as p1_... meaning product 1, 
 * *******************************************************
*/ 

// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output (and input) resolution, 30 m eventually
var version = 'v11'; // 'vsw2'; // version (most importantly defines how future SEI was calculated)
var dateString = '_20221010'; // _20230327'; // // for appending to output file names (and reading in files)

// which stepwat output to read in?
// (this is in addition to 'Current' conditions)
var root = 'ClimateOnly_'; // c4on_';
var RCP =  'RCP85';
var epoch = '2030-2060';

// the change in SEI from current to future that is deemed significant or 'substantial':
var sigDelta = 0.05; // (just using a place holder value for now)

// dependencies -----------------------------------------------------------

// odule with functions etc.
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var region = SEI.region;

// read in data ---------------------------------------------------------------

// current SEI (update which file is used, as needed)
// band Q5 is SEI560, and Q5s is SEI2000
var cur1 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');

// future SEI
// the _2017_2020_ corresponds to the current years from which the current observed SEI is based on
// (and should be update if a new observed SEI layer is used)
// temporary fix, b/ some older assets are not at a consistent resolution
if(version == 'v11') {
  var resolutionInput = 90;
} else {
  var resolutionInput = resolution;
}

var assetName = 'SEI' + version + '_2017_2020_' + resolutionInput + "_" + root +  RCP + '_' + epoch + '_by-GCM' + dateString;



// this image should have bands showing sei (continuous, 'Q5s_' prefix) and 3 class (Q5sc_ prefix) for each GCM
var fut1 = ee.Image(path + version + '/forecasts/' + assetName);

// product 1 -------------------------------------------------------------------

// difference (by GCM) relative to current conditions
var diffQ5s =  fut1
  .select('Q5s_.*') // continuous SEI for each layer
  .subtract(cur1.select('Q5s'));

// this is the product 1 layer (median prjected change in SEI)
var diffQ5sMed = diffQ5s
  .reduce('median')
  .rename('p1_diffQ5sMed');
  
// product 2 -------------------------------------------------------------------

// Median future classification of CSA, GOA, and ORA
var futSc3Med = fut1
  .select('Q5sc3_.*')// 3 class by GCM
  .reduce('median')
  .toByte()
  .rename('p2_futSc3Med');
  
// product 3 -------------------------------------------------------------------------

/*
Confidence in the projected direction of future change in SEI 

Rasters showing confidence in the changes in direction of SEI for a given RCP and time period. 
Three layerss will be created for each RCP/time-period combination. 
For a given pixel, the first raster will show the number of GCMs (out of 13) for which a substantial 
increase in SEI occurred, the second will show the number of GCMs for which little or no change in SEI 
occurred, and the third will show the number that GCMs for which a substantial decrease in SEI occurred. 
(really if the number of GCMs is known only the two rasters are needed, and the 3rd can be deduced)
*/

// did the given pixel have show a positive delta (by GCM)
var isPos = diffQ5s
  .gte(ee.Image(sigDelta));
  
// did the given pixel have show a negat delta (by GCM)
var isNeg = diffQ5s
  .lte(ee.Image(-sigDelta));
  
// # of GCMs with significant positive  deltas
var numPos = isPos
  .reduce('sum')
  .toByte()
  .rename('p3_numPos');
  
// # of GCMs with significant negative  deltas
var numNeg = isNeg
  .reduce('sum')
  .toByte()
  .rename('p3_numNeg');
  
// product 4 -------------------------------------------------------------------------------

/*
Range in projected changes in SEI 

Rasters of continuous values showing low and high projected changes in SEI  given RCP/time period. 
Two rasters will be created for each RCP/time-period combination. For a given pixel the first 
raster will show the high estimate of the change in SEI (based on results from 13 GCMs), 
the 2nd will show the low estimate of the change in SEI.
These results will help assess the range in uncertainty due to different GCMs.

Note--need to decide how define hi and low (perhaps the min and max, or the 2nd lowest and 
2nd highest values)
*/

// code TBD ...


// product 5 --------------------------------------------------------------------------------

/*
Agreement among GCMs of future classification of CSA, GOA, and ORA

Rasters showing the agreement across 13 global climate models (GCMs) of whether a pixel is classified 
as core sagebrush area (CSA), growth opportunity area (GOA), or other rangeland area (ORA) 
under given RCP and time-period. Three rasters will be created for each RCP/time-period combination. 
For a given pixel the three rasters will show 1) number of GCMs for which the pixel is classified as CSA, 
2) the number of GCMs for which the pixel is classified as GOA. The number of GCMs classifing as ORA can be 
deduced from the other two layers. 
*/


// number of GCMs where future classification is CSA
var numCSA = fut1
  .select('Q5sc3_.*')
  .eq(ee.Image(1))  // are values equal to 1 (i.e. GOA)?
  .reduce('sum')
  .toByte()
  .rename('p5_numCSA');
  
// number of GCMs where future classification is GOA
var numGOA = fut1
  .select('Q5sc3_.*')
  .eq(ee.Image(2)) // are values equal to 2 (i.e. GOA)?
  .reduce('sum')
  .toByte()
  .rename('p5_numGOA');
  
// product 6 --------------------------------------------------------------------------------  

/*
9 class raster--showing change in designation of CSA, GOA and ORA given median future designations
*/

var c9Med = SEI.calcTransitions(cur1.select('Q5sc3'), futSc3Med)
  .rename('p6_c9Med');
  
// product 7 --------------------------------------------------------------------------------  

/*
9 class raster--showing change in designation of CSA, GOA and ORA for each GCM
*/

var c9 = SEI.calcTransitions(cur1.select('Q5sc3'), fut1.select('Q5sc3_.*'))
  .regexpRename('Q5sc3_', 'p7_c9_');
  
// combine products -------------------------------------------------------------------------

var comb1 = diffQ5sMed // p1
  .addBands(futSc3Med) // p2
  .addBands(numPos) // p3
  .addBands(numNeg) // p3
  // p4 still needed
  .addBands(numCSA) // p5
  .addBands(numGOA) // p5
  .addBands(c9Med) // p6
  .addBands(c9); // p7
  
// export assets -------------------------------------------------------------------------------

var productName = 'products_' + version + '_2017_2020_' + resolution + "_" + root +  RCP + '_' + epoch + dateString;

Export.image.toAsset({ 
  image: comb1, 
  assetId: path + version + '/products/' + productName,
  description: productName,
  maxPixels: 1e13, 
  scale: resolution, 
  region: region 
  // not setting crs (temporarily) b/ of (I think) I bug on google's side
  //crs: SEI.crs,
  //crsTransform: SEI.crsTransform
});



