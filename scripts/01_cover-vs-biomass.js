/**
 * Purpose:
 * fit relationship between cover and biomass from RAP 
 *  for annuals and perennials, respectively. 
 * (to help develop biomass based Q-curves)
 * 
 * 
 * Author: Martin Holdrege
 * 
 * Script Started: March 10, 2023
 * 
 * Overview of process:
 * load RAPcover
 * load RAP biomass code and convert necessary units
 * mask to sagebrush biome
 * 
 * smooth to within 560 mm neighborhood so that data is comparable
 * to what is used in SEI calculation
 * 
 * Next steps:
 * randomly sample 10^6? pixels and export as a table (with a seed set) 
 * then fit equation in R
*/ 

// user defined variables ------------------------------------------------
// date range
var startYear = 1986;
var endYear = 2020;



// dependencies -----------------------------------------------------------

// Load modules
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// for biomassFunction
var fire = require("users/mholdrege/cheatgrass_fire:src/ee_functions.js");

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var region = SEI.region;
var mask = SEI.mask;

// read in data ------------------------------------------------------------

var startDate = ee.Date.fromYMD(startYear, 1, 1);
var endDate = ee.Date.fromYMD(endYear, 12, 31);

// cover
var rap1 = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v3')
  .filterDate(startDate,  endDate)
  .map(function(image) {
    return ee.Image(image).toFloat().mask(mask);
  }); // to avoid incompatible data types on export

// biomass
var biomass = ee.ImageCollection("projects/rangeland-analysis-platform/npp-partitioned-v3")
  .select(['afgNPP', 'pfgNPP'])
  .filterDate(startDate,  endDate)
  .filterBounds(region)
  .map(fire.biomassFunction)
  .map(function(x) {
    return ee.Image(x).toFloat().mask(mask); // to avoid incompatible datatypes error
  });
  
// pixel level averages ----------------------------------------------------

var rapAvg = rap1
  .map(function(x) {
    return x.select("AFG", "PFG");
  })
  .mean();
var bioAvg = biomass  
  .map(function(x) {
    return x.select("afgAGB", "pfgAGB");
  })
  .mean();

// smoothing -------------------------------------------------

// smoothing pixels within a 560m radius
var rapAvg560 = SEI.mean560(rapAvg)
  .regexpRename('_mean', '');
var bioAvg560 = SEI.mean560(bioAvg)
  .regexpRename('_mean', '');
  
Map.addLayer(rapAvg560.select("AFG"), {min:0, max:30, palette: ['white', 'black']}, 'afg cover', false);
Map.addLayer(rapAvg560.select("PFG"), {min:0, max:70, palette: ['white', 'black']}, 'pfg cover', false);  
Map.addLayer(bioAvg560.select("afgAGB"), {min:0, max:50, palette: ['white', 'black']}, 'afg AGB', false);
Map.addLayer(bioAvg560.select("pfgAGB"), {min:0, max:150, palette: ['white', 'black']}, 'pfg AGB', false);  




