var lyrMod = require("users/MartinHoldrege/SEI:scripts/05_lyrs_for_apps.js");
var d = lyrMod.main({root: 'fire1_eind1_c4grass1_co20_2311_'})
var img = ee.ImageCollection(d.get('diffRed')).filter(ee.Filter.eq('GCM', 'median')).first()
var diffIc = ee.ImageCollection(d.get('diffIc'))

// deltas (absolute) for a particular GCM
var diffGcm = diffIc.filter(ee.Filter.eq('GCM', 'CESM1-CAM5')).first()

//Map.addLayer(img.select('Q5s'), {min: -0.25, max: 0.25, palette: ['red', 'grey', 'blue']}, 'SEI % change')
//print(d.get('qPropMed'))
print(img.bandNames())
var vis = {min: -0.05, max: 0.05, palette: ['red', 'white', 'blue']};
var lyrs = ['Q1raw', 'Q2raw', 'Q3raw', 'Q5s']

for (var i = 0; i<lyrs.length; i++) {
  var lyr = lyrs[i];
  // Map.addLayer(img.select(lyr), vis, 'delta ' + lyr, false);
  Map.addLayer(diffGcm.select(lyr), vis, 'delta GCM ' + lyr, false);
}


// where directions don't agree (e.g. diff for SEI is positive to negative for the Qs);

// diffGcm
 var qBands = ['Q1raw', 'Q2raw', 'Q3raw'];
var diffQ = diffGcm.select(qBands)
//var diffQ = img.select(qBands)
var Q5s = diffGcm.select('Q5s');
// var Q5s = img.select('Q5s');
    var empty = ee.Image(0).addBands(ee.Image(0)).addBands(ee.Image(0))
      .rename(qBands);
      
    var dirQ5s = empty
      .where(Q5s.gt(0), 3) // increase
      .where(Q5s.eq(0), 2) // no change
      .where(Q5s.lt(0), 1); // decrease
      
    // direction of Q change

    var dirQ = empty
      .where(diffQ.gt(0), 3) // increase
      .where(diffQ.eq(0), 2) // no change
      .where(diffQ.lt(0), 1); // decrease
    
    // is the change change in direction of SEI and the individual Q component the same?
    var agreeDir = dirQ.eq(dirQ5s);
    var anyAgreeDir = agreeDir.reduce('sum').eq(0); // do any of the Qs agree on the direction of change of SEI
    
    Map.addLayer(anyAgreeDir.selfMask(), {palette: ['black']}, 'median disagree on dir')   
//var anyAgre