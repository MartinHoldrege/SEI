// Calculating daymet monthly values

// This code was Martin Holdrege and inspired by code written by Rachel Renne

// calculating monthly temperature and precipitaiton for each year, and outputting those
// images (1 image per year) to an asset. These images are then read in by a subsequent script
// to calculate normals and correlation between monthly T and P. However, not doing all steps
// in 1 script because of memory issues

// dependencies
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js"); // contains the crs we're using elsewhere
var cor = require("users/MartinHoldrege/SEI:src/correlation.js"); // for pearsonCorrelation function

// First, load DayMet dataset and filter to only contain precipitation & temp:
var v = 4; // Daymet version
var daymet = ee.ImageCollection("NASA/ORNL/DAYMET_V" + v).select(['prcp','tmax','tmin']);

//Next, filter to include only those images need to calculate the 30-year norm (1991-2010):
var yearStart = 1991;
var yearStart = 2019; // for testing
var yearEnd = 2020;
var daymet30a = daymet.filterDate(yearStart + '-01-01',(yearEnd + 1) +'-01-01');	// end date is exclusive

// functions -----------------------------------------------------------------------------

// function to generate a month and year property for each image:
function yearMonthForEachImage(x){
  var image = ee.Image(x);
  var date = ee.Date(image.get('system:time_start'));
  var updatedIMAGE = image
    .set('month',date.get('month'))
    .set('year', date.get('year'));
  return updatedIMAGE;
}

// summarize given daily info for a single year
// and convert to an image collection with 12 images
function summarizeByMonth(ic, reducer, year) {
  var months = ee.List.sequence(1, 12);
  var monthlyList = months.map(function(x) {
    var month = ee.Number(x);
    var summarized = ic
      .filter(ee.Filter.eq('month', month))
      .reduce(reducer)
      .set('month', month)
      .set('year', year);
    return summarized;
  });
  return ee.ImageCollection.fromImages(monthlyList);
}

// return monthly values for each year (input ic nee)
function summarizeByMonthYear(ic, reducer, years) {
   var yearlyList = years.map(function(x) {
    var year = ee.Number(x);
    var icFiltered = ic
      .filter(ee.Filter.eq('year', year));
    return summarizeByMonth(icFiltered, reducer, year);
  });
  // following this advice: https://gis.stackexchange.com/questions/423392 to flatten
  var fc = ee.FeatureCollection(yearlyList).flatten(); // flatten so not list of collections
  return ee.ImageCollection(fc);
}

// end functions --------------------------------------------------------------------------

// Apply that function to all images in Daymett collection
var daymet30b = daymet30a.map(yearMonthForEachImage);

// summarize data to month/year --------------------------------------------------------------

var years = ee.List.sequence(yearStart, yearEnd);

// monthly values for each year
var tMonthly = summarizeByMonthYear(daymet30b.select(['tmin', 'tmax']), ee.Reducer.mean(), years)
  .map(function(image) {
    return ee.Image(image).regexpRename('_mean', "");
  });
  
var prcpMonthly = summarizeByMonthYear(daymet30b.select('prcp'), ee.Reducer.sum(), years)
    .map(function(image) {
    return ee.Image(image).rename("prcp");
  });
  
  // converting month property to string for later band naming
var combMonthly = prcpMonthly.combine(tMonthly)
  .map(function(x) {
    var monthString = ee.String(ee.Number(ee.Image(x).get('month')).format('%.0f'));
    return ee.Image(x).set('month', monthString);
  });

// writing files
// now one image per year, and one band per month per variable
for (i=yearStart;i<=yearEnd;i++) {
  var yr = ee.Number(i);
  var filtered = combMonthly.filter(ee.Filter.eq('year', yr));
  var image = SEI.ic2Image(filtered, 'month')
    .set('year', yr)
    .regexpRename('^[[:alnum:]]+_', '');
  var s = SEI.path + '/daymet/daymet_v'+ v + '_monthly-values_' + i;
  
  Export.image.toAsset({
    image: image,
    description: s,
    folder: 'gee',
    maxPixels: 1e13, 
    scale: 1000,
    region: SEI.region,
    crs: SEI.crs,
    fileFormat: 'GeoTIFF'
  });
}
  
