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

// legend for c9 transition maps ----------------------------------------


var c9Palette = ['#000000', // stable core (black)
             '#f4a582', // core becomes grow
             '#b2182b', // core becomes impacted
             '#92c5de', // grow becomes core
             '#757170', // stable grow
             '#d6604d', // grow becomes impacted
             '#2166ac', // impacted becomes core
             '#4393c3', // impacted becomes grow
             '#D9D9D9']; // stable impacted
             
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
    fontSize: '18px',
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
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
 
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
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
 
exports.c9legend = legend;

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
