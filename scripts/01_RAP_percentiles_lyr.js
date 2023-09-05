/*
Purpose: create a smoothed layer of RAP/RCMAP cover, that gives the a given percentile
over time and over space, to create a measure of 'potential' cover in a given area

Author: Martin Holdrege

Date started: July 28, 2023
*/


// Dependencies ---------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// Params ---------------------------------------

var resolution = 90;
var yearEnd = 2021;
var yearStart = 1986;
var radiusL = [707, 2000, 5000, 10000]; // how much to smooth spatially (meters), 707 is distance from the center to
// the corner of a 1 km grid cell
var dateString = '20230905';
// var path = SEI.path;
var path = SEI.path;



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

var reducer = ee.Reducer.percentile([5, 50, 95]); //calculating 5th, median and 95 percentile
var rap1 = rapIc.reduce(reducer);
var rcmap1 = rcmapIc.reduce(reducer);

Map.addLayer(rapIc.select('PFG').mean(), {min:0, max: 75, palette: ['white', 'green']}, 'rap mean', false);
Map.addLayer(rap1.select("PFG_p95"), {min:0, max: 75, palette: ['white', 'green']}, 'rap 95th', false);

// smooth spatially ---------------------------------------------

// iterate over spatial smoothing
for ( var i = 0; i < radiusL.length; i++){
  
var radius = radiusL[i];
var rapSmooth1 = rap1
  .reduceNeighborhood(reducer,ee.Kernel.circle(radius,'meters'),null, false);
  
var rapSmooth2 = rapSmooth1.select(['PFG_p50_p50', 'PFG_p50_p95', 'AFG_p50_p50', 'AFG_p50_p5']);
                                    
var rcmapSmooth1 = rcmap1
  .reduceNeighborhood(reducer,ee.Kernel.circle(radius,'meters'),null, false)
  .select(['sagebrush_p50_p50', 'sagebrush_p50_p95']);
                               

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
  crs: SEI.crs  
});

}
  
  
