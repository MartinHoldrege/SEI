
 
 /********************************************************
 * Purpose:
 * simple EE app to be used by for the the sagebrush climate training, to show 
 * some of the main layers presented in the REM manuscript
 * 
 * Script Started: May 17, 2023
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



// fig params --------------------------------------------------------------

var sldRampDiff1 = fig.sldRampDiff1;
// setup app environment 

ui.root.clear();
//var panel = ui.Panel({style: {width: '250px'}});
var map = ui.Map();
//ui.root.add(panel).add(map); // order that you add panl vs map affects if panel is right or left
ui.root.add(map); 

map.style().set('cursor', 'crosshair');

// prepare climate data -----------------------------------------------------


// map background ------------------------------------------

map.centerObject(SEI.cur.select('Q5sc3'), 6);
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'white background', false); 
map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "gray"},'gray background', false); 

// contributions by each Q compontent to changes --------------------------------------

var qBands = ['Q1raw', 'Q2raw', 'Q3raw'];

// creating RGB maps
// R = sage, G = perennials, B = annuals

var rgbViz = {
  bands: qBands,
  min: 0,
  max: 1
};

var rgbLab = ' (R = Q1 [sage], G = Q2 [perennials], B = Q3 [annuals])';

var diffRedImg2 = ee.Image(d.get('diffRed2Img'));
var forRgb = ee.Image(d.get('qPropMed2'))
  // areas with < 0.01 delta sei are shown as grey
  .where(diffRedImg2.select('Q5s_median').abs().lt(0.01), 211/255);
map.addLayer(forRgb, rgbViz, 'RGB' + rgbLab, false);

// Delta (fut-historical) values (min, max, median, etc) ----------------------------------

// bands of interest and their descriptions
var diffBands = ['Q1raw', 'Q2raw', 'Q3raw', 'Q5s'];
var namesBands = ['Q1 (sage)', 'Q2 (perennials)', 'Q3 (annuals)', 'SEI'];


// type 1 summaries are are values that correspond to the summary of SEI. e.g. the 'median' Q1 would be the Q1 that corresponds to the median SEI
// while type 2 is the regular median (e.g. actually the median Q1 which need not correspond to the median SEI)
for (var j = 0; j < diffBands.length; j++) {
  var band = diffBands[j];

  map.addLayer(diffRedImg2.select(band + '_median').sldStyle(sldRampDiff1), {}, 'delta ' + namesBands[j], false);

}

// agreement among GCMs -------------------------------------------------------------

// lyr used for figure 2 in manuscript ('default' simulation settings)
var numGcm = ee.Image('projects/usgs-gee-drylandecohydrology/assets/SEI/products/vsw4-3-4_gcmAgreement_RCP45_2070-2100');

map.addLayer(numGcm, fig.visNumGcm, 'Agreement among GCMs');

// c3 ------------------------------------------------------------------------------

map.addLayer(SEI.cur.select('Q5sc3'), fig.visc3, '3 class SEI (Doherty 2022)', false);

// c9 maps ----------------------------------------------------------------------

map.addLayer(ee.Image(d.get('p')).select('p6_c9Med'), fig.visc9, '9 class transition', true);

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
  value: 'Simulations done for ' + d.get('RCP').getInfo() 
    + ', ' + d.get('epoch').getInfo() + ' (default STEPWAT2 assumptions used)',
  style: {
    fontSize: '12px',
    margin: '0 0 0 0', // Adjust margin as needed
    padding: '0'
  }
});

var secondLine = ui.Label({
  value: '(unless otherwise noted, values are medians across 13 GCMs)',
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
map.add(fig.legendc9).add(fig.legendNumGcm);

// color bar legends --------------------

var panel2 = ui.Panel({
  style: {
    position: 'top-left',
    padding: '2px 2px'
  }
});

var panel3= fig.makeSldRampLegend(panel2, sldRampDiff1, -1, 1, 'Delta SEI and Q');
map.add(panel3)