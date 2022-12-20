/*
Purpose: Figure out the percentiles of RAP and rcmap data that correspond
to q-curves. So that then quantile matching can be used to create 'new' q-curves
to use with 

Author: Martin Holdrege

Date Started 12/19/2022

*/

// Load an image and calculate the number of pixels
var image = ee.Image('LANDSAT/LC08/C01/T1_TOA/LC08_044034_20140318');
var numPixels = image.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: image.geometry(),
  scale: 1000,
});
print(image.bandNames())
var perc1 = image.select('B1').reduceRegion({
  reducer: ee.Reducer.percentile([1, 2, 3, 4, 10, 30, 50, 95]),
  geometry: image.geometry(),
  scale: 1000
});

