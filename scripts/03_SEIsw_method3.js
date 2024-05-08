/********************************************************
 * Purpose:
 * Calculate future SEI by taking rap cover and multiplying by proporiton change (method 3).
 * Except for sagebrush adding the delta cover is done in some (otherwise unrealistic)
 * places (and the two layers weighted.)
 * This weighting occurs in places where the proportion change from stepwat is very large
 * and current rap sage cover is very large, causing unrealistic changes in sagebrush cover. 
 * 
 * Script Started: 8/28/2023
 * 
 * Author: Martin Holdrege
 * This script borrows from code written by Dave Theobald (for Doherty et al 2022)
 *    
*/

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var Q = require("users/mholdrege/SEI:src/qCurves4StepwatOutput2.js"); // contains coefficients for biomass-cover equations

// User-defined variables.

var resolution = 90;     // output resolution, 90 eventually
var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var majorV = '4'; // major version
var minorV = '3'; // modified method 1 (deltaS is based on proportional change (but not divided by max)
var patch = '4'; // using delta approach to correct Q5s, and v1/v11 (not v3) of SEI

// which stepwat output to read in?

// repeat each element of the list the desired number of times
var rootList = SEI.repeatelemList(['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
                          'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'],
                          [4, 4, 4, 4]);
var RCPList =  SEI.repeatelem(['RCP45', 'RCP45', 'RCP85', 'RCP85'], 4);

var epochList = SEI.repeatelem(['2030-2060', '2070-2100', '2030-2060',  '2070-2100'], 4);

// var rootList = ['fire1_eind1_c4grass1_co20_2311_']; 
// var RCPList =  ['RCP45'];
// var epochList = ['2030-2060'];
var graze = 'Light';

// 'weight windows', these are the windows over which to change weights
// between proportion change and delta cover methods for calculating
// future RAP cover
var wwProp = [0.75, 1.25]; // range of proportion change over which to change
// from 100% weight for ratio method to delta additive method
var wwCov = [30, 40]; // range of future cover of RAP (calculated via the ratio approach)
// over which to changes weights. 


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


// current SEI version 3 from Theobald, also contains smoothed cover
var cur = SEI.cur;

// intercepts and slopes
var b0Image = ee.Image(Q.b0b1afg1[0]).rename('afg')
  .addBands(ee.Image(Q.b0b1pfg1[0]).rename('pfg'))
  .addBands(ee.Image(Q.b0b1sage1[0]).rename('sage'));
  
var b1Image = ee.Image(Q.b0b1afg1[1]).rename('afg')
  .addBands(ee.Image(Q.b0b1pfg1[1]).rename('pfg'))
  .addBands(ee.Image(Q.b0b1sage1[1]).rename('sage'));

// Loop over climate scenarios ------------------------------------------------------
var GCMList = SEI.GCMList;
// adding a 'control' GCM which will represent no change relative to current
// conditions to check if output is as expected (i.e. no change in SEI)
GCMList.push('control');

//var GCMList = [SEI.GCMList[0]];// for testing


