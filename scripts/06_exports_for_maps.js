/*
Purpose--export layers useful for making maps for the manuscript
These are exported at a lower resolution, b/ they're just for making
static maps

Author: Martin Holdrege

Data started: November 21, 2023
*/

// params ---------------------------------------------------

var resolutionOut = 500; // resolution of output maps
var resolutionOutC9 = 180; // resolution of output for c9 maps (needs higher resolution b/ pyramid artifacts)
var resolutionArea = 90; // resolution for area calculations
var root_fire1 = 'fire1_eind1_c4grass1_co20_2311_';
var root_fire0 = 'fire0_eind1_c4grass1_co20_';
var root_co21 = 'fire1_eind1_c4grass1_co21_2311_';
var root_grass0 = 'fire1_eind1_c4grass0_co20_2311_';

var rcpList = ['RCP45', 'RCP45', 'RCP85', 'RCP85'];
var epochList = ['2030-2060', '2030-2060', '2070-2100', '2070-2100']
// dependencies ---------------------------------------------

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function

var areaComb = ee.FeatureCollection([]);
for(var i = 0; i<rcpList.length; i++) {
    
  var rcp = rcpList[i];
  var epoch = epochList[i];
  
  
  // read in data --------------------------------------------
  // other than those specified, using the default args
  var d_fire1 = lyrMod.main({root: root_fire1, rcp: rcp, epoch: epoch}); 
  var d_fire0 = lyrMod.main({root: root_fire0, rcp: rcp, epoch: epoch}); 
  var d_co21 = lyrMod.main({root: root_co21, rcp: rcp, epoch: epoch}); 
  var d_grass0 = lyrMod.main({root: root_grass0, rcp: rcp, epoch: epoch});
  
  // c9 layer ------------------------------------------------
  
  var c9_fire1 = ee.Image(d_fire1.get('p')).select('p6_c9Med');
  
  var s0 = d_fire1.get('versionFull').getInfo() + '_9ClassTransition_'
    + resolutionOutC9 + '_' + d_fire1.get('root').getInfo()
    + d_fire1.get('RCP').getInfo()  + '_' + d_fire1.get('epoch').getInfo();
  
  Export.image.toDrive({
    image: c9_fire1,
    description: s0,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOutC9,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  
  // c9 fire difference layer -------------------------------------
  // to show where habitat classification is different
  
  var c9_fire0 = ee.Image(d_fire0.get('p')).select('p6_c9Med');
  var dQ5s_fire0  = ee.Image(d_fire0.get('diffRed2')).select('Q5s_median'); // median change in SEI
  var dQ5s_fire1  = ee.Image(d_fire1.get('diffRed2')).select('Q5s_median'); // median change in SEI
  
  // where are c9 transition different? (1 = same transition & same SEI
  // 2 = same transition, but fire better SEI
  // 3 = same transition, but fire worse SEI, 4= fire1 better transition, 5 = fire1 worse transition)
  var c9Diff = SEI.compareFutures(c9_fire1, c9_fire0, dQ5s_fire1, dQ5s_fire0);
      
  var s = d_fire1.get('versionFull').getInfo() + '_9ClassTransition_'
    + resolutionOut + '_' + d_fire1.get('root').getInfo()
    + d_fire1.get('RCP').getInfo()  + '_' + d_fire1.get('epoch').getInfo();
    
  var sDiff = s.replace('9ClassTransition', 'c9-diff')
    .replace('fire1', 'fire01');
  
  Export.image.toDrive({
    image: c9Diff,
    description: sDiff,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
    
  // c9 co2 difference layer -------------------------------------
  // to show where habitat classification is different
  
  var c9_co21 = ee.Image(d_co21.get('p')).select('p6_c9Med');
  var dQ5s_co21 = ee.Image(d_co21.get('diffRed2')).select('Q5s_median'); // median change in SEI
  
  // where are c9 transition different? 
  var c9DiffCo2 = SEI.compareFutures(c9_fire1, c9_co21, dQ5s_fire1, dQ5s_co21);
        
  var sDiffCo2 = s.replace('9ClassTransition', 'c9-diff')
    .replace('co20', 'co201');
  
  Export.image.toDrive({
    image: c9DiffCo2,
    description: sDiffCo2,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  // c9 c4grass1 difference layer -------------------------------------
  // to show where habitat classification is different when c4 grass expansion is not allowed
  
  var c9_grass0 = ee.Image(d_grass0.get('p')).select('p6_c9Med');
  var dQ5s_grass0 = ee.Image(d_grass0.get('diffRed2')).select('Q5s_median'); // median change in SEI
  
  // where are c9 transition different? 
  var c9DiffGrass = SEI.compareFutures(c9_fire1, c9_grass0, dQ5s_fire1, dQ5s_grass0);
        
  var sDiffGrass = s.replace('9ClassTransition', 'c9-diff')
    .replace('grass1', 'grass01');
  
  Export.image.toDrive({
    image: c9DiffGrass,
    description: sDiffGrass,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  // proportion change layers -------------------------------------
  // (proportion change from current to future conditions)
  
  var diffProp = ee.Image(d_fire1.get('diffPropRed'))
    .select('Q\\draw_median', 'Q5s_median');
    
  var sDiff = s.replace('9ClassTransition', 'diffProp');
  
  Export.image.toDrive({
    image: diffProp,
    description: sDiff,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  // qProp layer (for RGB maps) -----------------------------------
  
  var qPropMean = ee.Image(d_fire1.get('qPropMean'));
  
  var sQProp = s.replace('9ClassTransition', 'qPropMean');
  
  Export.image.toDrive({
    image: qPropMean,
    description: sQProp,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  // climate confidence layers -----------------------------------
  // for areas that are currently core the the number of GCMs that agree that will be core in the futre
  // for areas that are currently grow, the number of GCMS that agree that will be Core or Grow in the future
  
  // first digit is c3 classification, 2nd and 3rd digit is number of gcms that suggest things get better or stay the same (for grows and cores)
  var numGoodC3 = ee.Image(d_fire1.get('numGcmGood'));
    
  var sNumGood = s.replace('9ClassTransition', 'numGcmGood'); 
    
  Export.image.toDrive({
    image: numGoodC3,
    description: sNumGood,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: resolutionOut,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
  
  // calculating c9-diff area -----------------------------------
  // calculating the area in the 5 categories of the transition comparison lyrs;
  // in all cases the comparison is to the 'default' simulations
  // first argument is the 5 class different image, the section is the dictionary for the run
  var areaAndProperties = function(image, d) {
     var areas = fnsRr.areaByGroup(image, 'diffClass', SEI.region, resolutionArea)
      .map(function(x) {
        return ee.Feature(x)
         // adding additional proprties to the feature
            .set('run', ee.String(d.get('root')))
            .set('default_run', root_fire1)
            .set('RCP', ee.String(d.get('RCP')))
            .set('years', ee.String(d.get('epoch')));
      });
  
    return areas;
  };
  
  // area for difference classes between fire1 and fire0 runs
  var areaFire =  areaAndProperties(c9Diff, d_fire0);
  var areaCo2 =  areaAndProperties(c9DiffCo2, d_co21); // no vs yes co2 
  var areaGrass =  areaAndProperties(c9DiffGrass, d_grass0); // yes vs no c4 grass expansion
  
  var areaComb = areaComb // combining across loops
    .merge(areaFire)
    .merge(areaCo2)
    .merge(areaGrass);
  
  // Map.addLayer(c9Diff.eq(1), {palette: ['grey', 'black']}, 'no fire effect')


} // end of RCP, epoch loop


// outputting Fc with results from all iterations of the loop
var s = d_fire1.get('versionFull').getInfo() + '_20231206';

Export.table.toDrive({
  collection: areaComb,
  description: 'area-by-c9-diff_' + resolutionArea + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});
