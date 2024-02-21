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
 
// which layers to export
var exportSei = false; // whether to export the continous SEI layers (future)
var exportSeiCur = false; // current SEI
var exportC9 = true
var resolution = 90;     // output (and input) resolution, 30 m eventually

var versionFull = 'vsw4-3-4';

// which stepwat output to read in?
var rootList = ['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
  'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'];                        
//var rootList = ['fire0_eind1_c4grass1_co20_'] // for testing                         
var rcpList =  ['RCP45', 'RCP45', 'RCP85', 'RCP85'];

var epochList = ['2030-2060', '2070-2100', '2030-2060', '2070-2100'];

// current SEI ---------------------------------------------------
var d = lyrMod.main({root: 'fire1_eind1_c4grass1_co20_2311_'});

var seiCur = ee.Image(d.get('cur'))
  .select(['Q5s_control', 'Q1.*', 'Q2.*', 'Q3.*'])
  .regexpRename('raw_control', '')
  .regexpRename('Q5s_control', 'SEI');

if (exportSeiCur) {
  s = 'SEI-Q_v11_' + SEI.curYearStart + '_' + SEI.curYearEnd  + '_' + resolution + 'm';
  Export.image.toCloudStorage({
    image: seiCur,
    description: s,
    fileNamePrefix: 'SEI/' + s,
    bucket: 'usgs-gee-drylandecohydrology',
    maxPixels: 1e13, 
    scale: resolution,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: false
    }
  });
}

// future SEI ----------------------------------------------------
// loop over simulation assumptions (roots) 
for (var j = 0; j<rootList.length; j++) {
  var root = rootList[j];
  // loop over RCPs/time-periods (for contionuous SEI)
  // var seiImage = ee.Image([]);
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
        return ee.Image(x).rename('SEI_');
    });
      
    var seiImage = SEI.ic2Image(seiIc, 'GCM')
      .toFloat(); // 32 bit Float
      
    var s = 'SEI_' + versionFull + '_' + root + rcp_yr + '_' + resolution + 'm'; 
    
    if (exportSei) {
    Export.image.toCloudStorage({
      image: seiImage,
      description: s,
      fileNamePrefix: 'SEI/' + s,
      bucket: 'usgs-gee-drylandecohydrology',
      maxPixels: 1e13, 
      scale: resolution,
      region: SEI.region,
      crs: SEI.crs,
      fileFormat: 'GeoTIFF',
      formatOptions: {
        cloudOptimized: false
    }
    });
    }

  } // end looping over RCPs and time-periods
  
}// end loop over root

var root = 'fire1_eind1_c4grass1_co20_2311_';
  for(var i = 0; i<rcpList.length; i++) {
    
    
    var rcp = rcpList[i];
    var epoch = epochList[i];
    var rcp_yr = rcp + '_' + epoch;
    
    var d = lyrMod.main({root: root, RCP: rcp, epoch: epoch});
    
    var c9 = SEI.ic2Image(ee.ImageCollection(d.get('c9Red')), 'GCM')
      .select(['c9_low', 'c9_median', 'c9_high'])
      // renaming because the 'low' c9 value actually corresponds with the 'high' SEI value
      .rename(['c9_high', 'c9_median', 'c9_low']);
    
    var s = 'c9_' + versionFull + '_' + root + rcp_yr + '_' + resolution + 'm'; 
    
    if (exportC9) {
    Export.image.toCloudStorage({
      image: c9,
      description: s,
      fileNamePrefix: 'SEI/' + s,
      bucket: 'usgs-gee-drylandecohydrology',
      maxPixels: 1e13, 
      scale: resolution,
      region: SEI.region,
      crs: SEI.crs,
      fileFormat: 'GeoTIFF',
      formatOptions: {
        cloudOptimized: false
      }
    });
    }
    
  }