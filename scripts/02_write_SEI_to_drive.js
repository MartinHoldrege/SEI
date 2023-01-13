/*
Purpose: export high resolution ee image asset (of 3 class SEI, under future conditions)
to tif, to be uploaded to
science base

Script started: 5/27/2022

Author: Martin Holdrege
*/

var path = 'projects/gee-guest/assets/SEI/'; // path to where most assets live

// image created by 01_SEI_future.js script
var Q5sc3Med = ee.Image(path + 'v11/forecasts/SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20220215');

// region of interest
var biome = ee.FeatureCollection(path + 'US_Sagebrush_Biome_2019'); // defines the study region
var region = biome.geometry();

Map.addLayer(Q5sc3Med, {min:1,max:3, palette: ["black","grey","white"]}, '3 class future', false);

// exported files needs to have USGS albers equal area projection
// https://spatialreference.org/ref/sr-org/usa-contiguous-albers-equal-area-conic-usgs-version-landfire/
// The usgs version wasn't recognized, so going with the regular version (EPSG:5070)
//var wkt = 'PROJCS["USA_Contiguous_Albers_Equal_Area_Conic_USGS_version",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Albers"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-96.0],PARAMETER["Standard_Parallel_1",29.5],PARAMETER["Standard_Parallel_2",45.5],PARAMETER["Latitude_Of_Origin",23.0],UNIT["Meter",1]]';

//var proj_usgs = ee.Projection(wkt);

// export to drive


// export parameters
var scale = 30; 
var crs = 'EPSG:5070';
/*
// datset #1
var c3dataset1 = ee.Image(path + 'v11/current/SEIv11_1998_2001_30_Current_20220718')
  .select('Q5sc3');
Export.image.toDrive({
  image: c3dataset1,
  description: 'SEIv11_1998_2001_30_Current_20220718',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});

// dataset #2
var c3dataset2 = ee.Image('users/DavidTheobald8/WAFWA/v11/SEIv_Q5sc311_2003_2006_30_20220526')
  .select('Q5sc3');
Export.image.toDrive({
  image: c3dataset2,
  description: 'SEIv11_2003_2006_30_Current_20220526',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});

// dataset #3
var c3dataset3 = ee.Image('users/DavidTheobald8/WAFWA/v11/SEIv_Q5sc311_2008_2011_30_20220526')
  .select('Q5sc3');
Export.image.toDrive({
  image: c3dataset3,
  description: 'SEIv11_2008_2011_30_Current_20220526',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});


// datset #4

var c3dataset4 = ee.Image('users/DavidTheobald8/WAFWA/v11/SEIv11_2013_2016_30_20211228')
  .select('Q5sc3');
Export.image.toDrive({
  image: c3dataset4,
  description: 'SEIv11_2013_2016_30_Current_20211228',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});

// datset #5
// export to drive (30m esolution)
//'SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20200527'
var c3dataset5 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717')
  .select('Q5sc3');
Export.image.toDrive({
  image: c3dataset5,
  description: 'SEIv11_2017_2020_30_Current_20220717',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});


// datset #6
// export to drive (30m esolution)
//'SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20200527'
Export.image.toDrive({
  image: Q5sc3Med,
  description: 'SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20220215',
  folder: 'gee',
  maxPixels: 1e13, 
  scale: scale,
  region: region,
  crs: crs,
  fileFormat: 'GeoTIFF'
});
*/

// exporting additional rasters--but with more layers (i.e. these were not used
// for the data release)

// selecting the key bands (the 5 q components, continuous (smooth) SEI and sc3
var bandsForOutput = function(image) {
  var out = image
    .select(['Q1raw', 'Q2raw', 'Q3raw', 'Q4raw', 'Q5raw',"Q5s", 'Q5sc3'])
    .rename(['Q1raw', 'Q2raw', 'Q3raw', 'Q4raw', 'Q5raw',"SEI", 'sc3'])
    .toFloat();
  return out;
};

// can't output all the bands at once b/ the output file (27gb)
// is to big for gdrive
var bands1 = ['Q1raw', 'Q2raw', 'Q3raw'];
var bands2 = ['Q4raw', 'Q5raw'];
var bands3 = ["SEI", 'sc3'];
// var bandsLst = [bands1, bands2, bands3];
// dataset #1
var dataset1 = ee.Image(path + 'v11/current/SEIv11_1998_2001_30_Current_20220718');

var dataset1 = bandsForOutput(dataset1);

// dataset #2
var dataset2 = ee.Image(path + 'v11/current/SEIv11_2003_2006_30_Current_20220718');

var dataset2 = bandsForOutput(dataset2);

// dataset #3
var dataset3 = ee.Image(path + 'v11/current/SEIv11_2008_2011_30_Current_20220718');

var dataset3 = bandsForOutput(dataset3);

// dataset #4
var dataset4 = ee.Image(path + 'v11/current/SEIv11_2013_2016_30_Current_20220718');
var dataset4 = bandsForOutput(dataset4);

// dataset #5
var dataset5 = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717');
var dataset5 = bandsForOutput(dataset5);


var datasetsLst = [
  ['SEIv11_1998_2001_30_Current_20220718', dataset1],
  ['SEIv11_2003_2006_30_Current_20220718', dataset2],
  ['SEIv11_2008_2011_30_Current_20220718', dataset3],
  ['SEIv11_2013_2016_30_Current_20220718', dataset4],
  ['SEIv11_2017_2020_30_Current_20220717', dataset5]
  ];

// adding this line of code to just export datasets 3 and 4
var datasetsLst = datasetsLst.slice(2,4);

for (var i=0; i<datasetsLst.length; i++) { 
  print(ee.Image(datasetsLst[i][1]));
  
  Export.image.toCloudStorage({
    image: ee.Image(datasetsLst[i][1]),
    description: datasetsLst[i][0],
    bucket: 'mholdrege',
    //folder: 'SEI',
    maxPixels: 1e13, 
    scale: scale,
    region: region,
    crs: crs,
    fileFormat: 'GeoTIFF'
  });
}


