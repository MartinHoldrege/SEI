# SEI
Analysis of sagebrush ecological integrity 

**A note on git:**

This repository includes google earth engine code (scripts with .js ending),
as well as R scripts. Note that the 'main' branch was renamed to 'master',
because I couldn't get GEE to work with main. It doesn't seem like
you can (at least easily), change branches within the GEE code editor. 

To push and pull from GEE, using:
`git push usgs_gee master`
or
`git pull usgs_gee master`

This is after the usgs_gee alias has been created. 


## Notes on data product versioning:

Major version vsw1 to vsw3--exploratory products made with old
STEPWAT simulation data 

Major version vsw4--first version using the new (i.e. new eind and fire implementation)
STEPWAT results

  Minor version 1 -- `Script 03_SEIsw_method1.js` used. Future SEI calculated using approach
  from Doherty et al 2022. Multiply Rap cover (in this implementaition, the smoothed cover) by DeltaS 
  where DeltaS = (future biomass - historical biomass) / maximum historical biomass
  
  Minor version 2 -- `Script 03_SEIsw_method2.js` used. 
  Similar to method 1 but adjust DeltaS to divide by a geographically local maximum
  so DeltaS = (future biomass - historical biomass) / local maximum historical biomass
  
  Minor version 3 -- `Script 03_SEIsw_method3.js` used. 
  Calculate DeltaS as a change in potential (STEPWAT) cover between future and historical simulations 
  and add to observed (RAP) cover
  so future cover = observed cover + (stepwat future cover - stepwat historical cover)
    
    Patch 1 -- afg biomass converted to cover using the rap based equation
  
  
  Minor version 4 -- `Script 03_SEIsw_method4.js` used. 
  Calculate future and historical potential SEI directly from STEPWAT output, and then 
  calculate future SEI as observed SEI plus delta potential SEI
  Future SEI = observed SEI + [SEI(STEPWAT2, future) - SEI(STEPWAT2, historical)]
   
    Patch 0 -- afg biomass converted to cover (for q curves) using the rap based equation
    Patch 1 -- afg biomass converted to cover (for q curves) using the Mahood equation

