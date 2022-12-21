/*
Purpose: Figure out the percentiles of RAP and rcmap data that correspond
to q-curves. So that then quantile matching can be used to create 'new' q-curves
to use with 

Author: Martin Holdrege

Date Started 12/19/2022
*/

// params ---------------------------------------------------------------

// these correspond to the years that the Q-curves are based on
var yearEnd = 2020;  
var yearStart = yearEnd - 3; // inclusive, so if -3 then 2017-2020, inclusive
var path = 'projects/gee-guest/assets/SEI/'; // path to where most assets live
var scale = 30;
var dateString = "20221220"
var imageVis100 = {"opacity":1,"min":0,"max":80,"palette":['9b9992','f1eb38','ff7412','d01515','521203']};
// dependencies ----------------------------------------------------------

// module (code and some data)
var m = require("users/mholdrege/SEI:src/SEIModule.js");

// read in data -----------------------------------------------------------

// rcmap (sage cover)
var lstRCMAPsage = ee.List([]);
for (var i=yearStart; i<=yearEnd; i++) {

  var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i);

  var lstRCMAPsage = lstRCMAPsage.add(rcmapSage);
}

var rcmapSage = ee.ImageCollection(lstRCMAPsage)
  .mean()
  .mask(m.mask);

Map.addLayer(rcmapSage, imageVis100, 'rcmap');

// RAP (annuals and perennials)

// This currently loads v2, there is now a v3 that came out that we may want to use. 
var rap = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2')
  .filterDate(yearStart + '-01-01',  yearEnd + '-12-31')
  .mean()
  .mask(m.mask);

Map.addLayer(rap.select('AFGC'), imageVis100, 'afg', false)
Map.addLayer(m.mask, {}, 'mask', false)


// smooth data ---------------------------------------------------------------
// smoothing to the same degree  (560 m kernel) as is done before Q values
// are calculated for each component of SEI

var kernel = ee.Kernel.gaussian(560,560 * 1,'meters');

var rcmapSage560m = rcmapSage.reduceNeighborhood(ee.Reducer.mean(), kernel)
  .divide(100.0)
  .rename('nlcdSage'); // convert from % cover to proportion

var bands = ['AFGC', "PFGC"]; // bands of interest
var rap560 = rap.select(bands)
  .reduceNeighborhood(ee.Reducer.mean(), kernel)
  .rename(bands);

// calculate percentiles of RAP -----------------------------------------------

var perc_seq = ee.List.sequence(0, 100, 1); // percentiles to calculate

// create reducer
var reducer_perc = ee.Reducer.percentile(perc_seq);

var calcPercentiles = function(image) {
  // apply reducer
  var reduced = ee.Image(image).reduceRegion({
    reducer: reducer_perc,
    geometry: m.region,
    scale: scale,
    crs: m.crs
  });
  
  // convert to more useable format
  var dict = ee.Dictionary(reduced);
  
  // turn key/value pairs into features
  var listOfFeatures = dict.keys().map(function(key) {
    var f = ee.Feature(null, 
      {var_perc: key,
      value: dict.get(key)
    });
    return f;
  });
  
  var out = ee.FeatureCollection(listOfFeatures);
  return out;
};


var rapPerc1 = calcPercentiles(rap560);

// percentiles of rcmap ----------------------------------------------------------

var rcmapPerc1 = calcPercentiles(rcmapPerc1);

// save output -------------------------------------------------------------------
var s = '_' + scale + 'm_' + dateString;

Export.table.toDrive({
  collection: rapPerc1,
  description: 'percentiles_rap' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: rcmapPerc1,
  description: 'percentiles_rcmap' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});
