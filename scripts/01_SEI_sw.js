
/********************************************************
 * Purpose:
 * Calculate the Sagebrush Ecosystem Integrity with
 * values from stepwat (annuals, perennials, sagebrush) used
 * in the formuala directly 
 * 
 * Script Started: 1/25/2023
 * 
 * Author: Martin Holdrege
 * (this script borrows heavily from original SEI code written
 * by Dave Theobald)
*/

// Next steps:
// re-order to bring tree & hmod data up top
// improve comments
// build in gcm loop
// combine output into multilayer bands
// start with empty image, and remove the empty band before writing out asset

// User-defined variables.

var yearEnd = 2020 ; // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3; // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 1000;     // output resolution, 90 initially, 30 m eventually

var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = 'vsw1'; // first version calculating sei directly from stepwat output
var dateString = '_20230308'; // for appending to output file names

// which stepwat output to read in?
var rootList = 'c4on_';
var RCPList =  'Current';
var epochList = 'Current';
var grazeList = 'Light';
var GCM = 'Current';


// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// Q curves to use for STEPWAT biomass. Based on the original 
// Q curves, quantile matched back to stepwat biomass. Note these
// curves will need to be updated (i.e. new percentiles calculated)
// for the new stepwat simulation runs
var Q = require("users/mholdrege/SEI:src/qCurves4StepwatOutput.js");

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var biome = SEI.biome;
var region = SEI.region;
var WAFWAecoregions = SEI.WAFWAecoregions; // polygons outlining the 3 regions
var H = SEI.H2019; // human modification dataset from 2019
var tundra = SEI.tundra;
var mask = SEI.mask; 

// image visualization params
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']};
var imageVisQ5sc = {"opacity":1,"bands":["constant_mean"],"min":1, "max":10,"palette":["e7ed8b","23b608","107a0e","082b08"]};

Map.addLayer(mask.selfMask(),{min:1,max:1},'rangeMask from NLCD with playas',false);

// Prepare tree dover data ----------------------------------------------------


// changed logic of years to incorporate fires
// select RAP year images, but remove years prior if a fire occured in years 1, 2, or 3
// DT has made this file public, and I ran into issue exporting it (contains both polygons and lines which
// can't both be in a shapefile)
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History'); 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2'); //


var ones = ee.Image(1);
var lstTree = ee.List([]);
for (var y=yearEnd; y>=yearStart; y--) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd));
  
  // MH creates a raster where 0 is area of fire, 1 is no fire (that year)
  var imageWildfire = ones.paint(wildfiresF, 0); // if a fire occurs, then remove 

  // MH mean across layers of ic. then multiply to remove areas that are fire
  var tree1 = ic.filterDate(y + '-01-01',  y + '-12-31')
    .select('TREE')
    .mean()
    .multiply(imageWildfire.selfMask()); // remove,  

  var lstTree = lstTree.add(tree1);
}


var tree = ee.ImageCollection(lstTree).mean(); // replace rap collection with mean of wildfire filtered images
Map.addLayer(tree,{min:0, max:75, palette: ['white', 'darkgreen']},'tree all 4 years',false);


var rapTree = tree1 // trees
  .multiply(tundra); // not sure if this actually needed here

// smooth within 560 radius
var rapTree560m = SEI.mean560(tree)
  .divide(100.0)
  .unmask(0.0);
  
// prepare HMod data ---------------------------------------------------

// smooth to 560 meters
var H560m = SEI.mean560(H)
  .unmask(0.0); 