for (var j=0; j<RCPList.length; j++) {
  var root = rootList[j];
  var RCP = RCPList[j];
  var epoch = epochList[j];
  
  
  
  // read in current stepwat biomass -------------------------------------------------
  // this is needed for calculating scaled % change

  // assets for each PFT

  var c = '_Current';

  // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
  var genericPathCur = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + c + c + '_' +  graze + c;
  // this function also sums cheatgrass and aforb to get aft, and also load sage and pft
  var swCur1 = SEI.readImages2Bands(genericPathCur)
  // masking so when take max only taking max of appropriate pixels
    .updateMask(mask);

  var swCurCov = SEI.bio2covLin(swCur1, b0Image, b1Image);
  
  //Map.addLayer(swCur1.select('pfg'), {min:0, max:100, palette: ['white', 'green']}, 'pfg biomass', false);  
  //Map.addLayer(swCurCov.select('pfg'), {min:0, max:70, palette: ['white', 'green']}, 'pfg cover', false);

  // image to which bands will be added
  var outputByGCM = ee.Image(0).rename('empty');
  var outputByGCMTemp = ee.Image([]); // temporary image to which bands will be added

  // Loop over GCMs ---------------------------------------------------------------------
  for (var g=0; g<GCMList.length; g++) {
    var GCM = GCMList[g];
  
    // read in stepwat vegetation data
    var s = '_' + RCP + '_' + epoch  + '_' + graze + '_' + GCM;
    
    // here 'ZZZZ' is replace by the pft inside the function, to read in the individual
    // assets for each PFT
    var genericPath = path + 'stepwat_biomass/' + root + 'ZZZZ' + '_biomass' + s;
    

    
    if (GCM == 'control') {
      var sw1 = swCur1; // making current and future identical for the 'control'
    } else {
      // this function also sums cheatgrass and aforb to get afg
      var sw1 = SEI.readImages2Bands(genericPath)
        .updateMask(mask);
    }

    var swCov = SEI.bio2covLin(sw1, b0Image, b1Image);
    
    var deltaSage = swCov.subtract(swCurCov).select('sage'); // (future - historical stepwat cover), only needed for sagebrush
    
    // proportional change
    var swProp = swCov.subtract(swCurCov).divide(swCurCov);

//    Map.addLayer(swProp.select('sage'), {min: -1, max: 1, palette: ['red', 'white', 'blue']}, 'swprop')
    /**
     * Add smoothed cover data from rap to delta stepwat percent cover. 
     * 
     */
     
    // adjusted cover (cover multiplied by proportion change)
    var futCovProp = cur.select(['sage560m', 'annualG560m','perennialG560m'])
      .double() 
      .multiply(swProp.select(['sage','afg', 'pfg']).add(ee.Image(1)))
      .min(ee.Image(100)) // in case multiplication caused cover > 100
      // units of percent, but converting to proportion for using with q curves
      .divide(100)
      .unmask(0.0);
      
    // seperately adjusting sagebrush
    //Map.addLayer(deltaSage, {min: -20, max: 20, palette: ['red', 'white', 'blue']}, 'delta sage', false)
    //Map.addLayer(cur.select(['sage560m']),{min: 0, max: 20, palette: ['white', 'green']}, 'sei sage cover', false)

    // future cover of sagebrush based on add delta sagebrush cover
    var futCovDeltaSage = cur.select(['sage560m']).add(deltaSage)
      .divide(100);    // % to proportion
    
    // determing weights for the prop and delta layers for sage
    var w1 = SEI.assignWeight(swProp.select('sage'), wwProp);
    var w2 = SEI.assignWeight(futCovProp.select('sage560m').multiply(ee.Image(100)), wwCov); // converting cover back to % to match wwCov
    var wSage = w1.max(w2); // calculating the overall weight


    // Weighted average of proportion based and delta based estimates of future sagebrush cover
    var sage560m = futCovProp.select('sage560m')
      .multiply(wSage)
      .add(ee.Image(1).subtract(wSage).multiply(futCovDeltaSage));
      

    var annual560m = futCovProp.select('annualG560m');
      
    var perennial560m = futCovProp.select('perennialG560m');
      
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
    // Map.addLayer(Q5s.updateMask(Q5s.gt(0.0)),imageVisQ,'Q5s mask (SEI2000)' + s,false);
    
    
    

    /**
     * Build a multi-band image for more compact storage of an GEE asset. This is internal to GEE
     * and needs to be unpacked when exporting to GeoTIFF.
    */
    
    var outputByGCM = outputByGCM
      .addBands([
        sage560m.rename('sage560m_' + GCM),
        perennial560m.rename('perennial560m_' + GCM),
        annual560m.rename('annual560m_' + GCM),
        Q1.float().rename('Q1raw_' + GCM),
        Q2.float().rename('Q2raw_' + GCM),
        Q3.float().rename('Q3raw_' + GCM),
        Q4.float().rename('Q4raw_' + GCM),
        Q5.float().rename('Q5raw_' + GCM),
        Q5s.float().rename('Q5s_' + GCM), // this Q5s lyr shouldn't actually be saved [corrected version below saved instead]
        // Q5scdeciles.byte().rename('Q5scdeciles_' + GCM),
        // Q5sc3.byte().rename('Q5sc3_' + GCM)
      ]);
    
    // temporary Q5s bands (prior to delta correction)  
    var outputByGCMTemp = outputByGCMTemp.addBands(
      Q5s.float().rename('Q5s_' + GCM)
    );
    
  }// end loop over GCM
  
  // calculating delta Q5s
  // this is to deal with the problem that there are slight rounding differences between the 'control' band
  // and the original SEI calculated SEI (possibly due to data type, or projection differences at time of smoothing?)
  // these rounding differences lead to movement of the 'edge' of what is classified as core, growth, other, so they 
  // are important. The downside of this correction, is that it can lead to (very slightly) negative SEI values
  // these are fixed in the lyrs_for_app.js script
  var Q5s_delta = outputByGCMTemp.select('Q5s_.*').subtract(outputByGCM.select('Q5s_control'));
  var Q5s_corrected = Q5s_delta.add(cur.select('Q5s'));

  // remove 'empty' band
  var bandsToKeep = outputByGCM.bandNames().removeAll(['empty']);
  var outputByGCM = outputByGCM.select(bandsToKeep);
  
  var version = 'vsw' + majorV + '-' + minorV;
  var versionFull = version + '-' + patch;
  var fileName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';
  
  /**
  * Step 6. Classify (here classifying the delta corrected Q5s)
  * Calculate and classify Q5s into decile classes.
  */
  
  // decile-based classes, derived and hard-coded from Q5s_deciles
  // then Classify Q5sdeciles into 3 major classes, called: core, grow, treat.
  var Q5scdeciles_corrected = SEI.decileFixedClasses(Q5s_corrected);
  
  var Q5sc3_corrected = SEI.remapAllBands(Q5scdeciles_corrected, [1,2,3,4,5,6,7,8,9,10],[3,3,3,2,2,2,2,2,1,1])
    .regexpRename('Q5s_', 'Q5sc3_');
  
  // add correct c3 classification to the output image;
  var outputByGCM = outputByGCM
    .addBands(Q5s_corrected)
    .addBands(Q5sc3_corrected);
  
  // print(outputByGCM.bandNames())
  Export.image.toAsset({ 
    image: outputByGCM, //single image with multiple bands
    assetId: path + version + '/forecasts/' + fileName,
    description: fileName,
    maxPixels: 1e13, scale: resolution, region: region,
    crs: 'EPSG:4326'
  });

  
}// end loop over scenario

//Map.addLayer(outputByGCM.select('Q5sc3_CESM1-CAM5'), {min: 1, max: 3}, "median future SEI", false);

// red in this map signifies places where there is a original sc3 reproducibility problem. 
// Map.addLayer(outputByGCM.select('Q5sc3_control').neq(cur.select('Q5sc3')).selfMask(), {min: 0, max: 1, palette: ['red']}, 'where sc3 diff', false);