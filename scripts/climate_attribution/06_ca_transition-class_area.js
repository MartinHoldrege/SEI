/*
Purpose: Calculate the area where each Q component (sage, pfg, afg) are 
the dominant reason for change. Do this seperately for each of the 9 transition
classes, and the 3 ecoregions. seperate areas etc. calculated for each GCM.
also calculate this pixelwise for low, median, and high summarized values

Additionally, here we also calculate the amount of area falling into each
numGcmGood categoreis (for core and grow the number of GCMs that project things stay the same 
get better. This is done here (although it's not climate attribution) b/ to piggy back off
the other code developed here)

Author: Martin Holdrege

Started: Nov 20, 2023
*/


// dependencies ---------------------------------------------------------

// Load module with functions 
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fnsRr = require("users/mholdrege/newRR_metrics:src/functions.js"); // has areaByGroup function
// this is where the data wrangling occurs
// contains one main function
var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");

// params ---------------------------------------------------------------

// repeat each element of the list the desired number of times
var roots = SEI.repeatelemList(['fire0_eind1_c4grass1_co20_', 'fire1_eind1_c4grass1_co20_2311_', 
                          'fire1_eind1_c4grass0_co20_2311_','fire1_eind1_c4grass1_co21_2311_'],
                          [4, 4, 4, 4]);
var roots = ['fire1_eind1_c4grass1_co20_2311_']; // for testing
var RCPList =  SEI.repeatelem(['RCP45', 'RCP45', 'RCP85', 'RCP85'], 4);

var epochList = SEI.repeatelem(['2030-2060', '2070-2100', '2030-2060',  '2070-2100'], 4);

var resolution = 90;

// functions ---------------------------------------------------------

// this function factory is for two banded images (x) that contain a driver and q5s bands
// if the Q5s band is (approximately) equal to the redImage band (reduced image)
// then that pixel is not masked, otherwise it is, 
// this is then applied to an IC, and median taken, so that you get the
// driver that corresponds to e.g. the GCM with the low, median, or high SEI for the given pixel
var maskDriverFactory = function(redImage, reducerName) {
  var f = function(x) {
    var image = ee.Image(x);
    var mask = image.select('Q5s')
      .subtract(redImage.select('Q5s_' + reducerName))
      .abs()
      // if the SEI is very closed to the estimated reduced value, 
      // then assume that is the correct GCM
      .lt(0.0001) 
      .rename(reducerName);
    return image.select('driver').updateMask(mask);
  };
  return f;
};

// dictionary of data objections --------------------------------------

