/********************************************************
 * Purpose:
 * 
 * Create data products (image assets) that show future sagebrush integrity, 
 * including uncertainty between GCMs. Most of these are the data products outlined in the data
 * management plant submitted in 2022 titled 'Assessing the future sagebrush core
 *  habitats: impacts of climate & climate uncertainty, wildfire and invasive species'
 * This code is meant to read in current and future SEI, and then create these images,
 * and should be agnostic of the method used to calculate the future SEI (i.e. so that the script
 * can be used with only minor changes, regardless of the upstream approach, 
 * which is still being developed)
 * 
 * 
 * Script Started: April 1, 2023
 * 
 * Author: Martin Holdrege
 * 
 * 
 * Datasets that are/will be created in this script:
 * 
 * 1: Median projected change in SEI relative to current conditions 
 * 2: Median future classification of CSA, GOA, and ORA
 * 3: Confidence in the projected direction of future change in SEI 
 * 4: Range in projected changes in SEI 
 * 5: Agreement among GCMs of future classification of CSA, GOA, and ORA
 * 6: 9 class raster--showing median change in designation of CSA, GOA and ORA 
 * (this one wasn't in the data management plant but would be useful in other
 * analyses I think)
 * 7: 9 class raster, as for 6, but for each GCM (also not part of the datamanagement plan,
 * but useful, I think)
 * 
 * 
 * *******************************************************
*/ 

// User-defined variables -----------------------------------------------------

var resolution = 1000;     // output (and input) resolution, 30 m eventually
var version = 'vsw1'; // first version calculating sei directly from stepwat output
var dateString = '_20230308'; // '_20230331'; // for appending to output file names (and reading in files)

// which stepwat output to read in?
// (this is in addition to 'Current' conditions)
var root = 'c4on_';
var RCP =  'RCP85';
var epoch = '2030-2060';