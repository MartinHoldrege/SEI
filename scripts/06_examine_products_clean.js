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
 
var root = 'fire1_eind1_c4grass1_co20_2311_';
// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");
var fig = require("users/MartinHoldrege/SEI:src/fig_params.js");

// this is where the data wrangling occurs
// contains one main function

var lyrMod = require("users/MartinHoldrege/SEI:scripts/05_lyrs_for_apps.js");
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
  map.addLayer(ee.Image(d.get('climDeltaRed2')).select('MAP_' + b), deltaMAPvis, 'delta MAP (' + b + ', type 2, interpolated)', false);
  map.addLayer(ee.Image(d.get('climDeltaRed')).select('MAP_' + b), deltaMAPvis, 'delta MAP (' + b + ', type 1, interpolated)', false);
}

// MAT
for (var i = 0; i < bandsRed.length; i++) {
  var b = bandsRed[i];
  map.addLayer(ee.Image(d.get('climDeltaRed')).select('MAT_' + b), deltaMATvis, 'delta MAT (' + b + ', type 1, interpolated)', false);
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
map.addLayer(ee.Image(d.get('qPropMed')), rgbViz, 'RGB (median, type 1)' + rgbLab, false);


// Delta (fut-historical) values (min, max, median, etc) ----------------------------------

// bands of interest and their descriptions
var diffBands = ['sage560m', 'perennial560m', 'annual560m', 'Q1raw', 'Q2raw', 'Q3raw', 'Q5s'];
var namesBands = ['sage', 'perennial', 'annual', 'Q1 (sage)', 'Q2 (perennial)', 'Q3 (annual)', 'SEI'];

var diffRedImg = SEI.ic2Image(ee.ImageCollection(d.get('diffRed')), 'GCM');
var diffRedImg2 = ee.Image(d.get('diffRed2'));
// type 1 summaries are are values that correspond to the summary of SEI. e.g. the 'median' Q1 would be the Q1 that corresponds to the median SEI
// while type 2 is the regular median (e.g. actually the median Q1 which need not correspond to the median SEI)
for (var j = 0; j < diffBands.length; j++) {
  var band = diffBands[j];
  
  map.addLayer(diffRedImg.select(band + '_low').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (low, type 1)', false);
  map.addLayer(diffRedImg2.select(band + '_low').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (low, type 2)', false);
  map.addLayer(diffRedImg.select(band + '_high').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (high, type 1)', false);
  map.addLayer(diffRedImg2.select(band + '_high').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (high, type 2)', false);
  // median is already pre-computed for Q5s (these layers aren't perfect--and shouldn't be used for analysis, but are nearly identical
  // for display)
  if (diffBands == 'Q5s') {
    var medianLyr = ee.Image(d.get('p')).select('p1_diffQ5sMed');
  } else {
    var medianLyr = diffRedImg.select(band + '_median');
    map.addLayer(diffRedImg2.select(band + '_median').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (median, type 2)', false);
  }
  map.addLayer(medianLyr.sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j] + ' (median, type 1)', false);
  
}
// c3 ------------------------------------------------------------------------------

map.addLayer(SEI.cur.select('Q5sc3'), fig.visc3, '3 class SEI (v11)', false);

// c9 maps ----------------------------------------------------------------------
var c9RedImg = SEI.ic2Image(ee.ImageCollection(d.get('c9Red')), 'GCM');

map.addLayer(c9RedImg.select('c9_high'), fig.visc9, '9 class transition (high, type 1)', false); 
map.addLayer(c9RedImg.select('c9_low'), fig.visc9, '9 class transition  (low, type 1)', false);  
map.addLayer(ee.Image(d.get('p')).select('p6_c9Med'), fig.visc9, '9 class transition (median, type 1)', true);

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
var firstLine = ui.Label({
  value: 'STEPWAT simulation settings: ' + d.get('root').getInfo() + ' (' + d.get('RCP').getInfo() 
    + ', ' + d.get('epoch').getInfo() + ')' + ' (' + d.get('versionFull').getInfo() + ')',
  style: {
    fontSize: '12px',
    margin: '0 0 0 0', // Adjust margin as needed
    padding: '0'
  }
});

var secondLine = ui.Label({
  value: '(type 1 summaries are values that correspond the low, median, high SEI; type 2 are the ordinary summaries of the values; both are pixelwise)',
  style: {
    fontSize: '12px',
    margin: '0 0 4px 0', // Adjust margin as needed
    padding: '0'
  }
});

// Create a panel to hold both labels and stack them vertically.
var panelDescript = ui.Panel({
  widgets: [firstLine, secondLine],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
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