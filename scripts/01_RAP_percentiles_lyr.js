/*
Purpose: create a smoothed layer of RAP/RCMAP cover, that gives the 95th percentile
over time and over space, to create a measure of 'maximum potential' cover in a given area

Author: Martin Holdrege

Date started: July 28, 2023
*/


// Dependencies ---------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// Params ---------------------------------------

var resolution = 90;
var yearEnd = 2021;
var yearStart = 1986;
var radius = 2000; // how much to smooth (meters)
var dateString = '20230728';
// var path = SEI.path;
var path = 'users/MartinHoldrege/SEI/';

// Read in data -------------------------------------

var rapIc = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v3')
  .filterDate(yearStart + '-01-01',  yearEnd + '-12-31')
  .map(function(x) {
    return ee.Image(x).mask(SEI.mask).select(["PFG", "AFG"]);
  });
  
var rcmapIc = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/RCMAP/V5/COVER")
  .filter(ee.Filter.gte('system:index', ee.Number(yearStart).format('%d')))
  .filter(ee.Filter.lte('system:index', ee.Number(yearEnd).format('%d')))
// .filterDate(yearStart + '-01-01',  yearEnd + '-12-31')
  .map(function(x) {
    return ee.Image(x).mask(SEI.mask).select(['rangeland_sagebrush'], ['sagebrush']);
  });
  
// summarize across years -------------------------------------

var reducer = ee.Reducer.percentile([50, 95]); //calculating median and 95 percentile
var rap1 = rapIc.reduce(reducer);
var rcmap1 = rcmapIc.reduce(reducer);

Map.addLayer(rapIc.select('PFG').mean(), {min:0, max: 75, palette: ['white', 'green']}, 'rap mean', false);
Map.addLayer(rap1.select("PFG_p95"), {min:0, max: 75, palette: ['white', 'green']}, 'rap 95th', false);

// smooth spatially ---------------------------------------------

var rapSmooth1 = rap1
  .reduceNeighborhood(reducer,ee.Kernel.gaussian(radius, radius,'meters'),null, false);
  
var rapSmooth2 = rapSmooth1.select(['PFG_p50_p50', 'PFG_p95_p95', 'AFG_p50_p50'], 
                                    ['PFG_p50', 'PFG_p95', 'AFG_p50']);
                                    
var rcmapSmooth1 = rcmap1
  .reduceNeighborhood(reducer,ee.Kernel.gaussian(radius, radius,'meters'),null, false)
  .select(['sagebrush_p50_p50', 'sagebrush_p95_p95'], ['sagebrush_p50', 'sagebrush_p95']);
                               

print(rapSmooth2);
print(rcmapSmooth1);

// combine layers -----------------------------------------------

var comb1 = rapSmooth2.addBands(rcmapSmooth1);

// write output -----------------------------------------------
var fileName = 'cover_rap-rcmap_' + yearStart + '_' + yearEnd + '_' + resolution + 'm_' + radius + 'msmooth_' + dateString;
  
  
Export.image.toAsset({ 
  image: comb1, //single image with multiple bands
  assetId: path + 'cover/' +  fileName,
  description: fileName,
  maxPixels: 1e13, scale: resolution, region: SEI.region,
  crs: 'EPSG:4326'    // set to WGS84, decimal degrees
});


  
  
