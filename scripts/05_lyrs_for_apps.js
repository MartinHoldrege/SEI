/*
Purpose:
Create summary data layers from data products that are used in apps, and also sampled from
in other scripts for later analyses. 
The main point is that there isn't unnecessary duplication of code in app scripts
These layers are all now created in function so that arguments can be passed to it
the function returns a dictionary with all the necessary objects. 

Author: Martin Holdrege

Started: October 4, 2023
*/

// dependencies -----------------------------------------------------------

// Load module with functions 
// The functions, lists, etc are used by calling SEI.nameOfObjectOrFunction
var SEI = require("users/MartinHoldrege/SEI:src/SEIModule.js");
var fig = require("users/MartinHoldrege/SEI:src/fig_params.js");
var clim = require("users/MartinHoldrege/SEI:src/loadClimateData.js");
var path = SEI.path;

// for testing
//var args = {root: 'fire1_eind1_c4grass1_co20_2311_'}

// helper functions --------------------------------------------------------

// proportion change, except proportion change considered 0, when change is not in same
// direction as change in Q3y. Note that input is an image with (proportion) changes for Q1-Q3 as well as Q3y
// cur is the current value (for use in denominator for calculating % change)
var correctedProp = function(x, cur) {
    
    // direction of ~SEI (actually just Q1*Q2*Q3) change (1 pos, 0 neg or no change)
    var Q5s = ee.Image(x).select('Q3y');
    var qBands = ['Q1raw', 'Q2raw', 'Q3raw'];
    var empty = ee.Image(0).addBands(ee.Image(0)).addBands(ee.Image(0))
      .rename(qBands);
      
    var dirQ5s = empty
      .where(Q5s.gt(0), 3) // increase
      .where(Q5s.eq(0), 2) // no change
      .where(Q5s.lt(0), 1); // decrease
      
    // direction of Q change
    var diffQ = ee.Image(x).select(qBands);
    
    var dirQ = empty
      .where(diffQ.gt(0), 3) // increase
      .where(diffQ.eq(0), 2) // no change
      .where(diffQ.lt(0), 1); // decrease
    
    // is the change change in direction of SEI and the individual Q component the same?
    var agreeDir = dirQ.eq(dirQ5s);
    
    // Absolute proportion change in Qs
    // abs prop = abs( (future-current)/current
    var absProp = diffQ.divide(cur.select(qBands))
      .abs()
      // if don't agree on the direction of change than make the proportion change 0 (i.e
      // so that if Q1 increases but SEI decreases don't blame that decrease on Q1)
      .where(agreeDir.eq(0), 0); // for testing purposes removing this line
    
    var sum = absProp.reduce('sum');
    // divide all layers by the total to normalize each value
    // (ie. for each q) so they fall between 0 and 1, 1 meaning
    // all the change was due to that q
    var absPropNorm = absProp.divide(sum)
      // replaced values where denominator would be 0, with 0 (otherwise undefined)
      .where(sum.eq(0), 0);
    return absPropNorm.copyProperties(ee.Image(x));
  };

/**
 * create funtion that creates an image of type 1 summaries (i.e. values corresponding to low median, high SEI)
 * @param {ee.imageCollection} q5sc collection where each image  is q5s for a given GCM
 * @param {ee.Image}  Q5sRed reduced (low, median, high) SEI
 * @return {ee.Image}
*/
var redImgFactory = function(q5sIc, Q5sRed) {
  
  // ic is the collection to calculate the type 1 summaries of
  var f = function(ic) {
    var bandNames = ic.first().bandNames();
    var maskMedian = SEI.maskSeiRedFactory(Q5sRed.select('Q5s_median'), 'median', bandNames, true);
    var maskLow = SEI.maskSeiRedFactory(Q5sRed.select('Q5s_low'), 'low', bandNames, true);
    var maskHigh = SEI.maskSeiRedFactory(Q5sRed.select('Q5s_high'), 'high', bandNames, true);
    var ic = ic.merge(q5sIc);
    var med = ic
      .map(maskMedian)
      // grabbing the first value (instead of mean/median so can gaurentee values at a pixel come from
      // specific GCM
      .reduce(ee.Reducer.firstNonNull());

    var low = ic
      .map(maskLow)
      .reduce(ee.Reducer.firstNonNull());
      
    var high = ic
      .map(maskHigh)
      .reduce(ee.Reducer.firstNonNull());
  
    var out = med
      .addBands(low)
      .addBands(high)
      .regexpRename('_first$', '');
      
    return out;
  };
  return f;
};

