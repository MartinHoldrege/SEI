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
*/ 


// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");

// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var region = SEI.region;
var mask = SEI.mask;
