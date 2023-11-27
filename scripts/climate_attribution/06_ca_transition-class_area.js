/*
Purpose: Calculate the area where each Q component (sage, pfg, afg) are 
the dominant reason for change. Do this seperately for each of the 9 transition
classes, and the 3 ecoregions. seperate areas etc. calculated for each GCM

Author: Martin Holdrege

Started: Nov 20, 2023
*/

// params ---------------------------------------------------------------

var roots = ['fire0_eind1_c4grass1_co20_', 
            'fire1_eind1_c4grass1_co20_2311_', 'fire1_eind1_c4grass1_co20_2311_', 'fire1_eind1_c4grass1_co20_2311_','fire1_eind1_c4grass1_co20_2311_',
            'fire1_eind1_c4grass1_co21_2311_'];
var epochList = ['2070-2100',
            '2030-2060', '2070-2100', '2030-2060', '2070-2100',
            '2070-2100'
];

var RCPList = ['RCP45',
              'RCP45', 'RCP45', 'RCP85', 'RCP85',
              'RCP45']
var resolution = 90;

// dependencies ---------------------------------------------------------

// Load module with functions 
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function
// this is where the data wrangling occurs
// contains one main function
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");


// dictionary of data objections --------------------------------------

var combFc = ee.FeatureCollection([]); // empty fc that add to each loop iteration
for (var i = 0; i < roots.length; i++) {
  var root = roots[i];
  var RCP = RCPList[i];
  var epoch = epochList[i]
  var d = lyrMod.main({
    root: root,
    RCP: RCP,
    epoch: epoch,
    resolution: resolution
  }); // returns a dictionary
  print(i)
  // which Q dominant driver of change ---------------------------------
  
  // image collection of 3 banded images where bands are the proportion change 
  // of Q1-Q3, and each image is for a different GCM
  var qIc = ee.ImageCollection(d.get('qPropIc'));
  print(qIc)
  // one image per GCM, each image provides the dominant driver of change (1, 2 or 3), or 0 which is non are dominant
  var driver = qIc.map(function(x) {
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
      .toByte()
      .rename('driver')
      .copyProperties(q);
    return out;
  });
  
  // prepare spatial index -----------------------------------------------
  
  var eco = ee.Image().paint(SEI.WAFWAecoregions, 'ecoregionNum')
    .updateMask(SEI.mask);
  
  // first digit ecoregion, 2nd 9 class transition (last digit is 0, and is 'empty')
  var ecoC9 = ee.ImageCollection(d.get('c9Ic')).map(function(x) {
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
  var index = ecoC9.combine(driver).map(function(x) {
    var image = ee.Image(x);
    var out = image.select('ecoC9')
      .add(image.select('driver'))
      .updateMask(SEI.mask)
      .rename('index')
      .toInt()
      .copyProperties(ee.Image(x));
    return out;
  });
  
  
  // calculate area for unique values of the spatial index ----------------
  
  // returns feature collection of feature collections
  // outer part is 1 fc for each GCM
  // inner part is one feature per unique index value
  var areaFc1 = index.map(function(x) {
    var image = ee.Image(x);
    // returning feature for each unique value of index, giving the area
    var areas1 = fnsRr.areaByGroup(image, 'index', SEI.region, resolution)
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

} // end loop

// save output ------------------------------------------------------------------------------------

var s = d.get('versionFull').getInfo() + '_20231120';

Export.table.toDrive({
  collection: combFc,
  description: 'area-by-ecoregionC9Driver_' + resolution + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});

