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
 * 5: Agreement among GCMs of future classification of CSA, GOA, and ORA,
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

var resolution = 90;     // output (and input) resolution, 30 m eventually

var versionFull = 'vsw4-3-3';

// which stepwat output to read in?
var rootList = ['fire0_eind1_c4grass1_co20_', 'fire0_eind1_c4grass1_co20_', 'fire0_eind1_c4grass1_co20_',
                'fire1_eind1_c4grass0_co20_2311_', 'fire1_eind1_c4grass0_co20_2311_', 'fire1_eind1_c4grass0_co20_2311_',
                'fire1_eind1_c4grass1_co21_2311_', 'fire1_eind1_c4grass1_co21_2311_', 'fire1_eind1_c4grass1_co21_2311_'];

var RCPList =  ['RCP45', 'RCP85', 'RCP85',
                'RCP45', 'RCP85', 'RCP85',
                'RCP45', 'RCP85', 'RCP85'];
var epochList = ['2030-2060', '2030-2060',  '2070-2100',
                  '2030-2060', '2030-2060',  '2070-2100',
                  '2030-2060', '2030-2060',  '2070-2100'];
// the change in SEI from current to future that is deemed significant or 'substantial':
var sigDelta = 0.05; // (just using a place holder value for now)

// dependencies -----------------------------------------------------------

// module with functions etc.
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fig = require("users/mholdrege/SEI:src/fig_params.js");
// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var region = SEI.region;

// read in data ---------------------------------------------------------------

// current SEI (update which file is used, as needed)
// band Q5 is SEI560, and Q5s is SEI2000
// var cur1 = SEI.cur; // in code below using 'control' bands as cur

// loop through version

for (var i = 0; i < rootList.length; i++) {
  
  // var versionFull = versionsFull[i];
  var version = SEI.removePatch(versionFull); // version name with patch removed
  var root = rootList[i];
  var RCP = RCPList[i];
  var epoch = epochList[i];

  // future SEI
  var assetName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';
  
  // this image should have bands showing sei (continuous, 'Q5s_' prefix) and 3 class (Q5sc_ prefix) for each GCM
  var fut0 = ee.Image(path + version + '/forecasts/' + assetName);
  
  // these are the bands created when there was (artificially) no change in stepwat values from current
  // to future conditions. This was designed to overcome some of the artifacts that 
  // appear when re-calculating SEI (still unclear what the issue is)
  var cur0 = fut0.select('.*_control');
  var cur1 = cur0.regexpRename('_control', '');
  
  // removing the control bands
  var fut1 = fut0.select(
    fut0.bandNames().removeAll(cur0.bandNames())
    );

    
  // product 1 -------------------------------------------------------------------
  
  // difference in SEI (by GCM) relative to current conditions
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
  var isPosSig = diffQ5s
    .gte(ee.Image(sigDelta));
    
  // did the given pixel have show a negat delta (by GCM)
  var isNegSig = diffQ5s
    .lte(ee.Image(-sigDelta));
    
  // # of GCMs with significant positive  deltas
  var numPosSig = isPosSig
    .reduce('sum')
    .toByte()
    .rename('p3_numPos');
    
  // # of GCMs with significant negative  deltas
  var numNegSig = isNegSig
    .reduce('sum')
    .toByte()
    .rename('p3_numNeg');
    
  // direction of change by GCM 1 means decrease, 2: no change, 3 =  increase
  var dirChange = ee.ImageCollection.fromImages([
    diffQ5s.gt(0).multiply(3),
    diffQ5s.eq(0).multiply(2),
    diffQ5s.lt(0)])
    .sum();

  // median change in direction
  var dirChangeMed = ee.ImageCollection.fromImages([
    diffQ5sMed.gt(0).multiply(3),
    diffQ5sMed.eq(0).multiply(2),
    diffQ5sMed.lt(0)])
    .sum();
  
  // number of GCMs that agree with the median on the direction 
  // of change
  var numAgree = dirChange
    .eq(dirChangeMed)
    .reduce('sum')
    .toByte()
    .rename('p3_numAgree');

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
  
  // for now limiting the number of layers saved--because some may not be useful, and they
  // take up a lot of storage space. 
  var comb1 = diffQ5sMed // p1 used
    .addBands(futSc3Med) // p2
    //.addBands(numPosSig) // p3
    //.addBands(numNegSig) // p3
    //.addBands(numAgree) // 3
    // p4 still needed
    .addBands(numCSA) // p5
    .addBands(numGOA) // p5
    .addBands(c9Med); // p6 used
    //.addBands(c9); // p7
    
  //
  Map.addLayer(comb1.select('p6_c9Med'), fig.visc9, versionFull + ' c9Med', false)
  // Map.addLayer(comb1.select('p6_c9Med').updateMask(comb1.select('p6_c9Med').remap([1, 5, 9], [0, 0, 0])), 
  //   {min: 1, max: 9, palette: fig.c9Palette}, 
  //   versionFull + ' c9Med change', false)
  Map.addLayer(comb1.select('p1_diffQ5sMed'), {min: -0.5, max: 0.5, palette: ['red', 'white', 'blue']}, versionFull + ' diffQ5sMed', false)
  
  // export assets -------------------------------------------------------------------------------
  

  var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
  var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;
  
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

}

//Map.add(fig.legendc9)