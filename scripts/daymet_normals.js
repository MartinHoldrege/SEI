// Calculating daymet monthly normals

// This is written by by Rachel Renne and modified by Martin Holdrege 

// Note: The Daymet calendar is based on a standard calendar year. All Daymet years have 1 - 365 days, 
//including leap years. For leap years, the Daymet database includes leap day. Values for December 31 
//are discarded from leap years to maintain a 365-day year.

// dependencies
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js"); // contains the crs we're using elsewhere

// First, load DayMet dataset and filter to only contain precipitation & temp:
var v = 4; // Daymet version
var daymet = ee.ImageCollection("NASA/ORNL/DAYMET_V" + v).select(['prcp','tmax','tmin']);
print(daymet.first())

//Next, filter to include only those images need to calculate the 30-year norm (1991-2010):
var yearStart = 1991;
var yearEnd = 2020;
var daymet30 = daymet.filterDate(yearStart + '-01-01',(yearEnd + 1) +'-01-01');	// end date is exclusive

// Create a function to generate a Year property for each image
// Note: .parse converts string to a number.
function NoteYearForEachImage( typicalIMAGE ){
  var bigSTRING = typicalIMAGE.get('system:index');
  var bigNUMBER = ee.Number.parse(bigSTRING);
  var yearNUMBER = bigNUMBER.divide(10000).int();
  var updatedIMAGE = typicalIMAGE.set('thisyear',ee.String(yearNUMBER));
  return updatedIMAGE;
}

// Apply that function to all images in the GridMet collection
var updatedIMAGES1 = daymet30.map( NoteYearForEachImage );

// Create a function to generate a DOY property for each image
// Note: .parse converts string to a number.
function NoteDOYForEachImage( typicalIMAGE ){
  var bigSTRING = typicalIMAGE.get('system:index');
  var bigNUMBER = ee.Number.parse(bigSTRING);
  var year = typicalIMAGE.get('thisyear');
  var yearNUMBER = ee.Number.parse(year);
  var bigyearNUMBER = yearNUMBER.multiply(10000);
  var modayNUMBER = bigNUMBER.subtract(bigyearNUMBER);
  var updatedIMAGE = typicalIMAGE.set('doy',ee.String(modayNUMBER));
  return updatedIMAGE;
}

// Apply that function to all images in the GridMet collection
var updatedIMAGES2 = updatedIMAGES1.map( NoteDOYForEachImage );
//print(updatedIMAGES2.limit(1));

// Create a function to generate a MONTH property for each image:
function NoteMonthForEachImage(typicalIMAGE){
  var bigSTRING = typicalIMAGE.get('system:index');
  var bigNUMBER = ee.Number.parse(bigSTRING);
  var doy = typicalIMAGE.get('doy');
  var doynumber = ee.Number.parse(doy);
  var month = doynumber.divide(100);
  var month1 = month.round();
  var updatedIMAGE = typicalIMAGE.set('month',ee.String(month1));
  return updatedIMAGE;
}

// Apply that function to all images in Daymett collection
var updatedIMAGES3 = updatedIMAGES2.map(NoteMonthForEachImage);

//print(updatedIMAGES3.limit(1));

// Create separate Image Collection for each variable:
var daymet30prcp = updatedIMAGES3.select("prcp");
var daymet30tmin = updatedIMAGES3.select("tmin");
var daymet30tmax = updatedIMAGES3.select("tmax");

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

