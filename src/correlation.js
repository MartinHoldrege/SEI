// Module that provides a function for calculation pearson correlation
// between pixels into two image collections
// load like this:
// var cor = require("users/MartinHoldrege/SEI:src/correlation.js");

// helper functions

// Function to check if input is an ee.ImageCollection
function ensureImageCollection(input) {
  if (!(input instanceof ee.ImageCollection)) {
    throw new Error('Input must be an ee.ImageCollection');
  }
}

// input just has a single band
function ensureSingleBandImage(input) {
  var bandCount = input.bandNames().size();
  if (!bandCount.eq(1).getInfo()) {
    throw new Error('Image must have exactly one band');
  }
}

// calculates sum of squares, based on an image collection
// differences
var ssFromDiff = function(icDiff) {
  var ss = ee.ImageCollection(icDiff).map(function(x) {
    return ee.Image(x).multiply(ee.Image(x));
  })
  .sum();
  return ss;
};

// calculates pixelwise xi - xbar 
var diffFromMean = function(ic) {
  var ic2 = ee.ImageCollection(ic);
  var meanImage = ic2.mean();
  var diff = ic2.map(function(image) {
    return ee.Image(image).subtract(meanImage);
  }); 
  return diff;
};

// main function,
// calculates the pixelwise correlation between two image collections
var pearsonCorrelation = function(x, y) {
  ensureImageCollection(x);
  ensureImageCollection(y);
  ensureSingleBandImage(x.first());
  ensureSingleBandImage(y.first());
  
  var x = x.map(function(image) {
    return ee.Image(image).rename('x');
  });
  var y = y.map(function(image) {
    return ee.Image(image).rename('y');
  });
  
  // differences from mean
  var xDiff = diffFromMean(x);
  var yDiff = diffFromMean(y);
  
  // numerator of of formula
  var numerator = xDiff.combine(yDiff)
    .map(function(image) {
      var xy = ee.Image(image);
      return xy.select('x').multiply(xy.select('y'));
    })
    .sum();
  
  // sum of squares 
  var ssx = ssFromDiff(xDiff); // for x
  var ssy = ssFromDiff(yDiff); // for y
  
  var denominator = ssx.multiply(ssy).sqrt();
  
  return numerator.divide(denominator).rename('cor');
};

exports.pearsonCorrelation = pearsonCorrelation;

/*
// testing
var x = ee.ImageCollection.fromImages([ee.Image(1), ee.Image(2), ee.Image(3), ee.Image(4), ee.Image(5)])
  .map(function(x) {
    return ee.Image(x).toFloat();
  });
var y = ee.ImageCollection.fromImages([ee.Image(1), ee.Image(2), ee.Image(3), ee.Image(4), ee.Image(1)])
  .map(function(x) {
    return ee.Image(x).toFloat();
  });

var cor = pearsonCorrelation(x, y);
// use select to check that cell values are 0.2425356
Map.addLayer(cor, {min: -1, max: 1, palette: 'red,white,blue'}, 'test correlation');

*/
