

/********************************************************
 * Purpose:
 * Calculate the Sagebrush Ecosystem Integrity with
 * values from stepwat (annuals, perennials, sagebrush biomass) used
 * in the formuala directly. In iteration using q curves that are derived from cover-biomass relationship
 * for sage (from Scott C.) and perennials (gamm fit to RAP), and annuals (from Mahood et al). 
 * this is method 4 for calculation stepwat based SEI
 * 
 * Script Started: 1/25/2023
 * 
 * Author: Martin Holdrege
 * (this script borrows heavily from original SEI code written
 * by Dave Theobald)
 * 
 * 
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
var minorV = '4'; // minor version 4 refers to 'method 4' of calculating SEI directly from stepwat biomass, which is then convertet to cover
var patch = '1'; // patch 0 is the mahood afg cover-biomass equations, patch 1 is rap based equation

// which stepwat output to read in?
var rootList = ['fire1_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_'];
var RCPList =  ['Current', 'RCP45'];
var epochList = ['Current', '2070-2100'];
var grazeList = ['Light', 'Light'];

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// Q curves to use for STEPWAT biomass. Based on the original 
// Q curves, but converted to biomass using cover vs biomass relationships

//var Q0 = require("users/mholdrege/SEI:src/qCurves4StepwatOutput.js"); // q curves from percentile matching
var Q = require("users/mholdrege/SEI:src/qCurves4StepwatOutput2.js"); // q curves from biomass-cover equations

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

// current SEI version 3 from Theobald
var cur = SEI.cur;

// Loop over climate scenarios ------------------------------------------------------

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
    var GCMList = SEI.GCMList;
  }
  
  // Loop over GCMs ---------------------------------------------------------------------
  for (var g=0; g<GCMList.length; g++) {
    var GCM = GCMList[g];
  
  // read in stepwat vegetation data
  

    var s = '_' + RCP + '_' + epoch  + '_' + graze + '_' + GCM;
    
    // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
    // assets for each PFT
    var genericPath = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + s;
    
    // this function also sums cheatgrass and aforb to get aft
    var sw1 = SEI.readImages2Bands(genericPath)
    // remove pixels classified as sage that are "tundra" in high-elevation mountain settings above timerline
      .multiply(tundra);
    
       // annual forb and grass aboveground biomass (simulated)
    var annual = sw1.select('afg');
      
    // perennial forb and grass aboveground biomass (simulated)
    var perennial = sw1.select('pfg');
      
    // sagebrush aboveground biomass (simulated)
    var sage = sw1.select('sage');
      
    Map.addLayer(annual, {min:0, max:100, palette:['white', 'darkgreen']},  'annuals' + s, false);
    Map.addLayer(perennial, {min:0, max:150, palette:['white', 'darkgreen']},  'perennial' + s, false);
    Map.addLayer(sage, {min:0, max:600, palette:['white', 'darkgreen']},  'sage' + s, false);
    
    /**
     * Step 2. smooth raw data
     * 
     * Not actually smoothing here b/ the stepwat data has a resolution of 1000m and smoothing at a finer resolution
     * (560 m) shouldn't actually do much
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
    
    var ecoregionNms = ['GreatBasin', 'Intermountain', 'Plains']; // GB, IM, Pl
    
    for (var e=1; e<=ecoregionNms.length; e++) {
      var ecoregion = WAFWAecoregions.filter(ee.Filter.eq('ecoregion', ecoregionNms[e-1])); //
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
  print(outputByGCM);
  Export.image.toAsset({ 
    image: outputByGCM, //single image with multiple bands
    assetId: path + version + '/sw_SEI/' + fileName,
    description: fileName,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326'
  });
  
}// end loop over scenario
