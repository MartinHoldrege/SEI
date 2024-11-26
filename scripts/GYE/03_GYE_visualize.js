/*
  Purpose: Examine the GYE SEI layers, and compare
  to the regular (v30 SEI).
  Note that the v30 SEI layers were made with a different
  mask, and 4 year evenly weighted averages of rap 
  cover were taken instead of unevenly weighted (like
  the regular v30 assets)

*/

// dependencies -------------------------------------------------------

var fig = require("users/mholdrege/SEI:src/fig_params.js");

// params -------------------------------------------------------------

var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/';
// read in data ------------------------------------------------------

// for comparison purposes
var v30 = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/SEI_v30_2018_2021_90_20230828')
var gye = ee.Image(path + 'GYE/v30/SEI_v30_2018_2021_30_GYE_ecoStateMask_20241127')
var region = ee.FeatureCollection(path + 'GYE/GRYN_GYA_Boundary_AOA_Area');

// print(gye.bandNames())

// functions -----------------------------------------------------

var addMap = function(band, vis) {
  Map.addLayer(gye.select(band), fig.visc3, band + ' gye', false)
  Map.addLayer(v30.select(band), fig.visc3, band + ' v30', false)
}

// prepare data --------------------------------------------------

var gye = gye
var v30 = v30.clip(region) // for easier comparison

// places where the gye layers shows core or grow, in a place where
// the regular layer is masked
var better = v30.select('Q5sc3')
  .unmask().eq(0)
  .and(gye.select('Q5sc3').eq(1)
      .or(gye.select('Q5sc3').eq(2))
      );
   
// where the gye layer shows a worse category   
var worse = gye.select('Q5sc3')
  .unmask().eq(0).or(gye.select('Q5sc3').eq(3)) // masked or other
  .and(v30.select('Q5sc3').eq(1)
      .or(v30.select('Q5sc3').eq(2))
      );
// maps ---------------------------------------------------------

Map.centerObject(gye);

// c3
addMap('Q5sc3', fig.visc3);
Map.addLayer(better.selfMask(), {palette: 'red'}, 'where better', false);
Map.addLayer(worse.selfMask(), {palette: 'blue'}, 'where worse', false);

