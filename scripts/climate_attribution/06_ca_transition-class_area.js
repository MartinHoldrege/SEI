/*
Purpose: Calculate the area where each Q component (sage, pfg, afg) are 
the dominant reason for change. Do this seperately for each of the 9 transition
classes, and the 3 ecoregions

Author: Martin Holdrege

Started: Nov 20, 2023
*/

// params ---------------------------------------------------------------

var root = 'fire1_eind1_c4grass1_co20_2311_';

// dependencies ---------------------------------------------------------

// Load module with functions 
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// this is where the data wrangling occurs
// contains one main function
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");
var d = lyrMod.main({
  root: root
}); // returns a dictionary

// prepare spatial index -----------------------------------------------


var eco = ee.Image().paint(SEI.WAFWAecoregions, 'ecoregionNum')
  .updateMask(SEI.mask);
  
var index = eco
  .multiply(10)
  .add(ee.Image(d.get('p')).select('p6_c9Med'))
  .multiply(10)
  .add()





