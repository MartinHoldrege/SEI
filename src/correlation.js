// helper functions

// Function to check if input is an ee.ImageCollection
function ensureImageCollection(input) {
  if (!(input instanceof ee.ImageCollection)) {
    throw new Error('Input must be an ee.ImageCollection');
  }
}

function ensureSingleBandImage(input) {
  var bandCount = input.bandNames().size();
  if (!bandCount.eq(1).getInfo()) {
    throw new Error('Image must have exactly one band');
  }
}

// calculates sum of squares, based on an image collection
// differences
var ssFromDiff = function(icDiff) {
  var ss = icDiff.map(function(x) {
    return ee.image(x).multiply(ee.Image(x));
  })
  .sum();
  return ss;
};

var pearsonCorrelation = function(x, y) {
  ensureImageCollection(x);
  ensureImageCollection(y);
  ensureSingleBandImage(x.first());
  ensureSingleBandImage(y.first());
  
  var x = x.map(function(image) {
    return ee.Image(image).rename('x');
  })
  var y = y.map(function(x) {
    return ee.Image(image).rename('y');
  })
  var yBar = y.mean();
  var xBar = x.mean();
  
  var xDiff = x.map(function(image) {
    return ee.Image(image).subtract(xBar);
  });
  
  var yDiff = y.map(function(image) {
    return ee.Image(image).subtract(yBar);
  });
  
  // numerator of of formula
  var numerator = xDiff.combine(yDiff)
    .map(function(image) {
      xy = ee.Image(image);
      return xy.select('x').multiply(xy.select('y'));
    })
    .sum();
  
  // sum of squares 
  ssx = ssFromDiff(xDiff); // for x
  ssy = ssFromDiff(xDiff); // for y
  
  
}