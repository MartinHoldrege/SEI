/*
Purpose--export layers useful for making maps for the manuscript
These are exported at a lower resolution, b/ they're just for making
static maps

Author: Martin Holdrege

Data started: November 21, 2023
*/

// params ---------------------------------------------------

var resolutionOut = 90; // 500; //  resolution of output maps (use high res, if want to save/ and use data layer)
var resolutionOutC9 = 180; // resolution of output for c9 maps (needs higher resolution b/ pyramid artifacts)
var resolutionArea = 90; // resolution for area calculations
var root_fire1 = 'fire1_eind1_c4grass1_co20_2311_';
var root_fire0 = 'fire0_eind1_c4grass1_co20_';
var root_co21 = 'fire1_eind1_c4grass1_co21_2311_';
var root_grass0 = 'fire1_eind1_c4grass0_co20_2311_';

var rcpList = ['RCP45', 'RCP45', 'RCP85', 'RCP85']; // for normal runs
// var rcpList = ['RCP45']; // for testing
var epochList = ['2030-2060', '2070-2100','2030-2060', '2070-2100']; // for normal runs

var onlyHiRes = true; // only export layers that want in I res (i.e. for data layers, not for maps)
var exportToAsset = true;// export select layers to asset (resolution out should be 90)

// var epochList = ['2070-2100']
// dependencies ---------------------------------------------

