
var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive
var wildfires = ee.FeatureCollection('users/DavidTheobald8/WFIGS/Interagency_Fire_Perimeter_History'); 
var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2') //
var ones = ee.Image(1)
var lstRap = ee.List([])
for (var y=yearEnd; y>=yearStart; y--) {
  print(y);
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd))
  
  // MH creates a raster where 0 is area of fire, 1 is no fire (that year)
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 
  Map.addLayer(imageWildfire, {min:0, max:1}, 'imageWildfire ' + y, false)
  
  // MH mean across layers of ic. then multiply to remove areas that are fire
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean().multiply(imageWildfire.selfMask()) // remove,  
  Map.addLayer(rap1, {}, 'rap1 ' + y, false) // the rap layer now has 'holes' in it. 
  var lstRap = lstRap.add(rap1)
}



var yList = ee.List.sequence(yearEnd, yearStart, -1)
print(yList)
var start = ee.String('2020').cat('-01-01')
print(start)
var start = ee.Date('2020-01-01')
var test = ic.filterDate(start,  '2020-12-31');
var test2 = ee.Number(4);
print(test);
print(test2);


var string = ee.String("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_2020")
var image = ee.Image(string);
print(image);


// CONTINUE here
var list = ee.List.sequence(yearStart, yearEnd).map(function(y){
  var out = ee.String("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_2020")
    // reformatting so that the number doesn't have a trailing .0
    .cat(ee.Number(y).format('%.0f'));
  return out;
})
print('list', list)

if (false) {
  for (var i=yearStart; i<=yearEnd; i++) {
  // Data characterize the percentage of each 30-meter pixel in the Western United States covered by sagebrush
  var rcmapSage = ee.Image("users/DavidTheobald8/USGS/RCMAP/rcmap_sagebrush_" + i)
    // Note--I somehow screwed up ingesting these rcmap rasters so at least for now keep
    // loading the ones DT made publically available
  //var rcmapSage = ee.Image(path + "rcmap/rcmap_sagebrush_" + i) // from DT
  var lstRCMAPsage = lstRCMAPsage.add(rcmapSage)
}
  
eeYearEnd = ee.Number(yearEnd)

start
var removeWildfire = function(y, lstRap) {
  var wildfiresF = wildfires.filter(ee.Filter.rangeContains('FIRE_YEAR_', y, yearEnd));
  var imageWildfire = ones.paint(wildfiresF, 0) // if a fire occurs, then remove 

  // MH mean across layers of ic. then multiply to remove areas that are fire
  var rap1 = ic.filterDate(y + '-01-01',  y + '-12-31').mean().multiply(imageWildfire.selfMask()) // remove,  

  var lstRap = ee.List(lstRap).add(rap1);
  return lstRap
};

var first = ee.List([])
var test2 = ee.List(yList.iterate(removeWildfire, first));
print(test2);
}