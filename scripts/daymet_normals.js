// Calculating daymet monthly normals

// This is written by by Rachel Renne and modified by Martin Holdrege 

// Note: The Daymet calendar is based on a standard calendar year. All Daymet years have 1 - 365 days, 
//including leap years. For leap years, the Daymet database includes leap day. Values for December 31 
//are discarded from leap years to maintain a 365-day year.

// dependencies
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js"); // contains the crs we're using elsewhere
var cor = require("users/MartinHoldrege/SEI:src/correlation.js"); // for pearsonCorrelation function

// First, load DayMet dataset and filter to only contain precipitation & temp:
var v = 4; // Daymet version
var daymet = ee.ImageCollection("NASA/ORNL/DAYMET_V" + v).select(['prcp','tmax','tmin']);
print(daymet.first())
//Next, filter to include only those images need to calculate the 30-year norm (1991-2010):
var yearStart = 1991;
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
    return ee.Image(image).rename('prcp_sum', "prcp");
  });
  
var tmeanMonthly = tMonthly.map(function(x) {
  var image = ee.Image(x);
  return image.select('tmin')
    .add(image.select('tmax'))
    .divide(ee.Image(2))
    .rename('tmean');
});

// calculate T-P correlation -----------------------------------------------------------------

// correlation between monthly temperature and precipitation, calculated for each year
// then the mean is calculated ( what we have called type 2 corrTP' elsewher)
var corList = years
  .map(function(number) {
    var yr = ee.Number(number);
    var x = tmeanMonthly.filter(ee.Filter.eq('year', yr));
    var y = prcpMonthly.filter(ee.Filter.eq('year', yr));
    return ee.Image(cor.pearsonCorrelation(x, y))
      .set('year', yr);
  });
var corByYear = ee.ImageCollection.fromImages(corList);
var corMean = corByYear.mean().rename('corrTP2'); 

// mean across years of monthly T and P ------------------------------------------------------

var combMonthly = prcpMonthly.combine(tMonthly);
var c


// Create separate Image Collection for each variable:
var daymet30prcp = updatedIMAGES3.select("prcp");
var daymet30tmin = updatedIMAGES3.select("tmin");
var daymet30tmax = updatedIMAGES3.select("tmax");

// calculate correlation between monthly prcp and tmean for 
// each year, then average across years ( what we have called type 2 corrTP' elsewher)

var  daymet30tmean = updatedIMAGES3.map(function(x) {
  var image = ee.Image(x);
  return image.select("tmin")
    .add(image.select("tmax"))
    .divide(ee.Image(2))
    .rename('tmean')
    .copyProperties(image);
});

var years = ee.List.sequence(yearStart, yearEnd);



var corList = ee.List.sequence(yearStart, yearEnd)
  .map(function(number) {
    var yr = ee.Number(number);
    var dailytmean = daymet30tmean.filter(ee.Filter.eq('thisyear', yr));
    var dailyprcp = daymet30prcp.filter(ee.Filter.eq('thisyear', yr));
    
    monthly
    return ee.Image(cor.pearsonCorrelation(x, y));
  });

print('corList', corList.get(0));
var corMean = ee.ImageCollection(corList).mean();

//print('cormean', corMean)
// Create function that calculates monthly precip all months:
function monthlyprcp( thismonth ){
  var monthlyIMAGES = daymet30prcp.filterMetadata('month','equals',thismonth);
  var monthlysumIMAGE = monthlyIMAGES.sum();
  var monthlymeanIMAGE = monthlysumIMAGE.divide(30);
  var monthlymeanIMAGE1 = monthlymeanIMAGE.set('month',ee.String(thismonth));
  return monthlymeanIMAGE1;
}

// Create function that calculates monthly tmin for all months:
function monthlytmin( thismonth ){
  var monthlyIMAGES = daymet30tmin.filterMetadata('month','equals',thismonth);
  var totaldays = monthlyIMAGES.size();
  var monthlysumIMAGE = monthlyIMAGES.sum();
  var monthlymeanIMAGE = monthlysumIMAGE.divide(totaldays); //total number of days = 900
  var monthlymeanIMAGE1 = monthlymeanIMAGE.set('month',ee.String(thismonth));
  return monthlymeanIMAGE1;
}

// Create function that calculates monthly tmax for all months:
function monthlytmax( thismonth ){
  var monthlyIMAGES = daymet30tmax.filterMetadata('month','equals',thismonth);
  var monthlysumIMAGE = monthlyIMAGES.sum();
  var totaldays = monthlyIMAGES.size();
  var monthlymeanIMAGE = monthlysumIMAGE.divide(totaldays); //total number of days = 900
  var monthlymeanIMAGE1 = monthlymeanIMAGE.set('month',ee.String(thismonth));
  return monthlymeanIMAGE1;
}


// Create list of all months, 30 day months, and 31 day months.
var monthLIST = ee.List(["1.0","2.0","3.0","4.0","5.0","6.0","7.0","8.0","9.0","10.0","11.0","12.0"]);

// this function requires a 12 band image, and renames appropriately
var renameBands = function(image, prefix) {
  var newNames = monthLIST.map(function(x) {
    var monthString = ee.String(x).replace('.0$', '');
    return ee.String(prefix).cat(ee.String('_')).cat(monthString);
  });
  return image.rename(newNames);
};
// Map functions over appropriate Image Collections, and convert list to ImageCollection:
var meanMonthlyprcpLIST = monthLIST.map(monthlyprcp);
var meanMonthlyPrcp = ee.ImageCollection(meanMonthlyprcpLIST);
//print(meanMonthlyPrcp.limit(1));

var meanMonthlytminLIST = monthLIST.map(monthlytmin);
var meanMonthlytmin = ee.ImageCollection(meanMonthlytminLIST);
//print(meanMonthlytmin);

var meanMonthlytmaxLIST = monthLIST.map(monthlytmax);
var meanMonthlytmax = ee.ImageCollection(meanMonthlytmaxLIST);
//print(meanMonthlytmax);

// Create a geometry representing decadal study area:
var geometry = ee.Geometry.Polygon([[-133.2146, 28.90959],[-133.2146,55.06167],
                                    [-94.93751, 55.06167],[-94.93751,28.90959]]);
Map.addLayer(geometry,{color: "333333"}, "Study Area for Decadal Runs");

// Export the image, specifying scale and region.
// Have to manually set ImageColection and month to get all datalayers:

// nameBands
var tmaxImage = renameBands(meanMonthlytmax.toBands(), 'tmax');
var tminImage = renameBands(meanMonthlytmin.toBands(), 'tmin');
var prcpImage = renameBands(meanMonthlyPrcp.toBands(), 'prcp');

var combOut = tmaxImage.addBands(tminImage).addBands(prcpImage);
print(combOut.bandNames());

/*Export.image.toDrive({
  image: combOut,
  description: 'daymet_v'+ v + '_monthly_normals_' + yearStart + '-' + yearEnd,
  folder: 'gee',
  maxPixels: 1e13, 
  scale: 1000,
  region: geometry,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});*/