// the main function, arguments are the user defined variables, passed as a dictionary
// the dictionary items can be any of root, RCP, epoch, versionFull, and resolution
// returns a large dictionary
var main = exports.main = function(args) {
  var root = args.root;
  var RCP =  args.RCP;
  var epoch =  args.epoch;
  var versionFull =  args.versionFull;
  var resolution =  args.resolution;

  // User-defined variables -----------------------------------------------------
  // default settings
  if (root === undefined){var root = 'fire1_eind1_c4grass1_co20_2311_';}
  if (RCP === undefined){var RCP =  'RCP45';}
  if (epoch === undefined){var epoch = '2070-2100';}
  // which version used to calculate SEI?
  if (versionFull === undefined){var versionFull = 'vsw4-3-4'}
  // output (and input) resolution
  if (resolution === undefined){var resolution = 90}
  
  var n = SEI.GCMList.length - 1;
  // percentiles of the 2nd lowest (ranked) GCM and 2nd highest
  var pcents = [1/n*100, (n-1)/n*100];
  
  var reducerLowHigh = ee.Reducer.percentile(pcents, ['low', 'high']);
  
  var reducers = reducerLowHigh.combine({
    reducer2: ee.Reducer.median(),
    sharedInputs: true
  });
  
  // read in data product  -------------------------------------------------
  
  var version = SEI.removePatch(versionFull);
  
  var curYears = '_' + SEI.curYearStart + '_' + SEI.curYearEnd + '_';
  var productName = 'products_' + versionFull + curYears + resolution + "_" + root +  RCP + '_' + epoch;
  
  var p = ee.Image(path + version + '/products/' + productName).updateMask(SEI.mask);
  
  // * robust change c9
  // considering robust if all but 1 GCM agree on future classification
  var whereNotRobust = p.select('p3_numAgree').lt(ee.Image(SEI.GCMList.length - 1));
  
  
  // GCM level results -------------------------------------------------------------
  
  // bands of interest and their descriptions
  var diffBands = ['sage560m', 'perennial560m', 'annual560m', 'Q1raw', 'Q2raw', 'Q3raw', 'Q5s'];
  var diffBands2 = diffBands;
  diffBands2.push('Q3y');

  var namesBands = ['sage', 'perennial', 'annual', 'Q1 (sage)', 'Q2 (perennial)', 'Q3 (annual)', 'SEI'];
  
  // future SEI
  var assetName = 'SEI' + versionFull + '_' + resolution + "_" + root +  RCP + '_' + epoch + '_by-GCM';
  
  // this image should have bands showing sei (continuous, 'Q5s_' prefix) and 3 class (Q5sc_ prefix) for each GCM
  var fut00 = ee.Image(path + version + '/forecasts/' + assetName)
    .updateMask(SEI.mask);
    
  // fixing issue with extra (non corrected lyrs saved in 03_SEIsw_method3)
  // the Q5s, and Q5sc3 corrected layrs have a _1 ended, because the non corrected
  // versions were mistakenly also outputted in the asset. here replacing the non-corrected
  // lyr w/ the corrected lyr
  var correctedLyrs = fut00.select('.*_1$').bandNames();
  var uncorrectedLyrs = correctedLyrs
    .map(function(x) {
      return ee.String(x).replace('_1$', '');
    });
  
  var fut0 = fut00.select(fut00.bandNames().removeAll(uncorrectedLyrs))
    .regexpRename('_1$', ''); // the corrected lyrs (ending in _1), now having that suffix removed. 

  // these are the bands created when there was (artificially) no change in stepwat values from current
  // to future conditions. version 4-3-2 has these bands (earlier one's, and 4-3-20 don't)
  var cur0 = fut0.select('.*_control');
  var cur1 = cur0.regexpRename('_control', '');
  
  // calculating Q3y (sensu Dave T), so that can look at the 'direction' of 
  // change of the unsmoothed (i.e. not SEI2000) sei (don't actually need Q5y here,
  // because Q4&Q5 remain constant). Doing this because can have Q5s decrease in a location
  // while the Q1-Q3 increase (because of smoothing from adjacent places). This makes it 
  // tricky to define the Q that is the 'driver' of change. 
  var curQ3y = cur1.select('Q1raw')
        .multiply(cur1.select('Q2raw'))
        .multiply(cur1.select('Q3raw'))
        .rename('Q3y');
        
  var cur1 = cur1.addBands(curQ3y);

  // removing the control bands
  var fut1 = fut0.select(
    fut0.bandNames().removeAll(cur0.bandNames())
  );
  
  // each image in collection from a different GCM
   var futIc = SEI.image2Ic(fut1,'GCM')
    .map(function(x) {
      var img = ee.Image(x);
      var Q3y = img.select('Q1raw')
        .multiply(img.select('Q2raw'))
        .multiply(img.select('Q3raw'))
        .rename('Q3y');
      return img.addBands(Q3y);
    });

  // future reduced -----------------------------------------------------------------
  // future SEI (reduced), so that all other downstream metrics (c9 etc can
  // be re-calculated, and correctly correspond to to the low, median, high SEI)
  // calculating the Q values that correspond to the medain SEI (pixelwise)
  var seiMed = futIc
    .select('Q5s')
    .reduce(reducers);
   
  var createRedImg = redImgFactory(futIc.select('Q5s'), seiMed);  // image to calculate type 1 summaries (values associated w/ low, median, high SEI)
  var bandNames = ['sage560m', 'perennial560m', 'annual560m', 'Q1raw', 'Q2raw', 'Q3raw'];
  var bandNames2 = bandNamesl
  bandNames2.push('Q3y')
  // function that masks image if SEI is not equal to the median SEI
/*  var maskMedian = SEI.maskSeiRedFactory(seiMed.select('Q5s_median'), 'median', bandNames2, true);
  var maskLow = SEI.maskSeiRedFactory(seiMed.select('Q5s_low'), 'low', bandNames2, true);
  var maskHigh = SEI.maskSeiRedFactory(seiMed.select('Q5s_high'), 'high', bandNames2, true);
  
  var futIcTmp = futIc
    .select(diffBands2);
  
  var qMed = futIcTmp
    .map(maskMedian)
    // grabbing the first value (instead of mean/median so can gaurentee q values at a pixel come from
    // specific GCM
    .reduce(ee.Reducer.firstNonNull());

  var qLow = futIcTmp
    .map(maskLow)
    .reduce(ee.Reducer.firstNonNull());
    
  var qHigh = futIcTmp
    .map(maskHigh)
    .reduce(ee.Reducer.firstNonNull());

  var qComb = qMed
    .addBands(qLow)
    .addBands(qHigh)
    .regexpRename('_first$', '');*/
    
  var qComb = createRedImg(futIc.select(bandNames2));

  var qFutRed = SEI.image2Ic(qComb, 'GCM');

  var futRed = SEI.image2Ic(seiMed, 'GCM')
    .combine(qFutRed);

  // differences relative to current conditions for relavent bands
  var diffIc = futIc.map(function(image) { // for each GCM
    return ee.Image(image).select(diffBands)
      // subtract current conditions
      .subtract(cur1.select(diffBands))
      .copyProperties(ee.Image(image));
  });
  
  var diffRed = futRed.map(function(image) { // for each GCM
    return ee.Image(image).select(diffBands2)
      // subtract current conditions
      .subtract(cur1.select(diffBands2))
      .copyProperties(ee.Image(image));
    });
  //print(diffRed)
  
  // difference converted to a proportion change
  var diffPropRed = diffRed.map(function(image) {
    return ee.Image(image)
      .select(diffBands)
      // subtract current conditions
      .divide(cur1.select(diffBands)) // this was previously incorrect (multiply)
      .copyProperties(ee.Image(image));
  });
  
  // calculating 'worst and best' case c9
  
  // first recalculating c3 for low, median, high SEI
  var futC3Red = futRed.map(function(x) {
    return SEI.seiToC3(ee.Image(x).select('Q5s'))
      .rename('c3')
      .copyProperties(ee.Image(x));
  });
   
  // c9 transition for each GCM 
  // recalculating cur C3 here, because some potential slight rounding
  // issue (although when zooming into fine resolution they seem to go away. )
  var curC3 = SEI.seiToC3(cur1.select('Q5s'))
    .rename('c3');
    
  var c9Ic = futIc.map(function(x) {
    // var futC3 = SEI.seiToC3(ee.Image(x).select('Q5s')); // at fine resolution it shouldn't be necessary to use this
    var out = SEI.calcTransitions(curC3, ee.Image(x).select('Q5sc3'))
      .copyProperties(ee.Image(x));
    return out;
  })
    .map(function(x) {
      return ee.Image(x).rename('c9'); // not sure wy rename in map above doesn't work
    });
  
  // re-calculating c9 for the reduced layers
  var c9Red = futC3Red.map(function(x) {

      var out = SEI.calcTransitions(curC3, ee.Image(x))
        .copyProperties(ee.Image(x));
      
      return ee.Image(out).regexpRename('c3', 'c9');
  });
  
    // prepare climate data -----------------------------------------------------
  // This is interpolated climate data from STEPWAT (historical and future) (i.e.,
  // this data only has 200 unique values);
  
  var climCur = clim.loadHistoricalSwClim();
  
  var climFut = clim.loadFutureSwClim(RCP, epoch); // image collection, one image per GCM
  
  // change in climate variables
  var climDelta = climFut.map(function(image) {
    return ee.Image(image).subtract(climCur);
  });
  
    // 'reduced' delta MAP and MAT (i.e., pixelwise low, median, and median across GCMs)
  var climDeltaRed2 = climDelta.reduce(reducers); // 'type 2
  
  var climDeltaRed = createRedImg(climDelta);

  // contributions by each Q compontent to changes --------------------------------------
  // calculated but taking the proportional change in Q (if it is in the same direction as the change in SEI)
  // and then dividing by the sum changes in Q that are in the same direction, then taking 
  // the absolute value. 
  var correctPropTmp = function(x) {
    return correctedProp(x, cur1); // creating function that only needs single input (for mapping)
  };
  var qPropRed = diffRed.map(correctPropTmp);
  var qPropIc = diffIc.map(correctPropTmp);
  
  // The proportion that each q component contributed to the change in sei, for the 
  // median SEI (pixelwise)
  var qPropMed = qPropRed
    .filter(ee.Filter.eq('GCM', 'median'))
    .first(); // just extracting the image
    
  // climate confidence layers -----------------------------------
  // Layer that will inform confidence that a area will have worse (or not) habitat classification in the future
  // for areas that are currently core the the number of GCMs that agree that will be core in the futre
  // for areas that are currently grow, the number of GCMS that agree that will be Core or Grow in the future
  
  // re-creating current c3, to avoid slight reproducibility problems, that make original c3 not fully align with c9
  var c3 = p.select('p6_c9Med')
    .remap(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 1, 1, 2, 2, 2, 3, 3, 3]
    );
  
  // number of GCMs that agree on core classification in the future
  var csa = p
    .select('p5_numCSA');
  // number of GCMs that agree on grow classification in the future
  var goa = p
    .select('p5_numGOA');
    
  var numGood = ee.Image(0)
    // for current cores, number of GCMs where stayed core. 
    .where(c3.eq(1), csa)
    // for current grows, number of GCMs where classification stayed the same or got better
    .where(c3.eq(2), csa.add(goa));

  // first digit is c3 classification, 2nd and 3rd digit is number of gcms that suggest things get better or stay the same (for grows and cores)
  var numGoodC3 = c3
    .multiply(100)
    .add(numGood)
    .rename('numGcmGood');
  
  // combining into single dictionary ----------------------------------------
  var out = ee.Dictionary({
    'versionFull': versionFull,
    'root': root,
    'RCP': RCP,
    'epoch': epoch,
    'climCur': climCur,
    'cur': cur0,
    'climDeltaRed': climDeltaRed, // type 1 summary
    'climDeltaRed2': climDeltaRed2, // type 2 summary
    'p': p,
    'diffRed': diffRed, // absolute change (of Q1-Q5, sei etc) (this is an ic, same as diffPropRed, but no division) (type 1)
    'diffRed2': diffIc.reduce(reducers), // type 2 (image)
    'diffIc': diffIc, // absolute change, for relavent bands, by GCM
    'diffPropRed': diffPropRed, // proportion change, for relavent bands, by reducer (this is an IC)
    'futIc': futIc, // image collection future sei etc by GCM
    'futRed': futRed, // future SEI & Q1-Q3, by reduction (IC) (i.e pixewlise summaries)
    'c9Red': c9Red,
    'qPropMed': qPropMed, // climate attribution (proportion)
    'qPropRed': qPropRed,
    'qPropIc': qPropIc, // image collection of climate attribution (proportion change, in direction of q3y)
    'c9Ic': c9Ic, // image collection (one image per GCM) of c9 transitions
    'numGcmGood': numGoodC3 // image where first digit is c3 class, 2nd digit (for cores and grows) is number of GCMs with positive outlooks
    // 'curC3': curC3
  });
  
  return out;
};


