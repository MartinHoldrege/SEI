/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var geometry = /* color: #d63000 */ee.Geometry.Polygon(
        [[[-113.24078729186874, 42.59783002510826],
          [-113.04886987243515, 42.71750778570451],
          [-113.0516164544664, 42.99435321406661],
          [-113.4581105950914, 42.984307855521095],
          [-113.44437768493515, 42.65391031066751]]]);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
/**
 * The fig params module contains objects useful for when creating
 * visualizations (e.g. colors etc. )
 * 
 * load like this:
 * var fig = require("users/mholdrege/SEI:src/fig_params.js");
 * 
 * @module src/fig_params
 */
 
// visParams (for Map.addLayer function)


exports.visQDiff = {min:-1, max: 1, palette: ['red', 'white', 'blue']};
exports.visSEI = {min:0, max: 1, palette: ['white', 'black']};

// blue/tan color scale
exports.visc3 = {opacity: 1, min:1, max:3, palette: ["#142b65", "#99d4e7", "#eee1ba"]};

// colors for red blue ramp (for -1 to 1 ranged data), whith only 0 values being white,
// colors past abs(0.75) are the darkest colors
exports.sldRampDiff1 =
  '<RasterSymbolizer>' +
    '<ColorMap type="ramp" extended="false" >' +
      '<ColorMapEntry color="#67001f" quantity="-1" label="-0.75"/>' + // dark red
      '<ColorMapEntry color="#f4a582" quantity="-0.01" label="-0.01" />' + // light red
      '<ColorMapEntry color="#FFFFFF" quantity="0" label="0" />' + // white
      '<ColorMapEntry color="#92c5de" quantity="0.01" label="0.01" />' + // light blue
      '<ColorMapEntry color="#053061" quantity="1" label="0.75" />' + //dark blue
    '</ColorMap>' +
  '</RasterSymbolizer>';
  

// legend for c9 transition maps ----------------------------------------

/* old palette (stables are black, decrease red, increase blues)
var c9Palette = ['#000000', // stable core (black)
             '#f4a582', // core becomes grow
             '#b2182b', // core becomes impacted
             '#92c5de', // grow becomes core
             '#757170', // stable grow
             '#d6604d', // grow becomes impacted
             '#2166ac', // impacted becomes core
             '#4393c3', // impacted becomes grow
             '#D9D9D9']; // stable impacted
*/   

var c9Palette =  ['#142b65', // stable core (black)
              '#b30000', //'#d7301f', # core becomes grow # reds from 9-class OrRd
             '#67001f',  // core becomes impacted
             '#757170', // grow becomes core
             '#99d4e7', // stable grow
             '#fc8d59',// grow becomes impacted
             '#000000', // impacted becomes core
             '#D9D9D9', // impacted becomes grow
             '#eee1ba'] // stable impacted
             
var c9Names =  [
  'Stable core',
  'Core becomes grow',
  'Core becomes other',
  'Grow becomes core',
  'Stable grow',
  'Grow becomes other',
  'Other becomes core',
  'Other becomes grow',
  'Stable other'
];

var imageVisc9 = {"opacity":1,"min":1,"max":9, "palette":c9Palette};
exports.visc9 = imageVisc9;

// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Transition',
  style: {
    fontWeight: 'bold',
    fontSize: '12px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Creates and styles 1 row of the legend.
var makeRow = function(color, name) {
 
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: color,
          // Use padding to give the box height and width.
          padding: '6px',
          margin: '0 0 1px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {
          margin: '0 0 1px 1px',
          fontSize: '12px'
        }
      });
 
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
 

// Add color and and names
for (var i = 0; i < c9Palette.length; i++) {
  legend.add(makeRow(c9Palette[i], c9Names[i]));
  }  
 
exports.legendc9 = legend;
//Map.add(legend)

// legend for gcm agreement maps ---------------------------------------

var colsNumGcm = ['#053061',
                '#92c5de',
                 '#e31a1c',
                 '#800026',
                 '#252525',
                 '#bdbdbd',
                 '#ffeda0',
                 '#fd8d3c',
                 '#eee1ba'];

exports.visNumGcm = {min: 1, max: 9, palette: colsNumGcm};

