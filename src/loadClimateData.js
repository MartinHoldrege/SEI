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
// load all GCMs into bands. At moment variables are MAT and MAP
exports.loadFutureSwClim = function(RCP, epoch, variable) {
  
  var image1 = ee.Image([]);

  for(var i = 0; i < SEI.GCMList.length; i++) {
    var GCM = SEI.GCMList[i];
    var imagePath = path + 'climate/' + variable + '_climate_' + RCP + '_' + epoch + '_' + GCM + dateString;

    var tmp = ee.Image(imagePath).rename(GCM);

    var image1 = image1.addBands(tmp);
  }
  
  // remove empty band
  return image1;
};

// load MAT or MAP images for historical climate conditions
exports.loadHistoricalSwClim = function(variable) {

  var c = "_Current";
  var imagePath = path + 'climate/' + variable + '_climate' + c + c + c+ dateString;
  
  return ee.Image(imagePath).rename(variable);

};

