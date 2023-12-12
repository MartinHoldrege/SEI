/********************************************************
 * Purpose:
 * Examine the products image created in the 05_create_data_products.js
 * script. These are the fundamental data products that are being created
 * by this project. Here, maps made to compare different versions of the products
 * Compared to 06_examin_products.js this script creates an app with fewer
 * layers, that is also more user friendly. 
 * 
 * Script Started: October 5, 2023
 * 
 * Author: Martin Holdrege
 * 
 * 
* 
 * *******************************************************
*/ 

// User-defined variables -----------------------------------------------------
 
var root = 'fire1_eind1_c4grass1_co20_2311_'
// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var fig = require("users/mholdrege/SEI:src/fig_params.js");

// this is where the data wrangling occurs
// contains one main function

var lyrMod = require("users/mholdrege/SEI:scripts/05_lyrs_for_apps.js");
var d = lyrMod.main({
  root: root
}); // returns a dictionary

//Custom Basemap
var snazzy = require("users/aazuspan/snazzy:styles");
// snazzy.addStyleFromName("Light Monochrome");


// fig params --------------------------------------------------------------

var sldRampDiff1 = fig.sldRampDiff1;
// setup app environment 

ui.root.clear();
//var panel = ui.Panel({style: {width: '250px'}});
var map = ui.Map();
//ui.root.add(panel).add(map); // order that you add panl vs map affects if panel is right or left
ui.root.add(map); 

map.style().set('cursor', 'crosshair');
snazzy.addStyleFromName("Interface map"); // doesn't seem to work inside app ?


// prepare climate data -----------------------------------------------------


// map background ------------------------------------------

map.centerObject(SEI.cur.select('Q5sc3'), 6);
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'white background', false); 
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "gray"},'gray background', false); 


// plot climate data -----------------------------------------------------------------
var deltaMATvis = {min: 1, max: 6, palette: ['white', '#67001f']};
var deltaMAPvis = {min: -130, max: 130, palette: ['#67001f', 'white', '#053061']};
var MAPvis = {min: 0, max: 800, palette: ['white', '#053061']};
var MATvis = {min: 0, max: 18, palette: ['white', '#67001f']};

// historical

map.addLayer(ee.Image(d.get('climCur')).select('MAP'), MAPvis, 'MAP (historical, interpolated)', false);
map.addLayer(ee.Image(d.get('climCur')).select('MAT'), MATvis, 'MAT (historical, interpolated)', false);

// change under future conditions
var bandsRed = ['low', 'high', 'median'];

// MAP
for (var i = 0; i < bandsRed.length; i++) {
  var b = bandsRed[i];
  map.addLayer(ee.Image(d.get('climDeltaRed')).select('MAP_' + b), deltaMAPvis, 'delta MAP (' + b + ', interpolated)', false);
}

// MAT
for (var i = 0; i < bandsRed.length; i++) {
  var b = bandsRed[i];
  map.addLayer(ee.Image(d.get('climDeltaRed')).select('MAT_' + b), deltaMATvis, 'delta MAT (' + b + ', interpolated)', false);
}

// contributions by each Q compontent to changes --------------------------------------

var qBands = ['Q1raw', 'Q2raw', 'Q3raw'];


// creating RGB maps
// R = sage, G = perennials, B = annuals

var rgbViz = {
  bands: qBands,
  min: 0,
  max: 1
};

var rgbLab = ' (R = Q1, G= Q2, B = Q3)';
map.addLayer(ee.Image(d.get('qPropMean')), rgbViz, 'RGB (delta Q attribution)' + rgbLab, false);


// Delta (fut-historical) values (min, max, median, etc) ----------------------------------

// bands of interest and their descriptions
var diffBands = ['sage560m', 'perennial560m', 'annual560m', 'Q1raw', 'Q2raw', 'Q3raw', 'Q5s'];
var namesBands = ['sage', 'perennial', 'annual', 'Q1 (sage)', 'Q2 (perennial)', 'Q3 (annual)', 'SEI'];

for (var j = 0; j < diffBands.length; j++) {
  var band = diffBands[j];
  
  map.addLayer(ee.Image(d.get('diffRed2')).select(band + '_low').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (low, across GCMs)', false);
  map.addLayer(ee.Image(d.get('diffRed2')).select(band + '_high').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (high, across GCMs)', false);
  
  // median is already pre-computed for Q5s
  if (diffBands == 'Q5s') {
    var medianLyr = ee.Image(d.get('p')).select('p1_diffQ5sMed');
  } else {
    var medianLyr = ee.Image(d.get('diffRed2')).select(band + '_median');
  }
  map.addLayer(medianLyr.sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (median)', false);
  
}
// c3 ------------------------------------------------------------------------------

map.addLayer(SEI.cur.select('Q5sc3'), fig.visc3, '3 class SEI (v11)', false);

// c9 maps ----------------------------------------------------------------------

map.addLayer(ee.Image(d.get('c9Red')).select('low'), fig.visc9, '9 class transition (good case across GCMs)', false); 
map.addLayer(ee.Image(d.get('c9Red')).select('high'), fig.visc9, '9 class transition  (bad case across GCMs)', false);  
map.addLayer(ee.Image(d.get('p')).select('p6_c9Med'), fig.visc9, '9 class transition (median)', true);

// 'backgroud' layers ---------------------------------------------------------------------------
map.addLayer(fig.statesOutline, {}, 'state outlines', false); // outline of states (white background)
// misc labels -------------------------------------------------------------------------

// label providing simulations settings
var panel = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px'
  }
});
 
// Create legend title
var panelDescript = ui.Label({
  value: 'STEPWAT simulation settings: ' + d.get('root').getInfo() + ' (' + d.get('RCP').getInfo() 
    + ', ' + d.get('epoch').getInfo() + ')' + ' (' + d.get('versionFull').getInfo() + ')',
  style: {
    fontSize: '12px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
panel.add(panelDescript);
map.add(panel);

// panel  for c9 legend
map.add(fig.legendc9);

// color bar legends --------------------

var panel2 = ui.Panel({
  style: {
    position: 'top-left',
    padding: '2px 2px'
  }
});

var panel3= fig.makeSldRampLegend(panel2, sldRampDiff1, -1, 1, 'Delta SEI, Q, and Cover');
var panel3 = fig.makeVisParamsRampLegend(panel3,  deltaMATvis, 'Delta MAT (C)');
var panel3 = fig.makeVisParamsRampLegend(panel3,  deltaMAPvis, 'Delta MAP (mm)');
var panel3 = fig.makeVisParamsRampLegend(panel3,  MATvis, 'MAT (C)');
var panel3 = fig.makeVisParamsRampLegend(panel3,  MAPvis, 'MAP (mm)');
map.add(panel3)