// note--can't pass a variable to require (so must manually change the user as needed)
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js"); 
var lyrMod = require("users/MartinHoldrege/SEI:scripts/05_lyrs_for_apps.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function

// empty objects to add to while looping
var areaComb = ee.FeatureCollection([]);
var c9_fireComb = ee.Image([]);
var c9DiffFireComb = ee.Image([]);
var c9DiffCo2Comb = ee.Image([]);
var c9DiffGrassComb = ee.Image([]);
var diffPropComb = ee.Image([]);
var diffComb = ee.Image([]);
var qPropMeanComb = ee.Image([]);
var numGoodC3Comb = ee.Dictionary({
  fire1: ee.Image([]),
  fire0: ee.Image([]),
  co21: ee.Image([]),
  grass0: ee.Image([])
})
  ;

for(var i = 0; i<rcpList.length; i++) {
  
  var rcp = rcpList[i];
  var epoch = epochList[i];
  var rcp_yr = rcp + '_' + epoch;
  print(rcp_yr)
  // read in data --------------------------------------------
  // other than those specified, using the default args
  var d_fire1 = lyrMod.main({root: root_fire1, RCP: rcp, epoch: epoch}); 
  var d_fire0 = lyrMod.main({root: root_fire0, RCP: rcp, epoch: epoch}); 
  var d_co21 = lyrMod.main({root: root_co21, RCP: rcp, epoch: epoch}); 
  var d_grass0 = lyrMod.main({root: root_grass0, RCP: rcp, epoch: epoch});
  var d = ee.Dictionary({'fire1': d_fire1, 'fire0': d_fire0, 'co21': d_co21, 'grass0': d_grass0});
  var v = d_fire1.get('versionFull').getInfo() + '_';
  
  // c9 layer ------------------------------------------------
  
  var c9_fire1 = ee.Image(d_fire1.get('p'))
    .select('p6_c9Med')
    .rename(rcp_yr);
  
  var c9_fireComb = c9_fireComb
    .addBands(c9_fire1);
  
  // c9 fire difference layer -------------------------------------
  // to show where habitat classification is different
  
  var c9_fire0 = ee.Image(d_fire0.get('p')).select('p6_c9Med');
   
  var dQ5s_fire0  = SEI.ic2Image(ee.ImageCollection(d_fire0.get('diffRed2')), 'GCM')
    .select('Q5s_median'); // median change in SEI
   
  var dQ5s_fire1  = SEI.ic2Image(ee.ImageCollection(d_fire1.get('diffRed2')), 'GCM')
    .select('Q5s_median'); // median change in SEI
  
  // where are c9 transition different? (1 = same transition & same SEI
  // 2 = same transition, but fire better SEI
  // 3 = same transition, but fire worse SEI, 4= fire1 better transition, 5 = fire1 worse transition)
  var c9Diff = SEI.compareFutures(c9_fire1, c9_fire0, dQ5s_fire1, dQ5s_fire0)
    .rename(rcp_yr);
  
  var c9DiffFireComb = c9DiffFireComb
    .addBands(c9Diff);
  
  // c9 co2 difference layer -------------------------------------
  // to show where habitat classification is different
  
  var c9_co21 = ee.Image(d_co21.get('p')).select('p6_c9Med');
  
  var dQ5s_co21 = SEI.ic2Image(ee.ImageCollection(d_co21.get('diffRed2')), 'GCM')
    .select('Q5s_median');
  
  // where are c9 transition different? 
  var c9DiffCo2 = SEI.compareFutures(c9_fire1, c9_co21, dQ5s_fire1, dQ5s_co21)
    .rename(rcp_yr);
    
  var c9DiffCo2Comb = c9DiffCo2Comb
    .addBands(c9DiffCo2);
    
  // c9 c4grass1 difference layer -------------------------------------
  // to show where habitat classification is different when c4 grass expansion is not allowed
  
  var c9_grass0 = ee.Image(d_grass0.get('p')).select('p6_c9Med');
  var dQ5s_grass0 = SEI.ic2Image(ee.ImageCollection(d_grass0.get('diffRed2')), 'GCM')
    .select('Q5s_median');
  
  // where are c9 transition different? 
  var c9DiffGrass = SEI.compareFutures(c9_fire1, c9_grass0, dQ5s_fire1, dQ5s_grass0)
    .rename(rcp_yr);
        
  var c9DiffGrassComb = c9DiffGrassComb
    .addBands(c9DiffGrass);
  // proportion change layers -------------------------------------
  // (proportion change from current to future conditions)
  
  var diffProp = SEI.ic2Image(ee.ImageCollection(d_fire1.get('diffPropRed2')), 'GCM')
    .select('Q\\draw_median', 'Q5s_median')
    .regexpRename('$', '_' + rcp_yr)
  
  var diffPropComb = diffPropComb
    .addBands(diffProp);
    
  // absolute change layers -------------------------------------
  // (absolute change from current to future conditions)
  
  var diff = SEI.ic2Image(ee.ImageCollection(d_fire1.get('diffRed2')), 'GCM')
    .select('Q\\draw_median', 'Q5s_median')
    .regexpRename('$', '_' + rcp_yr)
  
  var diffComb = diffComb
    .addBands(diff);
  
  // qProp layer (for RGB maps) -----------------------------------
  
  // this in now based on median SEI (and associated changes in Q etc. )
  // print(d_fire1.get('qPropMed'))
  var qPropMeanComb = ee.Image(d_fire1.get('qPropMed2'))
    .regexpRename('$', '_' + rcp_yr)
    .addBands(qPropMeanComb);
 
  // climate confidence layers -----------------------------------
  // for areas that are currently core the the number of GCMs that agree that will be core in the futre
  // for areas that are currently grow, the number of GCMS that agree that will be Core or Grow in the future
  
  // first digit is c3 classification, 2nd and 3rd digit is number of gcms that suggest things get better or stay the same (for grows and cores)
  
  // dictionary where each element is a an image for a given run
  var numGoodC3Comb = numGoodC3Comb.map(function(key, value) {
      var out = ee.Image(ee.Dictionary(d.get(key)).get('numGcmGood'))
        .regexpRename('$', '_' + rcp_yr)
        .addBands(value);
      return out;
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
  var areaFire =  areaAndProperties(c9Diff.rename('diffClass'), d_fire0);
  var areaCo2 =  areaAndProperties(c9DiffCo2.rename('diffClass'), d_co21); // no vs yes co2 
  var areaGrass =  areaAndProperties(c9DiffGrass.rename('diffClass'), d_grass0); // yes vs no c4 grass expansion
  
  var areaComb = areaComb // combining across loops
    .merge(areaFire)
    .merge(areaCo2)
    .merge(areaGrass);
  
  // Map.addLayer(c9Diff.eq(1), {palette: ['grey', 'black']}, 'no fire effect')


} // end of RCP, epoch loop

// images with bands for each rcp/epoch ------------------------
// c9 

var outString = function(description, root) {
  var rootShort = root.replace(/_$/, "");
  return v + description + '_' + resolutionOut + '_' +  rootShort;
};

if(!exportToAsset) {
if(!onlyHiRes) {
Export.image.toDrive({
  image: c9_fireComb,
  description: v + '9ClassTransitionMed_' + resolutionOutC9 + '_' + root_fire1.replace(/_$/, ""),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOutC9,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});
}
// c9 diff fire
Export.image.toDrive({
  image: c9DiffFireComb,
  description: outString('c9-diff', root_fire1.replace('fire1', 'fire01')),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

// c9 diff co2
Export.image.toDrive({
  image: c9DiffCo2Comb,
  description: outString('c9-diff', root_co21.replace('co21', 'co201')),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

// c9 diff grass
Export.image.toDrive({
  image: c9DiffGrassComb,
  description: outString('c9-diff', root_grass0.replace('grass0', 'grass01')),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

// proportional changes in Q & SEI
Export.image.toDrive({
  image: diffPropComb,
  description: outString('diffProp2', root_fire1),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

if(!onlyHiRes) {
// absolute changes in Q & SEI
Export.image.toDrive({
  image: diffComb,
  description: outString('diff2', root_fire1),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});
}

// q prop (for RGB maps)
Export.image.toDrive({
  image: qPropMeanComb,
  description: outString('qPropMed2', root_fire1),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: numGoodC3Comb.get('fire1'),
  description: outString('numGcmGood', root_fire1),
  folder: 'gee',
  maxPixels: 1e13, 
  scale: resolutionOut,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

// area -------------------------------------------------
// outputting Fc with results from all iterations of the loop
var s = d_fire1.get('versionFull').getInfo() + '_20240419';

if(!onlyHiRes) {
Export.table.toDrive({
  collection: areaComb,
  description: 'area-by-c9-diff_' + resolutionArea + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});
}
}
// export num GCM good to asset -----------------------------------

// export 1 num gcm good asset per run type (these
// are for visualizations, because they're slow to load otherwise

if(exportToAsset) {
  
  // first digit is current class (1 = core, 2 grow, 3 other), digits 2 and 3 are
  // the number of GCMs that agree
  // 113 means 13 GCMS agree will stay core (class 1)
  // note some 215s existed in some earlier layers (i.e. grow, 15 GCMs agree on stability/improvement
  // which isn't possible, this has to do with how the pyramid is being
  // defined in GEE and disappears when you 'zoom'
  var gcmAgreeFrom = [115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 
    102, 101, 100, 215, 214, 213, 212, 211, 210, 209, 208, 207, 206, 205, 204, 203, 
    202, 201, 200, 300];
  
  var gcmAgreeTo = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6, 
    6, 6, 6, 7, 7, 7, 7, 7, 8, 8, 9];
    
  var majorVersion = 'vsw4-3';
  var keys = numGoodC3Comb.keys().getInfo();
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var root = ee.Dictionary(d.get(key)).get('root').getInfo();
    // mode pyramid policy
    var fileName = outString('numGcmGood', root) + '_mode';
    
    var image = SEI.remapAllBands(ee.Image(numGoodC3Comb.get(key)),
      gcmAgreeFrom, gcmAgreeTo);
      
    Export.image.toAsset({ 
      image: image, //single image with multiple bands
      pyramidingPolicy: {'.default': 'mode'},
      assetId: SEI.path + majorVersion + '/products/' + fileName,
      description: fileName,
      maxPixels: 1e13, 
      scale: resolutionOut,
      region: SEI.region,
      crs: SEI.crs
    });
  }
}