var labelsNumGcm = ["Stable CSA (robust agreement)", 
                    "Stable CSA (non-robust agreement)", 
                    "Loss of CSA (non-robust agreement)", 
                    "Loss of CSA (robust agreement)", 
                    "Stable (or improved) GOA (robust agreement)", 
                    "Stable (or improved) GOA (non-robust agreement)", 
                    "Loss of GOA (non-robust agreement)", 
                    "Loss of GOA (robust agreement)", 
                    "Other rangeland area"];

// set position of panel
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
 
// Create legend title
var legendTitle = ui.Label({
  value: 'Agreement among GCMs',
  style: {
    fontWeight: 'bold',
    fontSize: '12px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
 
// Add the title to the panel
legend.add(legendTitle);
 
// Add color and and names
for (var i = 0; i < colsNumGcm.length; i++) {
  legend.add(makeRow(colsNumGcm[i], labelsNumGcm[i]));
  }  
 
exports.legendNumGcm = legend;


// legends for continuous mapped values -----------------------------------------------------


/**
 * Creating color bar legend for layers that show colors with <RasterSymbolizer>
 * @param {ui.panel} existing_panel to add new panel additions to (this panel specificies the location)
 * @param {sld} sld xml string
 * @param {number} minimum value in the sld 
 * @param {number} max value in the sld 
 * @param {string} legend title
 * @return {ui} ui object that 
 */
exports.makeSldRampLegend = function(existing_panel, sld, min, max, title) {
  var lon = ee.Image.pixelLonLat().select('longitude');
  var gradient = lon.multiply((max - min)/100.0).add(min);
  var legendImage = gradient.sldStyle(sld);
  var thumb = ui.Thumbnail({
    image: legendImage,
    params: {bbox:'0,0,100,8', dimensions:'128x10'},
    style: {
      position: 'bottom-center',
      padding: '0px 0px 0px 0px'
    } 
  });

  var panel2 = ui.Panel({
    widgets: [
      ui.Label(min),
      ui.Label({style: {stretch: 'horizontal'}}),
      ui.Label(max) 
      ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {stretch: 'horizontal', maxWidth: '270px', padding: '0px 0px 0px 0px'}
    
  });
  var new_panel = existing_panel
  // adding a title
    .add(ui.Label({
      value: title,
      style: {
        fontWeight: 'bold',
        fontSize: '10px',
        margin: '0 0 4px 0',
        padding: '0',
        textAlign: 'center'
        }
  }))
    .add(panel2)
    .add(thumb);
  return new_panel;
};

/**
 * Creating color bar legend for maps that are displayed with a regular dictionary of visualization parameters
 * @param {ui.panel} existing_panel to add new panel additions to (this panel specificies the location)
 * @param {vizParams} dictionary containing min, max and palette
 * @param {string} legend title
 * @return {ui} ui object that 
 */
exports.makeVisParamsRampLegend = function(existing_panel, visParams, title) {
  var min = visParams.min;
  var max = visParams.max;
  var lon = ee.Image.pixelLonLat().select('longitude');
  var gradient = lon.multiply((max - min)/100.0).add(min);
  var legendImage = gradient.visualize(visParams);
  var thumb = ui.Thumbnail({
    image: legendImage,
    params: {bbox:'0,0,100,8', dimensions:'128x10'},
    style: {
      position: 'bottom-center',
      padding: '0px 0px 0px 0px'
    } 
  });

  var panel2 = ui.Panel({
    widgets: [
      ui.Label(min),
      ui.Label({style: {stretch: 'horizontal'}}),
      ui.Label(max) 
      ],
    layout: ui.Panel.Layout.flow('horizontal'),
    style: {stretch: 'horizontal', maxWidth: '270px', padding: '0px 0px 0px 0px'}
    
  });
  var new_panel = existing_panel
  // adding a title
    .add(ui.Label({
      value: title,
      style: {
        fontWeight: 'bold',
        fontSize: '10px',
        margin: '0 0 4px 0',
        padding: '0',
        textAlign: 'center'
        }
  }))
    .add(panel2)
    .add(thumb);
  return new_panel;
};


// creating a white basemap map -------------------------------------------------------------

// white basemap to see colors more easily if needed. 
var empty = ee.Image().byte();

var states = ee.FeatureCollection('TIGER/2016/States'); // for background of map

var statesOutline = empty.paint({
  featureCollection: states,
  color: 1,
  width: 2
});

exports.statesOutline = statesOutline;