// Loop of scenarios
for (var j=0; j<RCPList.length; j++) {
  var root = rootList[j];
  var RCP = RCPList[j];
  var epoch = epochList[j];
  var graze = grazeList[j];
  
  // image to which bands will be added
  var outputByGCM = ee.Image(0).rename('empty');
  
  
  
  if(RCP == 'Current') {
    var GCMList = ['Current'];
  } else {
    var GCMList = ['CESM1-CAM5','CSIRO-Mk3-6-0','CanESM2','FGOALS-g2','FGOALS-s2','GISS-E2-R',
      'HadGEM2-CC','HadGEM2-ES','IPSL-CM5A-MR','MIROC-ESM','MIROC5','MRI-CGCM3','inmcm4'];
  }
  
  // Loop over GCMs
  for (var g=0; g<GCMList.length; g++) {
    var GCM = GCMList[g];
  // read in stepwat vegetation data
  
    // plant functional types for which stepwat output is being loaded in
    var pftList = ['Aforb', 'Cheatgrass', 'Pherb', 'Sagebrush'];
    
    var s = '_' + RCP + '_' + epoch  + '_' + graze + '_' + GCM;
    
    // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
    // assets for each PFT
    var genericPath = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + s;
    var sw1 = SEI.readImages2Bands(genericPath, pftList);
    
   
    // annual forb and grass aboveground biomass (simulated)
    var annual = sw1.select('Aforb')
      .add(sw1.select('Cheatgrass'))
      .rename('afg');
      
    // perennial forb and grass aboveground biomass (simulated)
    var perennial = sw1.select('Pherb')
      .rename('pfg');  
      
    // sagebrush aboveground biomass (simulated)
    var sage = sw1.select('Sagebrush')
      .rename('sage');
      
    Map.addLayer(annual, {min:0, max:100, palette:['white', 'darkgreen']},  'annuals' + s, false);
    Map.addLayer(perennial, {min:0, max:150, palette:['white', 'darkgreen']},  'perennial' + s, false);
    Map.addLayer(sage, {min:0, max:600, palette:['white', 'darkgreen']},  'sage' + s, false);
    
    
    /**
    * Model overview with steps: 
    * 1. get 4 year average of % cover from RAP, adjusted by fire perimeters
    * 2. smooth % cover from RAP by "ecological" context using Gaussian kernel radius
    * 3. convert smoothed % cover to "quality" through HSI curves
    * 4. combine resources (sage, perennial) and threats (annual grass, tree, human modification) by multiplication
    * 5. smooth quality by "management" level context using Gaussian kernel radius
    * 6. find deciles and then reclass to 3-classes: core, grow, treat
    * 7. export image with data layers as bands in an image asset
    */
    
    
    ///////////////////////////////////////
    // 1. step 1 - 
    
    // remove pixels classified as sage that are "tundra" in high-elevation mountain settings above timerline
    var annual = annual // AFG
      .multiply(tundra); 
    var perennial = perennial // PFG 
      .multiply(tundra); 
    var sage = sage
      .multiply(tundra); 
    
    /**
     * Step 2. smooth raw data
     * 
     * averaging the cells within 560 m of a given focal cell, but weighting the further cells less.
     * the weights are derived from a normal distribution with a sd of 560. 
     * 
     * For now I'm not smoothing the stepwat biomass data b/ it's not really relavent b/ it's native
     * resolution is 1km
     */
     
    
    var sage560m = sage
      .unmask(0.0); // masked pixels converted to 0
    
    var annual560m = annual
      .unmask(0.0);
    var perennial560m = perennial
      .unmask(0.0);
      
    
    /**
     * Step 3. convert smoothed % cover to quality using HSI curves
     * Note that remap values for HSI are grouped ecoregion specific: 1st column=Great Basin, 2nd column: Intermountain, 3rd column: Great Plains
     */
     
    var Q1 = ee.Image(0.0).float();
    var Q2 = ee.Image(0.0).float();
    var Q3 = ee.Image(0.0).float();
    var Q4 = ee.Image(0.0).float();
    var Q5 = ee.Image(0.0).float();
    
    var lstEcoregionIds = ['00000000000000000000','00000000000000000001','00000000000000000002']; // GB, IM, Pl
    
    for (var e=1; e<=lstEcoregionIds.length; e++) {
      var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('system:index', lstEcoregionIds[e-1])); //
      var Q1x = SEI.raw2HSI(sage560m, Q.sageQBio1, e)
        .max(0.001) // eplaces values less than 0.001 with 0.001
        .multiply(mask) // values that are not rangeland become zero, 
        .clip(ecoregion) // clip to the ecoregion being looped through
        .unmask(0.0); // convert masked values to 0.
         
      var Q1 = Q1.max(Q1x); // MH combining ecoregions (because values will be 0 if pixel not in the ecoregion of interest)
    
      var Q2x = SEI.raw2HSI(perennial560m, Q.perennialQBio1, e)
        .max(0.001)
        .multiply(mask)
        .clip(ecoregion)
        .unmask(0.0);
      
      var Q2 = Q2.max(Q2x);
    
      var Q3x = SEI.raw2HSI(annual560m, Q.annualQBio1, e)
        .max(0.001)
        .multiply(mask)
        .clip(ecoregion)
        .unmask(0.0);
        
      var Q3 = Q3.max(Q3x);
    
      var Q4x = SEI.raw2HSI(H560m, SEI.lstH2Q, e)
        .max(0.001).multiply(mask).clip(ecoregion).unmask(0.0);
      var Q4 = Q4.max(Q4x);
    
      var Q5x = SEI.raw2HSI(rapTree560m, SEI.lstTree2Q, e)
        .max(0.001).multiply(mask).clip(ecoregion).unmask(0.0);
      var Q5 = Q5.max(Q5x);
    }
    
    // Display Q images
    // Step 4. is integrated here, multiplying each factor by the earlier one
    // this multiplication is calculating the SEI (continuous), variable
    
    var Q2y = Q1.multiply(Q2); 
    var Q3y = Q2y.multiply(Q3);
    var Q4y = Q3y.multiply(Q4);
    
    var Q5y = Q4y.multiply(Q5).clip(biome); // this is the final multiple (i.e. SEI560)
    Map.addLayer(Q5y,imageVisQ,'Q5y (SEI560_',false); 
    Map.addLayer(Q5y.updateMask(Q5y.gt(0.0)),imageVisQ,'Q5y selfMask',false);
    
    /**
     * Step 5. Smooth quality values to reflect "management" scale
     */
     
    var Q5s = Q5y // this is SEI2000
      .unmask(0)
      .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
      .multiply(mask);
    
    // MH here the updateMask call dictates that 0 SEI values aren't shown 
    Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s mask (SEI2000)',false);
    
    
    /**
     * Step 6. Classify
     * Calculate and classify Q5s into decile classes.
     */
     
    // decile-based classes, derived and hard-coded from Q5s_deciles
    var Q5scdeciles = SEI.decileFixedClasses(Q5s);
      
    // Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
    // Note that the team had discussions about removing "island" < corePatchSize. V1.1 results did NOT include their removal.
    var Q5sc3 = Q5scdeciles.remap([1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1]);
    Map.addLayer(Q5scdeciles.selfMask(),imageVisQ5sc,'Q5s decile classes' + s,false);
    Map.addLayer(Q5sc3.selfMask(),{"min":1, "max":3},'Q5s 3 classes' + s,false);
    

    /**
     * Step 7. Export stack of images into bands sent to GEE asset.
     * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
     * and needs to be unpacked when exporting to GeoTIFF.
    */
    
    var outputByGCM = outputByGCM
      .addBands([
        Q1.float().rename('Q1raw_' + GCM),
        Q2.float().rename('Q2raw_' + GCM),
        Q3.float().rename('Q3raw_' + GCM),
        Q4.float().rename('Q4raw_' + GCM),
        Q5.float().rename('Q5raw_' + GCM),
        Q5y.float().rename('Q5_' + GCM),
        Q5s.float().rename('Q5s_' + GCM),
        Q5scdeciles.byte().rename('Q5scdeciles_' + GCM),
        Q5sc3.byte().rename('Q5sc3_' + GCM)
      ]);
    
  }// end loop over GCM
  
  var fileName = 'SEI' + version + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM_' + dateString;
  // Export.image.toAsset({ 
  //   image: outputByGCM, //single image with multiple bands
  //   assetId: path + version + '/sw_SEI/' + fileName,
  //   description: fileName,
  //   maxPixels: 1e13, scale: resolution, region: region,
  //   crs: 'EPSG:4326'    // set to WGS84, decimal degrees
  // });
  
}// end loop over scenario
