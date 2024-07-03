// Purpose: Output an average sagebrush cover layer, for use to base a study area on for 
// STEPWAT2 simulations

// Author: Martin Holdrege

// Started: June 28, 2024

// params ---------------------------------------------------------------

var resolution = 30; // output resolution
var yearStart = '2001';
var yearEnd = '2020';

// dependencies ------------------------------------

var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");

// read in data ---------------------------------------

// newest version of RCMAP
var rcmap1 = ee.ImageCollection("USGS/NLCD_RELEASES/2023_REL/RCMAP/V6/COVER");
print(rcmap1.first())
// mask/and time-period -------------------------------------------------

var sageIc = rcmap1
  .select('rangeland_sagebrush')
  .filter(ee.Filter.gte('system:index', yearStart))
  .filter(ee.Filter.lte('system:index', yearEnd))
  .map(function(x) {
    return ee.Image(x).updateMask(SEI.mask);
  });

// average ----------------------------------------------

var sageAvg = sageIc.mean();


Map.addLayer(sageAvg, {min:0, max:15, palette: ['white', 'green']}, 'Avg sage cover',false)

Map.addLayer(SEI.mask.unmask().eq(1).and(sageAvg.unmask().lt(1)), {min:0, max:1, palette: ['white','red']}, 'SCD-sage difference', false)
Map.addLayer(SEI.mask, {min:0, max:1, palette: ['white','black']}, 'SCD study area', false)
Map.addLayer(sageAvg.gt(0), {min:0, max:1, palette: ['white','blue']}, 'sage based study area',false)

// export ------------------------------------------------------------
var s = 'RCMAPv6_sage-cover_mean_scd-extent_gt1_' + yearStart + '_' + yearEnd  + '_' + resolution + 'm';
Export.image.toDrive({
  image: sageAvg,
  description: s,
  folder: 'SEI',
  maxPixels: 1e13, 
  scale: resolution,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF',
  formatOptions: {
    cloudOptimized: false
  }
});
