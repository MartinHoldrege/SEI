
var path = 'projects/usgs-gee-drylandecohydrology/assets/SEI/'; 
var c9d = ee.Image(path + 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224')

// visualization parameters
// (c3 stands for classification into 3 levels)
var imageVisQc3 = {"opacity":1,"min":1,"max":3};
var c9Palette = ['#000000', // stable core (black)
  '#64AC46', // core becomes grow
  '#ABAB4B', // core becomes impacted
  '#2159B0', // grow becomes core
  '#757170', // stable grow
  '#F0FA77', //grow becomes impacted
  '#7698D8', // impacted becomes core
  '#B1CE94', // impacted becomes grow
  '#D9D9D9' // stable impacted
];
var c9Names = [
  'Stable core',
  'Core becomes grow',
  'Core becomes impacted',
  'Grow becomes core',
  'Stable grow',
  'Grow becomes impacted',
  'Impacted becomes core',
  'Impacted becomes grow',
  'Stable impacted'
  ];
var imageVisc9 = {"opacity":1,"min":1,"max":9, "palette":c9Palette};

// creating a map -------------------------------------------------------------
var empty = ee.Image().byte();

var states = ee.FeatureCollection('TIGER/2016/States'); // for background of map

var statesOutline = empty.paint({
  featureCollection: states,
  color: 1,
  width: 2
});


//Map.addLayer(ee.Image(1), {'min':1, 'max':1, palette: "white"},'background'); // white background
//Map.addLayer(statesOutline, {}, 'outline'); // outline of states
//Map.addLayer(c9d.select('SEIv11_2017_2020_90_ClimateOnly_RCP45_2030-2060_median_20220215'), imageVisc9, 'c9 transition');

// Legend --------------------------

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
 
// add legend to map (alternatively you can also print the legend to the console)
Map.add(legend);
