/*
  Purpose: Examine the GYE SEI layers, and compare
  to the regular (v30 SEI).
  Note that the v30 SEI layers were made with a different
  mask, and 4 year evenly weighted averages of rap 
  cover were taken instead of unevenly weighted (like
  the regular v30 assets)

*/

// read in data ------------------------------------------------------

// for comparison purposes
var v30 = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/SEI_v30_2018_2021_90_20230828')
var gye = ee.Image('projects/usgs-gee-drylandecohydrology/assets/SEI/GYE/v30/SEI_v30_2018_2021_30_GYE_ecoStateMask_20241126')

print(v30.bandNames());
print(gye.bandNames())

// maps ---------------------------------------------------------




