/*
Purpose: create a smoothed layer of RAP/RCMAP cover, that gives the 95th percentile
over time and over space, to create a measure of 'maximum potential' cover in a given area

Author: Martin Holdrege

Date started: July 28, 2023
*/

// Params ---------------------------------------

var resolution = 90
var yearEnd = 2021  
var yearStart = 1986

// Dependencies ---------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// Read in data -------------------------------------

var rapIc = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v3')
  .filterDate(yearStart + '-01-01',  yearEnd + '-12-31')
  .map(function(x) {
    return ee.Image(x).mask(SEI.mask).select(["PFG"]);
  });
  
var rcmapIc = ee.ImageCollection("USGS/NLCD_RELEASES/2019_REL/RCMAP/V5/COVER")
  .filter(ee.Filter.gte('system:index', ee.Number(yearStart).format('%d')))
  .filter(ee.Filter.lte('system:index', ee.Number(yearEnd).format('%d')))
// .filterDate(yearStart + '-01-01',  yearEnd + '-12-31')
  .map(function(x) {
    return ee.Image(x).mask(SEI.mask).select('rangeland_sagebrush');
  });
  
// summarize across years -------------------------------------

var reducer = ee.Reducer.percentile([95]);
var rap1 = rapIc.reduce(reducer);
print(rap1)
Map.addLayer(rapIc.mean(), {min:0, max: 50, palette: ['white', 'green']}, 'rap mean')
Map.addLayer(rap1, {min:0, max: 50, palette: ['white', 'green']}, 'rap 9th')
