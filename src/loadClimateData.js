// Purpose load climate data for use in other scripts


// dependencies

var SEI = require("users/mholdrege/SEI:src/SEIModule.js");
var path = SEI.path
var RCP = 'RCP45'
var epoch = '2070-2100'

var c = '_Current';
var genericPathCur =  path + 'climate/' +  'ZZZZ' + '_climate' + c + c + c + '_20230919';
// this function also sums cheatgrass and aforb to get aft, and also load sage and pft
//print(String(genericPathCur.getValue()))
var climCur1 = SEI.readImages2Bands(genericPathCur,['MAP', 'MAT'],false);

print(climCur1)