var combFc = ee.FeatureCollection([]); // empty fc that add to each loop iteration
var combFcGood = ee.FeatureCollection([]); // empty fc for the numGcm good area calculations
for (var i = 0; i < roots.length; i++) {
  var root = roots[i];
  var RCP = RCPList[i];
  var epoch = epochList[i];
  var d = lyrMod.main({
    root: root,
    RCP: RCP,
    epoch: epoch,
    resolution: resolution
  }); // returns a dictionary
  print(i);
  
  // which Q dominant driver of change ---------------------------------
  
  // image collection of 3 banded images where bands are the proportion change 
  // of Q1-Q3, and each image is for a different GCM
  var qIc = ee.ImageCollection(d.get('qPropIc'));
  // print(qIc)
  // one image per GCM, each image provides the dominant driver of change (1, 2 or 3), or 0 which is non are dominant
  var driver0 = qIc.map(function(x) {
    var q = ee.Image(x);
    var out = ee.Image(0)
      .where(q.select('Q1raw')
        .gt(q.select('Q2raw'))
        .and(q.select('Q1raw').gt(q.select('Q3raw'))),
        1) // sagebrush dominant driver of change
      .where(q.select('Q2raw')
        .gt(q.select('Q1raw'))
        .and(q.select('Q2raw').gt(q.select('Q3raw'))),
        2) // perennials
      .where(q.select('Q3raw')
        .gt(q.select('Q1raw'))
        .and(q.select('Q3raw').gt(q.select('Q2raw'))),
        3)// annuals
      .toByte()
      .rename('driver')
      .copyProperties(q);
    return out;
  });
  
  // pixelwise determination of the driver for the GCMs with the 2nd lowest, median, and 2nd highest SEI
  var driver1  = ee.ImageCollection(d.get('diffIc'))
    .select('Q5s')
    .combine(driver0);
  
  var diffRed = ee.Image(d.get('diffRed2'))
  print(diffRed)
  

  // reduce the driver across GCMs, pixelwise
  // relies on objects in the environment of the loop
  var driverReducer = function(reducerName) {
    var f = maskDriverFactory(diffRed, reducerName);
    return driver1.map(f)
      .reduce(ee.Reducer.median())
      .rename('driver')
      .set('GCM', reducerName);
  }
  
  var driverLow = driverReducer('low')
    
  var driverMedian = driverReducer('median')
    
  var driverHigh = driverReducer('high')

  Map.addLayer(driverLow, {min: 0, max: 4, palette:['grey', 'red', 'green', 'blue', 'grey']}, 'low driver')
  var driverRed = ee.ImageCollection.fromImages([driverLow, driverMedian, driverHigh])

  var driver2 = driver1.merge(driverRed);
  print(driver2)
  // prepare spatial index -----------------------------------------------
  
  var eco = ee.Image().paint(SEI.WAFWAecoregions, 'ecoregionNum')
    .updateMask(SEI.mask);
    
  var c9Ica = ee.ImageCollection(d.get('c9Ic'))
  var bandsRed = ee.List(['low', 'median', 'high'])
  var c9Reda = ee.Image(d.get('c9Red'))
    .select(bandsRed);
    
  // creating image collection where the reduced values (low, median, and high) estimates
  // are called 'GCMs' so that this IC can be combined witht the actual GCM level estimates,
  // and summaries will be made for all. 
  // these low, median, high values are pixel wise
  var imageList = c9Reda.bandNames().map(function(band) {
    return c9Reda.select([band])
      .rename('c9')
      .set('GCM', ee.String(band));
  })
  
  var c9RedIc = ee.ImageCollection.fromImages(imageList);
  var c9Icb = c9Ica.merge(c9RedIc);

  // first digit ecoregion, 2nd 9 class transition (last digit is 0, and is 'empty')
  var ecoC9 = c9Icb.map(function(x) {
    var c9 = ee.Image(x);
    var out = eco
      .multiply(10)
      .add(c9)
      .multiply(10)
      .rename('ecoC9')
      .copyProperties(c9);
    return out;
  });
  
  //print(ee.Image(d.get('diffRed2')))
  var diffRedb = bandsRed.map(function(band) {
    return ee.Image(d.get('diffRed2'))
      .select(ee.String('Q5s_').cat(ee.String(band)))
      .rename('Q5s')
      .set('GCM', ee.String(band));
  })
  
  // direction of change of SEI--1 = decrease, 2 = increase (or no change)

  var diffIcb = ee.ImageCollection(d.get('diffIc'))
    .select('Q5s')
    .merge(diffRedb);

  var dirQ5s = diffIcb
    .map(function(x) {
      var img = ee.Image(x);
      var out = ee.Image(0)
        .where(img.lt(0), 1)
        .where(img.gte(0), 2);
      return out
        .rename('dirQ5s')
        .copyProperties(img)
    });
   
  // making the 3rd digit  which PFT most dominant driver of change
  // and 4th digit (which direction SEI changed--this is relevant for 'stable' classes--still want to know
  // which direction the change was)
  var index = ecoC9.combine(driver2).combine(dirQ5s).map(function(x) {
    var image = ee.Image(x);
    var out = image.select('ecoC9')
      .add(image.select('driver'))
      .multiply(10)
      .add(image.select('dirQ5s'))
      .updateMask(SEI.mask)
      .rename('index')
      .toInt()
      .copyProperties(ee.Image(x));
    return out;
  });
  
  // Map.addLayer(index.filter(), {palette: 'blue'}, 'index');
  // Map.addLayer(SEI.mask, {palette: 'grey'}, 'mask')
  // calculate area for unique values of the spatial index ----------------
  
  // returns feature collection of feature collections
  // outer part is 1 fc for each GCM
  // inner part is one feature per unique index value
  var areaFc1 = index.map(function(x) {
    var image = ee.Image(x);
    // returning feature for each unique value of index, giving the area
    var areas1 = fnsRr.areaByGroup(image, 'index', SEI.region, resolution)
    // adding additional proprties to the feature
      .map(function(x) {
        var out = ee.Feature(x)
          .set('run', ee.String(root))
          .set('RCP', ee.String(d.get('RCP')))
          .set('years', ee.String(d.get('epoch')))
          .set('GCM', ee.String(image.get('GCM')));
        return out;
      });
    return areas1;
  });
  

  var combFc = combFc.merge(areaFc1.flatten());
  
  // calculating area for the numGcmGood categories
  
    // calculate area for unique values of the spatial index ----------------
  
  var numGcmGood = ee.Image(d.get('numGcmGood'));
  var areaFcGood = fnsRr.areaByGroup(numGcmGood, 'numGcmGood', SEI.region, resolution)
    // adding additional proprties to the feature
      .map(function(x) {
        var out = ee.Feature(x)
          .set('run', ee.String(root))
          .set('RCP', ee.String(d.get('RCP')))
          .set('years', ee.String(d.get('epoch')));
        return out;
      });
      
  var combFcGood = combFcGood.merge(areaFcGood);

} // end loop

// save output ------------------------------------------------------------------------------------

var s = d.get('versionFull').getInfo() + '_20231218';

Export.table.toDrive({
  collection: combFc,
  description: 'area-by-ecoregionC9Driver_' + resolution + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});


Export.table.toDrive({
  collection: combFcGood,
  description: 'area-by-numGcmGood_' + resolution + 'm_' + s,
  folder: 'SEI',
  fileFormat: 'CSV'
});

