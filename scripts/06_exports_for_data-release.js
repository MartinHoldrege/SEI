/*
  Purpose: 
  output layers for data release
  Layers outputted include:
    1) Current SEI (2017-2020) and Q1-Q3 for reference
    2) Projected SEI for each of 4 modeling assumptions, 2 RCPs, 2 time-periods, and
    low, median, high estimates across GCMs. each image contains 3 bands (low, median high)
    3) c9--9 class change layers (for all time periods/RCPs), low, median and high (only default model assumptions)
    4) future Q1-Q3 (sagebrush, perennials and annuals), for all time periods and RCPs, median across GCMs
    (Q that corresponds to the median SEI). only for the 'default' modeling assumptions
    
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
var exportC9 = false;
var exportQ = false; // future Q1-Q3
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
  .select(['Q5s_control', 'Q1.*', 'Q2.*', 'Q3.*', 'Q4.*', 'Q5raw.*'])
  .regexpRename('raw_control', '')
  .regexpRename('Q5s_control', 'SEI');

if (exportSeiCur) {
  s = 'SEI-Q_v11_' + SEI.curYearStart + '_' + SEI.curYearEnd  + '_' + resolution + 'm';
  Export.image.toDrive({
    image: seiCur,
    description: s,
    folder: 'SEI',
    maxPixels: 1e13, 
    scale: resolution,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF',
    formatOptions: {
      cloudOptimized: false
    }
  });
/*  Export.image.toCloudStorage({
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
  });*/
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
    
        // future Qs ----------------------------------------------------------
    // Here calculating the median future Q1, Q2, and Q3. 
    
    // median SEI
    var seiMed = ee.ImageCollection(d.get('futRed'))
      .select('Q5s');
     
         // keep this

    // function that masks image if SEI is not equal to the median SEI
    var bandNames = ['Q1raw', 'Q2raw', 'Q3raw']
    var maskMedian = SEI.maskSeiRedFactory(seiMed.select('Q5s_median'), 'median', bandNames, true);
    var maskLow = SEI.maskSeiRedFactory(seiMed.select('Q5s_low'), 'low', bandNames, true);
    var maskHigh = SEI.maskSeiRedFactory(seiMed.select('Q5s_high'), 'high', bandNames, true);
    
    var futRedQ = ee.ImageCollection(d.get('futRed'))
      .select(['Q1raw', 'Q2raw', 'Q3raw'])
      .map(function(x) {
        return ee.Image(x).regexpRename('raw$', '');
     });



    var qComb = SEI.ic2Image(futRedQ, 'GCM')
      
    print(qComb)
    var s = 'Q_' + versionFull + '_' + root + rcp_yr + '_' + resolution + 'm';  
    if (exportQ) {
    
      Export.image.toDrive({
      image: qComb,
      description: s,
      folder: 'SEI',
      maxPixels: 1e13, 
      scale: resolution,
      region: SEI.region,
      crs: SEI.crs,
      fileFormat: 'GeoTIFF'
    });
  
    /*
    Export.image.toCloudStorage({
      image: qComb,
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
    */
    }

  } // end looping over RCPs and time-periods
  
}// end loop over root

var root = 'fire1_eind1_c4grass1_co20_2311_';
  for(var i = 0; i<rcpList.length; i++) {
    
    
    var rcp = rcpList[i];
    var epoch = epochList[i];
    var rcp_yr = rcp + '_' + epoch;
    
    var d = lyrMod.main({root: root, RCP: rcp, epoch: epoch});
    
    // c9 ------------------------------------------------------------------
    
    var c9 = SEI.ic2Image(ee.ImageCollection(d.get('c9Red')), 'GCM')
      .select(['c9_low', 'c9_median', 'c9_high']);
    
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
    

      
    // 
  }
  
//Map.addLayer(qComb.select('Q1_median'), {min:0, max: 1, palette: ['blue', 'red']}, 'Q')