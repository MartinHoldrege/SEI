// Purpose: output layers for data release


// dependencies ---------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");

// User-defined variables -----------------------------------------------------

var resolution = 90;     // output (and input) resolution, 30 m eventually

var versionFull = 'vsw4-3-4';

// which stepwat output to read in?
var rootList = SEI.repeatelemList(['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
                          'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'],
                          [4, 4, 4, 4]);
var rootList = ['fire0_eind1_c4grass1_co20_'] // for testing                         
var rcpList =  SEI.repeatelem(['RCP45', 'RCP45', 'RCP85', 'RCP85'], 4);

var epochList = SEI.repeatelem(['2030-2060', '2070-2100', '2030-2060',  '2070-2100'], 4);

// loop -----------------------------------------------------------------------
// loop over simulation assumptions (roots) and RCPs/time-periods (for contionuous SEI)
for(var i = 0; i<rootList.length; i++) {
  
  var root = rootList[i];
  var rcp = rcpList[i];
  var epoch = epochList[i];
  var rcp_yr = rcp + '_' + epoch;
  
  // read in data --------------------------------------------
  
  var d = lyrMod.main({root: root, RCP: rcp, epoch: epoch});
  
  // extract future SEI layer
  
  var seiIc = ee.ImageCollection(d.get('futRed'))
    .select('Q5s') // image collection for low, median, high
    .map(function(x) {
      return ee.Image(x).rename('SEI');
    })
    
  var seiImage = SEI.ic2Image(sieIc, 'GCM')
  print(seiImage)
}



// fileFormat: 'GeoTIFF',
//   formatOptions: {
//     cloudOptimized: true
//   }