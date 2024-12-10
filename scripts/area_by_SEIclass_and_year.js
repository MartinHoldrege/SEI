/* Description: Calculate the about of core, grow, and other area each year
 for yearly assets 2001-2021. For figure making (for uncertainty presentation SRM)

  Author: Martin Holdrege
  
  Script started: December 10, 2024
*/
// dependencies -----------------------------------------------------------------------------------------

var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");

// params ------------------------------------------------------------------------------------------------

var scale = 90;
var region = SEI.region;
var firstYear = 2001
var lastyear = 2021
// calculate area by SEI class ---------------------------------------------------------------------------

var areaFc = ee.FeatureCollection([]);


for (var year=firstYear; year<=lastYear; year++) {
  var fileName = 'SEI_v30_' + (year-3) + '_' + year + '_90_20230828';
  // Access 3.0 of WAFWA SEI data, with all bands.
  var x = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/' + fileName)
    .select('Q5sc3');
  
    var area0 = f.areaByGroup(x, 'c3Rr', v, scale);
  
  var area1 = area0.map(function(feature) {
    
    var area_m2 = feature.get('area_m2');
    var area_ha = ee.Number(area_m2).divide(ee.Number(10000));
    
    return feature
      .select(feature.propertyNames().remove('area_m2'))
      .set('year', year)
      .set('file', fileName)
      .set('area_ha', area_ha);
  });

  var areaFc = areaFc.merge(area1);
}


var outName = 'SEIv30_area-by-class_' + firstYear + "_" + lastYear; 
Export.table.toDrive({
  collection: areaFc,
  description: fileName,
  folder: 'SEI',
  fileFormat: 'CSV'
});