// for testing

/*
var d = main({root: 'fire1_eind1_c4grass1_co20_2311_'})
// print(d)
var img = ee.Image(d.get('qPropMed'))
// var dir = ee.ImageCollection(d.get('diffRed')).filter(ee.Filter.eq('GCM', 'median')).first().select('Q5s')
var dir = ee.ImageCollection(d.get('diffIc')).first().select('Q5s')
// var c9 = ee.ImageCollection(d.get('c9Red')).filter(ee.Filter.eq('GCM', 'median')).first()
var c9 = ee.ImageCollection(d.get('c9Ic')).first()
var problem = ee.Image(0)
  .where(dir.gt(0).and(c9.eq(2).or(c9.eq(3)).or(c9.eq(6))), 1)
  .where(dir.lt(0).and(c9.eq(4).or(c9.eq(7)).or(c9.eq(8))), 2);
Map.addLayer(problem.selfMask(), {palette: 'black'}, 'directional issues');
Map.addLayer(dir, {min: -1, max: 1, palette: 'red,white,blue'}, 'delta Q5s')
// -Map.addLayer(SEI.cur.select('Q5sc3').neq(ee.Image(d.get('curC3'))).selfMask(), {palette: 'black'}, 'C3s neq')
//print(d.get('qPropMed'))
*/