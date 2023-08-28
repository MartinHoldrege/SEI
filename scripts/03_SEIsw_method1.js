

/********************************************************
 * Purpose:
 * Calculate the Sagebrush Ecosystem Integrity with
 * Using method 1. This method 1 refers to calculating
 * future SEI by multiplying rap cover by delta S as in Doherty et al 2022
 * 
 * Script Started: 8/28/2023
 * 
 * Author: Martin Holdrege
 * This script borrows from code written by Dave Theobald (for Doherty et al 2022)
 *    
 * Model overview with steps: 
 * 4. combine resources (sage, perennial) and threats (annual grass, tree, human modification) by multiplication (SEI560)
 * 5. smooth quality by "management" level context using Gaussian kernel radius (SEI2000)
 * 6. find deciles and then reclass to 3-classes: core, grow, treat
 * 7. export image with data layers as bands in an image asset
*/


// User-defined variables.

var resolution = 1000;     // output resolution, 90 initially, 30 m eventually
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var majorV = '4'; // major version
var minorV = '1'; // minor version 1 refers to 'method 1' of calculating SEI in the same manner as Doherty et al 2022 (scaled percent change)
var patch = '0'; // increment minor changes

// which stepwat output to read in?
var rootList = ['fire1_eind1_c4grass1_co20_'];
var RCPList =  ['RCP45'];
var epochList = ['2070-2100'];
var grazeList = ['Light'];

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

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

// current SEI version 3 from Theobald, also contains smoothed cover
var cur = SEI.cur;

// Loop over climate scenarios ------------------------------------------------------

for (var j=0; j<RCPList.length; j++) {
  var root = rootList[j];
  var RCP = RCPList[j];
  var epoch = epochList[j];
  var graze = grazeList[j];
  
  
  // read in current stepwat biomass -------------------------------------------------
  // this is needed for calculating scaled % change

 // plant functional types for which stepwat output is being loaded in
    var pftList = ['Aforb', 'Cheatgrass', 'Pherb', 'Sagebrush'];
  // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
    // assets for each PFT

  var c = '_Current';

  var genericPathCur = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + c + c + '_' + graze + c;
  // this function also sums cheatgrass and aforb to get aft
  var swCur1 = SEI.readImages2Bands(genericPathCur, pftList, true)
  // masking so when take max only taking max of appropriate pixels
    .updateMask(mask);
  
  // max biomass values of each pft. 
  var swMax = swCur1.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: region,
    scale: 1000 // this is the resolution of the underlying data
  });

  // image to which bands will be added
  var outputByGCM = ee.Image(0).rename('empty');
  
   var GCMList = SEI.GCMList;

  // Loop over GCMs ---------------------------------------------------------------------
  for (var g=0; g<GCMList.length; g++) {
    var GCM = GCMList[g];
  
  // read in stepwat vegetation data
  
    var s = '_' + RCP + '_' + epoch  + '_' + graze + '_' + GCM;
    
    // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
    // assets for each PFT
    var genericPath = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + s;
    
    // this function also sums cheatgrass and aforb to get afg
    var sw1 = SEI.readImages2Bands(genericPath, pftList, true)
      .updateMask(mask);
      
    // calculate scaled percent change in stepwat biomass
    // (future- current/(max current)) + 1
    // as in Dohert et al 2022
    var delta = sw1.subtract(swCur1); // diffierence between future and current
    
    // now dividing by max and adding 1
    var deltaSAnnual = delta.select('afg').divide(ee.Number(swMax.values(['afg']).get(0))).add(1);
    var deltaSPerennial = delta.select('pfg').divide(ee.Number(swMax.values(['pfg']).get(0))).add(1);
    var deltaSSage = delta.select('sage').divide(ee.Number(swMax.values(['sage']).get(0))).add(1);
    
    /**
     * Multiply smoothed cover data from rap by stepwat scaled percent change. 
     * 
     */
     
    var sage560m = cur.select('sage560m').multiply(deltaSSage)
      .unmask(0.0);
      
    var annual560m = cur.select('annualG560m').multiply(deltaSAnnual)
      .unmask(0.0);
      
    var perennial560m = cur.select('perennialG560m').multiply(deltaSPerennial)
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
    
    var ecoregionNms = ['GreatBasin', 'Intermountain', 'Plains']; // GB, IM, Pl
    
    for (var e=1; e<=ecoregionNms.length; e++) {
      var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('ecoregion', ecoregionNms[e-1])); //
      var Q1x = SEI.raw2HSI(sage560m, SEI.lstSage2Q, e)
        .max(0.001) // eplaces values less than 0.001 with 0.001
        .multiply(mask) // values that are not rangeland become zero, 
        .clip(ecoregion) // clip to the ecoregion being looped through
        .unmask(0.0); // convert masked values to 0.
         
      var Q1 = Q1.max(Q1x); // MH combining ecoregions (because values will be 0 if pixel not in the ecoregion of interest)
    
      var Q2x = SEI.raw2HSI(perennial560m, SEI.lstPerennialG2Q, e)
        .max(0.001)
        .multiply(mask)
        .clip(ecoregion)
        .unmask(0.0);
      
      var Q2 = Q2.max(Q2x);
    
      var Q3x = SEI.raw2HSI(annual560m, SEI.lstAnnualG2Q, e)
        .max(0.001)
        .multiply(mask)
        .clip(ecoregion)
        .unmask(0.0);
        
      var Q3 = Q3.max(Q3x);
    
    }
    
    // Display Q images
    // Step 4. is integrated here, multiplying each factor by the earlier one
    // this multiplication is calculating the SEI (continuous), variable
    
    var Q4 = cur.select('Q4raw');
    var Q5 = cur.select('Q5raw');
    
    var Q2y = Q1.multiply(Q2); 
    var Q3y = Q2y.multiply(Q3);
    var Q4y = Q3y.multiply(Q4);
    
    var Q5y = Q4y.multiply(Q5).clip(biome); // this is the final multiple (i.e. SEI560)

    /**
     * Step 5. Smooth quality values to reflect "management" scale
     */
     
    var Q5s = Q5y // this is SEI2000
      .unmask(0)
      .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
      .multiply(mask);
    
    // here the updateMask call dictates that 0 SEI values aren't shown 
    Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s mask (SEI2000)' + s,false);
    
    /**
     * Step 6. Classify
     * Calculate and classify Q5s into decile classes.
     */
     
    // decile-based classes, derived and hard-coded from Q5s_deciles
    var Q5scdeciles = SEI.decileFixedClasses(Q5s);
      
    // Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
    // Note that the team had discussions about removing "island" < corePatchSize. V1.1 results did NOT include their removal.
    var Q5sc3 = Q5scdeciles.remap([1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1]);

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
  
  // remove 'empty' band
  var bandsToKeep = outputByGCM.bandNames().removeAll(['empty']);
  var outputByGCM = outputByGCM.select(bandsToKeep);
  
  var version = 'vsw' + majorV + '-' + minorV;
  var versionFull = version + '-' + patch;
  var fileName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';

  Export.image.toAsset({ 
    image: outputByGCM, //single image with multiple bands
    assetId: path + version + '/forecasts/' + fileName,
    description: fileName,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326'
  });

  
}// end loop over scenario
