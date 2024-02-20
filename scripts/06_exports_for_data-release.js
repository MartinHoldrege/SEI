/*
  Purpose: 
  output layers for data release
  Layers outputted include:
    1) Projected SEI for each of 4 modeling assumptions, 2 RCPs, 2 time-periods, and
    low, median, high estimates across GCMs. All bands belonging to one modelling assumpition
    are put together in single (12 layer) tiff. for 4 tiffs in total
    2) Current SEI (2017-2020) for reference
    
 Script Started: Feb. 16, 2024
 
 Author: Martin Holdrege
 

*/

// dependencies ---------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");

// User-defined variables -----------------------------------------------------

var resolution = 90;     // output (and input) resolution, 30 m eventually

var versionFull = 'vsw4-3-4';

// which stepwat output to read in?
var rootList = ['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
  'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'];                        
//var rootList = ['fire0_eind1_c4grass1_co20_'] // for testing                         
var rcpList =  ['RCP45', 'RCP45', 'RCP85', 'RCP85'];

var epochList = ['2030-2060', '2070-2100', '2030-2060', '2070-2100'];

// future SEI ----------------------------------------------------
// loop over simulation assumptions (roots) 
for (var j = 0; j<rootList.length; j++) {
  var root = rootList[j];
  // loop over RCPs/time-periods (for contionuous SEI)
  var seiImage = ee.Image([]);
  for(var i = 0; i<rcpList.length; i++) {
    
    
    var rcp = rcpList[i];
    var epoch = epochList[i];
    var rcp_yr = rcp + '_' + epoch;
    
    // read in data --------------------------------------------
    
    var d = lyrMod.main({root: root, RCP: rcp, epoch: epoch});
    
    // extract future SEI layer
    
    var seiIc = ee.ImageCollection(d.get('futRed'))
      .select('Q5s') // image collection for low, median, high
      .map(function(x) {
        return ee.Image(x).rename('SEI_' + rcp_yr);
    });
      
    var tmp = SEI
      .ic2Image(seiIc, 'GCM')
      .toFloat(); // 32 bit Float
    var seiImage = seiImage.addBands(tmp);

  } // end looping over RCPs and time-periods
  
    var s = 'SEI_' + versionFull + '_' + root + 'by-scenario_' + resolution + 'm'; 
/*    Export.image.toDrive({
      image: seiImage,
      description: s,
      folder: 'gee',
      maxPixels: 1e13, 
      scale: resolution,
      region: SEI.region,
      crs: SEI.crs,
      fileFormat: 'GeoTIFF',
      formatOptions: {
        cloudOptimized: true
      }*/
      
    Export.image.toCloudStorage({
      image: seiImage,
      description: s,
      fileNamePrefix: 'SEI/',
      bucket: 'usgs-gee-drylandecohydrology',
      maxPixels: 1e13, 
      scale: resolution,
      region: SEI.region,
      crs: SEI.crs,
      fileFormat: 'GeoTIFF',
      formatOptions: {
        cloudOptimized: true
    }

    });
}// end loop over root
