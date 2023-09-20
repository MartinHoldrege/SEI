// Purpose: load climate data for use in other scripts
// Script started Sept 19, 2023.

// to load:
// var clim = require("users/mholdrege/SEI:src/loadClimateData.js");

// dependencies

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var path = SEI.path
var dateString = '_20230919';

// functions

// load future upscaled climate data (from STEPWAT)
// load all GCMs into images. At moment variables are MAT and MAP
// returns image collection with one image per GCM
exports.loadFutureSwClim = function(RCP, epoch) {
  
  var list1 = ee.List([]);

  for(var i = 0; i < SEI.GCMList.length; i++) {
    var GCM = SEI.GCMList[i];
    var postPath = '_climate_' + RCP + '_' + epoch + '_' + GCM + dateString

    // image with MAT and MAP bands
    var image = ee.Image(path + 'climate/' + 'MAP' + postPath).rename('MAP')
      .addBands(ee.Image(path + 'climate/' + 'MAT' + postPath).rename('MAT'))
      //setting GCM property
      .set('GCM', GCM);

    var list1 = list1.add(image);
  }
  
  return ee.ImageCollection(list1);
};


// load image containing MAP and MAT bands (stepwat interpolated climate data)
exports.loadHistoricalSwClim = function(variable) {
  var c = "_Current";
  var postPath = '_climate' + c + c + c+ dateString;
  
  var image = ee.Image(path + 'climate/' + 'MAP' + postPath).rename('MAP')
      .addBands(ee.Image(path + 'climate/' + 'MAT' + postPath).rename('MAT'))
      //setting GCM property
      .set('GCM', 'Current');
  return image;
};

