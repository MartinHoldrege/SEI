var radiusCore = 2000;  // defines radius of overall smoothing to get "cores"
var version = '11';
var SEI = require("users/mholdrege/SEI:src/SEIModule.js"); // functions and other objects


// datasets, constants etc. defined in SEIModule
var path = SEI.path;
var biome = SEI.biome;
var region = SEI.region;
var rangeMaskx = SEI.mask; 

var seiPath = 'users/DavidTheobald8/WAFWA/v11/SEIv11_2017_2020_90_20211228'
var cur = ee.Image(seiPath);

// Extract Q values

var Q1 = cur.select('Q1raw'); // Sage
var Q2 = cur.select('Q2raw'); // Pfg
var Q3 = cur.select('Q3raw'); // Afg
var Q4 = cur.select('Q4raw'); // Hmod
var Q5 = cur.select('Q5raw'); // Tree


// Step 4.  multiplying each factor by the earlier one
var Q5y_original = Q1
  .multiply(Q2)
  .multiply(Q3)
  .multiply(Q4)
  .multiply(Q5)
  .rename('original');
  
var Q5y = Q5y_original;

var Q5y = Q5y
  .addBands(Q5y_original.divide(Q1).rename('noSage')) // dividing by given Q to remove that component from SEI
  .addBands(Q5y_original.divide(Q2).rename('noPfg'))
  .addBands(Q5y_original.divide(Q3).rename('noAfg'))
  .addBands(Q5y_original.divide(Q4).rename('noH'))
  .addBands(Q5y_original.divide(Q5).rename('noTree'))
  .clip(biome);

  /**
   * Step 5. Smooth quality values to reflect "management" scale
   */
   
var Q5s = Q5y // this is SEI2000
  .select('original')
  //.unmask(0)
  .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(radiusCore,radiusCore * 1,'meters'),null, false)
  .multiply(rangeMaskx);
print(Q5s)
var test = Q5y.select('original').subtract(cur.select('Q5s'))
Map.addLayer(test.abs().gte(0.01), {min:0, max: 1, palette: ['white', 'black']}, 'is difference', false)
Map.addLayer(test, {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'difference 5y')
Map.addLayer(Q5s.select('original_mean').subtract(cur.select('Q5s')), {min:-0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'difference 5s')
Map.addLayer(rangeMaskx, {}, 'mask', false)