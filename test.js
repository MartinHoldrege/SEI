/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var AIM = ee.FeatureCollection("BLM/AIM/v1/TerrADat/TerrestrialAIM"),
    geometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-117.42866715670063, 46.72327480678781],
          [-117.42866715670063, 42.53525218838522],
          [-111.29829606295063, 42.53525218838522],
          [-111.29829606295063, 46.72327480678781]]], null, false),
    table = ee.FeatureCollection("users/DavidTheobald8/WBDHUC12_201602_30m_mp"),
    imageVisParam5 = {"opacity":1,"bands":["constant"],"min":-0.25,"max":0.25,"palette":["2208ff","bebebe","ff0000"]},
    imageVisParam6 = {"opacity":1,"bands":["constant"],"min":-0.5,"max":0.5,"palette":["2208ff","bebebe","ff0000"]},
    imageVisShrub = {"opacity":1,"bands":["SHR"],"max":40,"palette":["ededed","818729"]},
    imageVisParam8 = {"opacity":1,"bands":["AFGC"],"max":5,"palette":["ededed","ad08b8"]},
    imageVisTree = {"opacity":1,"bands":["TREE"],"max":10,"palette":["e7e7e7","7d9302"]},
    ecoregionalGeometry = 
    /* color: #d63000 */
    /* shown: false */
    ee.Geometry.Polygon(
        [[[-119.95152547822688, 46.11285630205455],
          [-121.46763875947688, 43.12665463152686],
          [-121.20396688447688, 40.507125047485125],
          [-119.62193563447688, 37.937274439684195],
          [-117.88609579072688, 37.815867951835216],
          [-113.62340047822688, 37.850575936339744],
          [-112.65660360322688, 37.065706124849214],
          [-109.11293513752128, 37.02833272242481],
          [-105.14195516572688, 36.819847746228],
          [-105.97691610322688, 39.76802237981562],
          [-105.22435262666438, 42.71635441680955],
          [-105.44957235322688, 45.70004865717727],
          [-109.18492391572688, 46.264969086535615],
          [-110.83287313447688, 46.85418817680895],
          [-114.98570516572688, 45.530987540977804],
          [-117.60045125947688, 45.592523282039366]]]),
    imageVisParam12 = {"opacity":1,"bands":["PFGC"],"min":-1,"palette":["ff7804","fbff00","dee0db","65ff52","004e02"]},
    imageVisParam13 = {"opacity":1,"bands":["remapped_mean"],"min":0.05000000074505806,"max":0.75,"palette":["ff5606","03ba1a"]},
    imageVisParam14 = {"opacity":1,"bands":["remapped_mean"],"min":0,"max":0.75,"palette":["f3ef81","029114"]},
    imageVisGrass = {"opacity":1,"bands":["PFGC"],"min":-0.9245283018867925,"palette":["ff0000","feffab","00852f"]},
    imageVisParam24 = {"opacity":1,"bands":["remapped_mean_mean"],"min":1,"palette":["000004","180f3e","721f81","cd4071","fd9567","fcfdbf"]},
    imageVisParam25 = {"opacity":1,"bands":["PFGC"],"palette":["e4e6d4","f7ff7c","00852f","004519"]},
    imageVisParam26 = {"opacity":1,"bands":["constant"],"palette":["f3ffe9","0832ff"]},
    imageVisParam27 = {"opacity":1,"bands":["PFGC"],"max":0.2,"palette":["ff0000","feffab","00852f"]},
    imageVisParam28 = {"opacity":1,"bands":["constant"],"min":0,"palette":["f3f1e0","f1eb38","ff7412","d01515","521203"]},
    imageVisParam29 = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["9bbaff","446cda","0d0589"]},
    imageVisHT = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["f4ffb6","77da75","08257a"]},
    imageVisQ5sc = {"opacity":1,"bands":["constant_mean"],"min":1,"palette":["e7ed8b","23b608","107a0e","082b08"]},
    imageVisParam = {"opacity":1,"bands":["Cheatgrass_RCP85_2030-2060_CESM1-CAM5"],"min":-0.1,"max":0.1,"palette":["0a3fff","bababa","a50000"]};
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/********************************************************
 * Calculate the CLIMATE CHANGE Sagebrush Ecosystem Integrity model 
 * for the WAFWA Landscape Conservation Design project
 * Written by David Theobald, EXP, dmt@davidmtheobald.com
 * 
*/

// MH note deleted image and image2 imports which were not found

// User-defined variables.
var yearEnd = 2020  // this value is changed to make multi-year runs, e.g., 2017-2020 would= 2020
var yearStart = yearEnd - 3 // inclusive, so if -3 then 2017-2020, inclusive

var resolution = 90     // output resolution, 90 initially, 30 m eventually
var sampleResolution = 270
var radius = 560    // used to set radius of Gaussian smoothing kernel
var radiusCore = 2000  // defines radius of overall smoothing to get "cores"
var version = '11'
var RAP = true // 'true= rap, false = NLCD', remnant from past decision/work
var biome = ee.FeatureCollection("users/DavidTheobald8/WAFWA/US_Sagebrush_Biome_2019") // defines the study region
var region = biome.geometry()
var WAFWAecoregions = ee.FeatureCollection("users/DavidTheobald8/WAFWA/WAFWAecoregionsFinal")
var imageVisQ = {"opacity":1,"min":0.1,"max":1.0,"palette":['9b9992','f1eb38','ff7412','d01515','521203']}

var yearNLCD = '2019'  // needs to be a string

// MH--explore inputs
Map.addLayer(region, {}) // this is polygon outlining the sagebrush region


Map.addLayer(ee.Image(1),{},'background',false)

//MH-- commented out b/ not available
// var H = ee.Image('users/DavidTheobald8/HM/HM_US_v3_dd_' + yearNLCD + '_90_60ssagebrush') 

/// from USGS GAP land cover	
var LC = ee.Image("USGS/GAP/CONUS/2011")	
Map.addLayer(LC.randomVisualizer(),{},'LC cover',false)
var tundra = LC.remap([149,151,500,501,502,503,504,505,506,507,549,550,551],[1,1,1,1,1,1,1,1,1,1,1,1,1]).unmask(0).eq(0)	

var rangeMask = ee.Image('users/chohnz/reeves_nlcd_range_mask_union_with_playas') // mask from Maestas, Matt Jones
print(rangeMask);
var rangeMaskx = rangeMask.eq(0)
  .multiply(tundra)
  .selfMask().clip(biome)
Map.addLayer(rangeMaskx.selfMask(),{min:1,max:1},'rangeMask from NLCD with playas',false)

var ic = ee.ImageCollection('projects/rangeland-analysis-platform/vegetation-cover-v2')
var rap = ic.filterDate(yearStart + '-01-01',  yearEnd + '-12-31').mean() // ??? use median instead?
print(ic)


