
// Access 3.0 of WAFWA SEI data, with all bands.
for (var i=2001; i<2022; i++) {
  var x = ee.Image('projects/fws-gee-sagebrush/assets/2023_SCD_v30_20230828/SEI_v30_' + (i-3) + '_' + i + '_90_20230828')

  Map.addLayer (x,{},'SEIv30_' + (i-3) + '_' + i)
}