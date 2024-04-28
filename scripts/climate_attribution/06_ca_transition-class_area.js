/*
Purpose: Calculate the area where each Q component (sage, pfg, afg) are 
the dominant reason for change. Do this seperately for each of the 9 transition
classes, and the 3 ecoregions. seperate areas etc. calculated for each GCM.
also calculate this pixelwise for low, median, and high summarized values

Additionally, here we also calculate the amount of area falling into each
numGcmGood categoreis (for core and grow the number of GCMs that project things stay the same 
get better. This is done here (although it's not climate attribution) b/ to piggy back off
the other code developed here)

Notes:
20240425 version included 'dominant' driver for all areas w/ > 0 SEI change,
2024026 version considers the drivers to be 0 when |delta sei| < 0.01

Author: Martin Holdrege

Started: Nov 20, 2023
*/


// dependencies ---------------------------------------------------------

// Load module with functions 
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function
// this is where the data wrangling occurs
// contains one main function
var lyrMod = require("users/MartinHoldrege/SEI:scripts/05_lyrs_for_apps.js");

// params ---------------------------------------------------------------
var testRun = false; // lower resolution, for testing
var versionFull = 'vsw4-3-4';
// repeat each element of the list the desired number of times
var roots = SEI.repeatelemList(['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
                          'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'],
                          [4, 4, 4, 4]);
                          
var RCPList =  SEI.repeatelem(['RCP45', 'RCP45', 'RCP85', 'RCP85'], 4);

var epochList = SEI.repeatelem(['2030-2060', '2070-2100', '2030-2060',  '2070-2100'], 4);

var resolution = 90;
if (testRun) {
  var roots = ['fire1_eind1_c4grass1_co20_2311_']; // for testing
  var resolutionCompute = 10000; // resolution area is computed at. 
} else {
  var resolutionCompute = resolution;
}
// functions ---------------------------------------------------------

// determine whether sagebrush, perennials, or annuals has the largest scaled
// proportional change
var detDomDriver = function(x) {
    var q = ee.Image(x);
    var out = ee.Image(0)
        .where(q.select('Q1raw')
        .gt(q.select('Q2raw'))
        .and(q.select('Q1raw').gt(q.select('Q3raw'))),
        1) // sagebrush dominant driver of change
      .where(q.select('Q2raw')
        .gt(q.select('Q1raw'))
        .and(q.select('Q2raw').gt(q.select('Q3raw'))),
        2) // perennials
      .where(q.select('Q3raw')
        .gt(q.select('Q1raw'))
        .and(q.select('Q3raw').gt(q.select('Q2raw'))),
        3)// annuals
      .where(q.select('Q5s').abs().lt(ee.Image(0.01)), 0) // if there is little SEI change, consider there to by no dominant diriver
      .toByte()
      .rename('driver')
      .copyProperties(q);
    return out;
};
  
  // determine direction of change if Q5s
var detDir = function(x) {
    var img = ee.Image(x);
    var out = ee.Image(0)
      .where(img.lt(0), 1)
      .where(img.gte(0), 2);
    return out
      .rename('dirQ5s')
      .copyProperties(img);
};

// dictionary of data objections --------------------------------------

