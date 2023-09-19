var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var biome = SEI.biome;
var cur = SEI.cur;
print(cur.bandNames())

var Q2y = cur.select('Q1raw')
  .multiply(cur.select('Q2raw')).clip(biome);
  
var Q3y = Q2y
  .multiply(cur.select('Q3raw')).clip(biome);
  
var Q4y = Q3y
  .multiply(cur.select('Q4raw')).clip(biome)

var Q5y = Q4y
  .multiply(cur.select('Q5raw')).clip(biome);
  
var diffVis = {min: 0, max: 1, palette: ['white', 'black']}
Map.addLayer(cur.select('Q5').subtract(Q5y).abs().gt(0.1), diffVis, 'Q5y is different', false)
Map.addLayer(cur.select('Q5').subtract(Q5y), {min: -0.5, max: 0.5, palette: ['red', 'white', 'blue']}, 'Q5y difference', false)

var Q5s = Q5y // this is SEI2000
      .unmask(0)
      .reduceNeighborhood(ee.Reducer.mean(),ee.Kernel.gaussian(2000,2000,'meters'),null, false)
      .multiply(SEI.mask);



var g = 0.1
Map.addLayer(cur.select('Q1raw'), {min: 0, max: 1}, 'Q1', false)
Map.addLayer(cur.select('Q1raw').subtract(cur.select('Q1raw')).abs().gt(g), diffVis, 'Q1 is different', false)
Map.addLayer(cur.select('Q2').subtract(Q2y).abs().gt(g), diffVis, 'Q2y is different', false)
Map.addLayer(cur.select('Q3').subtract(Q3y).abs().gt(g), diffVis, 'Q3y is different', false)
Map.addLayer(cur.select('Q4').subtract(Q4y).abs().gt(g), diffVis, 'Q4y is different', false)
Map.addLayer(cur.select('Q5s').subtract(Q5s).abs().gt(g), diffVis, 'Q5s is different', false)
