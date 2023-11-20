/*
Purpose: Calculate the area where each Q component (sage, pfg, afg) are 
the dominant reason for change. Do this seperately for each of the 9 transition
classes, and the 3 ecoregions

Author: Martin Holdrege

Started: Nov 20, 2023
*/

// params ---------------------------------------------------------------

var roots = ['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
            'fire1_eind1_c4grass1_co21_2311_'];
var root = roots[1]
var resolution = 90;

// dependencies ---------------------------------------------------------

// Load module with functions 
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function
// this is where the data wrangling occurs
// contains one main function
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");
var d = lyrMod.main({
  root: root,
  resolution: resolution
}); // returns a dictionary

// which Q dominant driver of change ---------------------------------

var q = ee.Image(d.get('qPropMean'));

var driver = ee.Image(0)
  .where(q.select('Q1raw')
    .gt(q.select('Q2raw'))
    .and(q.select('Q1raw').gt(q.select('Q3raw'))),
    1) // sagebrush dominant driver of change
  .where(q.select('Q2raw')
    .gt(q.select('Q1raw'))
    .and(q.select('Q2raw').gt(q.select('Q3raw'))),
    2) // perennials
  .where(q.select('Q3raw')
    .gt(q.select('Q2raw'))
    .and(q.select('Q3raw').gt(q.select('Q1raw'))),
    3); // annuals

// prepare spatial index -----------------------------------------------

var eco = ee.Image().paint(SEI.WAFWAecoregions, 'ecoregionNum')
  .updateMask(SEI.mask);
  
// first digit ecoregion, 2nd 9 class transition, 3rd which PFT most dominant driver of change
var index = eco
  .multiply(10)
  .add(ee.Image(d.get('p')).select('p6_c9Med'))
  .multiply(10)
  .add(driver)
  .updateMask(SEI.mask)
  .rename('index')
  .toInt();
  

// calculate area for unique values of the spatial index ----------------

var areaFc1 = fnsRr.areaByGroup(index, 'index', SEI.region, 10000);

var areaFc2 = areaFc1.map(function(x) {
  var out = ee.Feature(x)
    .set('run', ee.String(root))
    .set('RCP', ee.String(d.get('RCP')))
    .set('years', ee.String(d.get('epoch')));
  return  out;
});

print(areaFc2)

