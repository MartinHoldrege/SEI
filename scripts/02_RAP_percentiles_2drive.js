/*
  Purpose:
  write asset of(smoothed mediant median and 95 percentile) cover created in 01_RAP_percentiles_lyr.js.
  That asset was created at a fairly high resolution (90 m), so the 95th percentiles would be accurate
  Here outputting it at a coarser resolution for later use, but because pyramiding is based
  on average (here averages of the correct percentiles calculated at a finer scale) the 
  coarse res values should be accurate.
  
  Author: Martin Holdrege
  
  Started: July 31, 2023
*/

// Dependencies ---------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// params

var scale = 1000;
var yearEnd = 2021;
var yearStart = 1986;
var radius = 2000; // how much to smooth (meters)
var dateString = '20230728';
// var path = SEI.path;
var path = 'users/MartinHoldrege/SEI/';

// read in asset -----------------------------------------------
var fileName = 'cover_rap-rcmap_' + yearStart + '_' + yearEnd + '_' + 90 + 'm_' + radius + 'msmooth_' + dateString;

var comb1 = ee.Image(path + 'cover/' + fileName);



// write to drive ----------------------------
var fileNameOut = 'cover_rap-rcmap_' + yearStart + '_' + yearEnd + '_' + scale + 'm_' + radius + 'msmooth_' + dateString;

Export.image.toDrive({
  image: comb1,
  description: fileNameOut,
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});