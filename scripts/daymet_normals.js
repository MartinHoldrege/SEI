// Calculating daymet monthly normals

// This code was Martin Holdrege and inspired by code written by Rachel Renne

// Daymet daily ppt and precip was summarized into monthly values in the daymet_monthly_values.js script
// (this was done seperately to limit memory issue)

// dependencies
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js"); // contains the crs we're using elsewhere
var cor = require("users/MartinHoldrege/SEI:src/correlation.js"); // for pearsonCorrelation function

var v = 4; // Daymet version

//Next, filter to include only those images need to calculate the 30-year norm (1991-2010):
var yearStart = 1991;
var yearStart = 2019; // for testing
var yearEnd = 2020;

// read in data ----------------------------------------------------------------------------

// 'dm' stands for daymet
var dm1 = ee.ImageCollection([]);
for (var i=yearStart;i<=yearEnd;i++) {
  var s = 'daymet_v'+ v + '_monthly_values_' + i;
  var image = ee.Image(SEI.path + 'daymet/' + s);
  var dm1 = dm1.merge(ee.ImageCollection(image));
}

// summarize data to month/year --------------------------------------------------------------

// calculate T-P correlation -----------------------------------------------------------------

// correlation between monthly temperature and precipitation, calculated for each year
// then the mean is calculated ( what we have called type 2 corrTP' elsewher)

var years = ee.List.sequence(yearStart, yearEnd);

// convert to 'long' format (i.e. one image per month)

var dmLong0 = dm1
  .toList(yearEnd - yearStart + 1)
  .map(function(x) {
    return SEI.image2Ic(ee.Image(x), 'month');
  });
 
// couldn't get .flatten() to work, so doing the same thing via iterate 
var dmLong1 = dmLong0.iterate(function(current, previous) {
  return ee.ImageCollection(previous).merge(ee.ImageCollection(current));
}, ee.ImageCollection([]));

// just need tmean and ppt for calculating correlation
var dmLong2 = ee.ImageCollection(dmLong1)
  .map(function(x) {
    var image = ee.Image(x);
    var out = image.select('tmin')
      .add(image.select('tmax'))
      .divide(ee.Image(2))
      .rename('tmean')
      .addBands(image.select('prcp'));
    return out.copyProperties(image); 
});

var corList = years
  .map(function(number) {
    var yr = ee.Number(number);
    var ic = dmLong2.filter(ee.Filter.eq('year', yr));
    var x = ic.select('tmean');
    var y = ic.select('prcp');
    return ee.Image(cor.pearsonCorrelation(x, y))
      .set('year', yr);
  });
var corByYear = ee.ImageCollection.fromImages(corList);
var corMean = corByYear.mean().rename('corrTP2'); 

// mean across years of monthly T and P ------------------------------------------------------
var combMonthlyMeans = dm1
  .mean() // means across years for given month
  .regexpRename('_mean', '');
  
var combOut = combMonthlyMeans
  .addBands(corMean)
  .toFloat();

// Create a geometry representing decadal study area:
/*var geometry = ee.Geometry.Polygon([[-133.2146, 28.90959],[-133.2146,55.06167],
                                    [-94.93751, 55.06167],[-94.93751,28.90959]]);*/

Export.image.toDrive({
  image: combOut,
  description: 'daymet_v'+ v + '_monthly_normals_corrTP_' + yearStart + '-' + yearEnd,
  folder: 'gee',
  maxPixels: 1e13, 
  scale: 1000,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});

