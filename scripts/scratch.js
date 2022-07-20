/*


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
*/

var seidt = ee.Image('users/DavidTheobald8/WAFWA/v11/SEIv11_2017_2020_30_20211228')
  .select('Q5sc3');
print(seidt)

var path = 'projects/gee-guest/assets/SEI/'; // path to where most assets live

// image created by 01_SEI_future.js script
var seimh = ee.Image(path + 'v11/current/SEIv11_2017_2020_30_Current_20220717')
  .select('Q5sc3');
Map.addLayer(ee.Image(1), {palette: 'black'},'white')
Map.addLayer(seimh.subtract(seidt), {min:-6, max:6, palette: ['red', 'white', 'blue']}, 'diff')
