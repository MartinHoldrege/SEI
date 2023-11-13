/*
Purpose: recreate the conifer threat layer shown in Fig. 10 in Doherty et al. 2022
for Adam's analysis

Author: Martin Holdrege

Script started: Nov. 9, 2023

*/

// dependencies -------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// params -------------------------------------

var resolution = 30;
var year = 2020;

// read in data -------------------------------

// Using version 2 b/ that's what Doherty al al. 2022 used. (v3 wasn't available then)
var tree1 = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2')
  .filterDate(year + '-01-01',  year + '-12-31').mean() 
  .select('TREE')
  .updateMask(SEI.mask);
  
// core/grow/other layer (same layer as submitted for the SCD data publication)
var c3 = ee.Image(SEI.path + 'v11/current/SEIv11_2017_2020_30_Current_20220717')
  .select('Q5sc3');
  
print(c3)

// determine cover classes -------------------

// Threat classes from Doherty et al 2022 Table 3
var treeClass = ee.Image(0)
  .where(tree1.gte(0).and(tree1.lte(2)), 1)// No to low threat
  .where(tree1.gt(2).and(tree1.lte(10)), 2) //  Moderate
  .where(tree1.gt(10).and(tree1.lte(20)), 3) // High
  .where(tree1.gt(20), 4) // very high
  .updateMask(SEI.mask);

Map.addLayer(tree1, {min:0, max: 10, palette: ['white', 'green']}, 'tree cover');
Map.addLayer(treeClass, {min:1, max: 4, palette: ['blue', 'yellow', 'gold', 'red']}, 'tree threat');

// cover class by habitat class -----------------

// first number is habitat classification: core (1), grow (2) or other(3)
// second number is conifer threat:  1 (no to low threat) to 4 (very high threat)
// e.g., 23 is a growth opportunity area (2) with High conifer threat (3)
var c3TreeClass1 = c3
  .multiply(10) // now values are 10, 20, 30
  .add(treeClass)
  .toByte();
  
Map.addLayer(c3TreeClass1, {min:11, max: 44, palette: ['black', 'white']}, 'c3 and tree threat');


// output data --------------------------------------------------------------------------------


Export.image.toDrive({
  image: c3TreeClass1,
  description: 'conifer-threat_SEIv11_2017_2020_30_Current_20231113',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolution,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});




