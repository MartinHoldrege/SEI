/*
var yearList = [2001, 2006, 2011, 2016, 2019];
for (var i=0; i<yearList.length; i++) {
  var yearNLCD = yearList[i];
  print(yearNLCD)
  var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush')
  Map.addLayer(H,{}, 'year' + yearNLCD,false)
}


var yearStart = 2017;
var yearEnd = 2020;
  var lstRCMAPsage = ee.List([])
  for (var i=yearStart; i<=yearEnd; i++) {
    // Data characterize the percentage of each 30-meter pixel in the Western United States covered by sagebrush
    var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i)
      // Note--I somehow screwed up ingesting these rcmap rasters so at least for now keep
      // loading the ones DT made publically available
    //var rcmapSage = ee.Image(path + "rcmap/rcmap_sagebrush_" + i) // from DT
    var lstRCMAPsage = lstRCMAPsage.add(rcmapSage)
    Map.addLayer(rcmapSage, {}, 'year' + i);
  }
  
*/

var dataset = ee.ImageCollection('USGS/NLCD_RELEASES/2019_REL/RCMAP/V4/COVER');

// Filter the collection to the 2016 product.
var nlcd2016 = dataset.filter(ee.Filter.eq('system:index', '2017'))
  .first()
  .select('rangeland_sagebrush');

var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + '2017');
Map.addLayer(rcmapSage, {}, 'dt', false);
Map.addLayer(nlcd2016, {}, 'gee', false)
Map.addLayer(nlcd2016.eq(rcmapSage),{}, 'equal', false)
Map.addLayer(nlcd2016.subtract(rcmapSage),{min: -10, max: 10, palette: ['blue', 'white', 'red']}, 'diff', false)
print(ee.Number(2017).format("%.0f"))
var start = 2017
var end = 2020
var nlcd2020 = dataset.filter(ee.Filter.gte('system:index', ee.Number(start).format("%.0f")))
  .filter(ee.Filter.lte('system:index', ee.Number(end).format("%.0f")))
  .select('rangeland_sagebrush')
  .mean()
  .rename('nlcdSage');
Map.addLayer(nlcd2020, {min:0, max: 50, palette: ['white', 'green']}, 'mean')
  