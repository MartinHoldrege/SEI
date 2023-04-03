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