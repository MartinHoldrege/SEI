/*
  * Purpose: Run area calculations, to check for discrepencies (i.e. numbers should
  * similar between different assets/tifs etc). These can then also be compared against
  * area calculations done in R. Particularly interested in checking areas from
  * rasters that then allow for calculations of amount of core/grow/other under
  * a given time period/scenario. 
  *
  * Author: Martin Holdrege
  * 
  * Script started Jan 10, 2025
  *
*/

// dependencies ---------------------------------------------------------------------------

var SEI = require('users/MartinHoldrege/SEI:src/SEIModule.js');
var figP = require('users/MartinHoldrege/SEI:src/fig_params.js');
var lyrMod = require("users/MartinHoldrege/SEI:scripts/05_lyrs_for_apps.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function
// parameters --------------------------------------------------------------------------------

var resolution = 90;
var path = SEI.path;
var run = 'fire1_eind1_c4grass1_co20_2311' // this is the 'Default'
var RCP = 'RCP45';
var epoch = '2070-2100';

var saveOutputs = false;
// read in images --------------------------------------------------------------------------

// data release tif ingested into gee
var c9_pub = ee.Image(path + 'data_publication2/c9_Default_' + RCP + '_2071-2100')
  .select('b2')
  .rename ('c9_median'); // b2 is the median

// object created within gee (has different projection, maybe subtly different in other ways)
var m = lyrMod.main({
  root: run + '_',
  RCP: RCP,
  epoch: epoch
});

var c9_gee = SEI.ic2Image(ee.ImageCollection(m.get('c9Red')), 'GCM')
  .select('c9_median');

// visualize -----------------------------------------------------------------------------------

var neq = c9_gee.unmask().neq(c9_pub.unmask()).selfMask();

Map.addLayer(c9_pub, figP.visc9, 'c9 pub', false);
Map.addLayer(c9_gee, figP.visc9, 'c9 gee', false);

// differences arise between these two datasets at edges of an 
// area of a given class
// b/ pixels don't align
Map.addLayer(neq, {palette: 'orange'}, 'where different', false);

Map.addLayer(c9_pub.eq(3).selfMask(), {palette: 'blue'}, 'pub is 3', false);
print('Nominal Scale:', c9_pub.projection().nominalScale());

// area calculations ----------------------------------------------------------------------------

var addProperties = function(x) {
  var out = ee.Feature(x)
    .set('run', ee.String(run))
    .set('RCP', ee.String(RCP))
    .set('years', ee.String(epoch));
  return out;
};

// using the image geometry so that trimming at edge isn't causing the discrepency
// with calculations in R
var area_pub = fnsRr.areaByGroup(c9_pub, 'c9_median', c9_pub.geometry(), resolution)
    // adding additional proprties to the feature
      .map(addProperties);
var area_gee = fnsRr.areaByGroup(c9_gee, 'c9_median', c9_pub.geometry(), resolution)
    // adding additional proprties to the feature
      .map(addProperties);

// save output ---------------------------------------------------------------------------
if(saveOutputs) {
  
  var v = 'v2';
  var s = 'c9_area_check_' + resolution + 'm_';
  Export.table.toDrive({
    collection: area_pub,
    description: s + 'from-pub-asset_' + v,
    folder: 'SEI',
    fileFormat: 'CSV'
  });
  
  Export.table.toDrive({
    collection: area_gee,
    description: s + 'from-gee-asset_' + v,
    folder: 'SEI',
    fileFormat: 'CSV'
  });

}

