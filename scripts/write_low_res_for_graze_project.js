// write low resolution version of the tifs for the grazing effects study
// which is working at 1km scale

var resolution = 1000

var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");
var scdImage = ee.Image('projects/fws-gee-sagebrush/assets/2022_SCD_OFR_20211217/SEIv11_2017_2020_30_20211228')

var scdImage = scdImage.select(['.*raw', '.*560m', 'Q5s', 'Q5sc3'])

Export.image.toDrive({
  image: scdImage.toFloat(),
  description: 'SEIv11_2017_2020_' + resolution + '_20211228',
  folder: 'SEI',
  maxPixels: 1e13, 
  scale: resolution,
  region: SEI.region,
  crs: SEI.crs,
  fileFormat: 'GeoTIFF'
});