var combFc = ee.FeatureCollection([]); // empty fc that add to each loop iteration
var combFcGood = ee.FeatureCollection([]); // empty fc for the numGcm good area calculations
for (var i = 0; i < roots.length; i++) {
  var root = roots[i];
  var RCP = RCPList[i];
  var epoch = epochList[i];
  var d = lyrMod.main({
    root: root,
    RCP: RCP,
    epoch: epoch,
    resolution: resolution,
    versionFull: versionFull
  }); // returns a dictionary
  print(i);
  
  // creating image collection where the reduced values (low, median, and high) estimates
  // are called 'GCMs' so that this IC can be combined witht the actual GCM level estimates,
  // and summaries will be made for all. 
  // these low, median, high values are pixel wise

  // direction of change of SEI--1 = decrease, 2 = increase (or no change)
  var diffRed = ee.ImageCollection(d.get('diffRed2')) // change in SEI 
    .select('Q5s');
    
  var diffIcb = ee.ImageCollection(d.get('diffIc'))
    .select('Q5s')
    // merging in pixel wise
    .merge(diffRed.select('Q5s'));

  var dirQ5s = diffIcb.map(detDir);
  
  // which Q dominant driver of change ---------------------------------
  
  // image collection of 3 banded images where bands are the proportion change 
  // of Q1-Q3, and each image is for a different GCM.
  // if proportion change isn't in direction of change in q3y then treated as 0 change
  var qIc = ee.ImageCollection(d.get('qPropIc'));
  var qRed = ee.ImageCollection(d.get('qPropRed2')); // same but pixelwise values of low, median, high
  
  // print(qIc)
  // one image per GCM (& reducere), each image provides the dominant driver of change (1, 2 or 3), or 0 which is non are dominant
  var driver2 = qIc
    .merge(qRed)
    .combine(diffIcb)
    .map(detDomDriver);
  
/*  Map.addLayer(driver2.filter(ee.Filter.eq('GCM', 'median')).first().updateMask(SEI.mask), 
    {min: 0, max: 4, palette:['grey', 'red', 'green', 'blue', 'grey']}, 
    'median driver');*/

  // print(driver2)
  // prepare spatial index -----------------------------------------------
  
  var eco = ee.Image().paint(SEI.WAFWAecoregions, 'ecoregionNum')
    .updateMask(SEI.mask);
  
  var bandsRed = ee.List(['low', 'median', 'high']);
  
  // first digit ecoregion, 2nd 9 class transition (last digit is 0, and is 'empty')
  var ecoC9 = ee.ImageCollection(d.get('c9Ic')) // c9 by GCM
    // a problem in the output is that the total area of core, grow, other differs
    // between the reduced and gcm-wise layers, suggesting these layers are different
    // in a way they shouldn't be. 
    .merge(ee.ImageCollection(d.get('c9Red')))  // c9 for low, median, high SEI
    .map(function(x) {
      var c9 = ee.Image(x);
      var out = eco
        .multiply(10)
        .add(c9)
        .multiply(10)
        .rename('ecoC9')
        .copyProperties(c9);
      return out;
  });
  

  // making the 3rd digit  which PFT most dominant driver of change
  // and 4th digit (which direction SEI changed--this is relevant for 'stable' classes--still want to know
  // which direction the change was)
  var ecoC9comb = ecoC9.combine(driver2).combine(dirQ5s);
  
  var index = ecoC9comb
  //.filter(ee.Filter.inList("GCM", ee.List(SEI.GCMList)))
  .map(function(x) {
    var image = ee.Image(x);
    var out = image.select('ecoC9')
      .add(image.select('driver').unmask()) // for the reduced images in collection for some reason are masked, so making all the same
      .multiply(10)
      .add(image.select('dirQ5s'))
      .updateMask(SEI.mask)
      .rename('index')
      .toInt()
      .copyProperties(ee.Image(x));
    return out;
  });
   
  //Map.addLayer(index.first(), {palette: 'blue'}, 'index');
  // Map.addLayer(SEI.mask, {palette: 'grey'}, 'mask')
  // calculate area for unique values of the spatial index ----------------
  
  // returns feature collection of feature collections
  // outer part is 1 fc for each GCM
  // inner part is one feature per unique index value
  var areaFc1 = index.map(function(x) {
    var image = ee.Image(x);
    // returning feature for each unique value of index, giving the area
    var areas1 = fnsRr.areaByGroup(image, 'index', SEI.region, resolutionCompute)
    // adding additional proprties to the feature
      .map(function(x) {
        var out = ee.Feature(x)
          .set('run', ee.String(root))
          .set('RCP', ee.String(d.get('RCP')))
          .set('years', ee.String(d.get('epoch')))
          .set('GCM', ee.String(image.get('GCM')));
        return out;
      });
    return areas1;
  });
  

  var combFc = combFc.merge(areaFc1.flatten());
  
  // calculating area for the numGcmGood categories
  
    // calculate area for unique values of the spatial index ----------------
  
  var numGcmGood = ee.Image(d.get('numGcmGood'));
  var areaFcGood = fnsRr.areaByGroup(numGcmGood, 'numGcmGood', SEI.region, resolutionCompute)
    // adding additional proprties to the feature
      .map(function(x) {
        var out = ee.Feature(x)
          .set('run', ee.String(root))
          .set('RCP', ee.String(RCP))
          .set('years', ee.String(epoch));
        return out;
      });
      
  var combFcGood = combFcGood.merge(areaFcGood);
  //print(d.get('root'), d.get('RCP'), d.get('epoch'))
  // print(areaFc1.flatten())
} // end loop

// save output ------------------------------------------------------------------------------------

var s = versionFull + '_20240426'; 

var descript = 'area-by-ecoregionC9Driver_' + resolutionCompute + 'm_' + s;
if(testRun) {
  var descript = 'test-' + descript;
} 


Export.table.toDrive({
  collection: combFc,
  description: descript,
  folder: 'SEI',
  fileFormat: 'CSV'
});


Export.table.toDrive({
  collection: combFcGood,
  description: 'area-by-numGcmGood_' + resolution + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});

