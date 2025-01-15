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
var scdrrF = require("users/MartinHoldrege/scd_rr:src/general_functions.js"); // for matching projections
// parameters --------------------------------------------------------------------------------

var resolution = 90;
var path = SEI.path;
var run = 'fire1_eind1_c4grass1_co20_2311'; // this is the 'Default'
var RCP = 'RCP45';
var epoch = '2070-2100';
var toDouble = true; // make area calculations using higher precision

var saveOutputs = true; //  false; //
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

// change projections----------------------------------------------------------------------------

// see if differences are mostly due to projection/scale differences

var c9_gee_reproj = scdrrF.matchProjections(c9_pub, c9_gee);
// visualize -----------------------------------------------------------------------------------

var neq = c9_gee.unmask().neq(c9_pub.unmask()).selfMask();
var neq_reproj = c9_gee_reproj.unmask().neq(c9_pub.unmask()).selfMask();

Map.addLayer(c9_pub, figP.visc9, 'c9 pub', false);
Map.addLayer(c9_gee, figP.visc9, 'c9 gee', false);
Map.addLayer(c9_gee_reproj, figP.visc9, 'c9 gee reprojected', false);
// differences arise between these two datasets at edges of an 
// area of a given class
// b/ pixels don't align
Map.addLayer(neq, {palette: 'orange'}, 'where different', false);
Map.addLayer(neq_reproj, {palette: 'orange'}, 'where different after reprojection', false);

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
var area_pub = fnsRr.areaByGroup(c9_pub, 'c9_median', c9_pub.geometry(), resolution, toDouble)
    // adding additional proprties to the feature
      .map(addProperties);
var area_gee = fnsRr.areaByGroup(c9_gee, 'c9_median', c9_gee.geometry(), resolution, toDouble)
      .map(addProperties);
// can't use it's own geometry (throws error, maybe b/ it has been reprojected so doesn't have it?)
var area_gee_reproj = fnsRr.areaByGroup(c9_gee_reproj, 'c9_median', c9_pub.geometry(), resolution, toDouble)
      .map(addProperties);      
      
// area image -----------------------------------------------------------------------------------

// for comparison with area image created in R from the c9_pub tif (see if area
// per pixel is exactly the same)

var areaImage0 = ee.Image
  .pixelArea();

  
var areaImage1 = scdrrF.matchProjections(c9_pub, areaImage0)
  .updateMask(c9_pub)
  .rename('areaPerPixel');
  

Map.addLayer(areaImage1, {min: 8099, max: 8101, palette: 'red,blue'}, 'area per pixel', false);

// save output ---------------------------------------------------------------------------
if(saveOutputs) {
  
  var v = 'v2';
  
  if (toDouble) {
    var v = 'v3_toDouble'
  };
  
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
  
  Export.table.toDrive({
    collection: area_gee_reproj,
    description: s + 'from-gee-asset-reproj_' + v,
    folder: 'SEI',
    fileFormat: 'CSV'
  });
  
  Export.image.toDrive({
    image: areaImage1,
    description: 'area_from_c9_pub',
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolution,
    region: c9_pub.geometry(),
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });

}

