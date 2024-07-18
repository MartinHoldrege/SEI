# SEI

**Please see the 'zenodo' branch of this repository**

Analysis of sagebrush ecological integrity. This is the main branch of the
repository that has all scripts (including old/defunct scripts). Please
switch to the 'zenodo' branch to see the cleaner, more curated, and better documented version
of the repository that only provides the scripts needed for the analyses presented
in Holdrege et al. 2024 (Rangeland Ecology and Management)


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
  
  Minor version 3 -- `Script 03_SEIsw_method3.js` used. By multiplying by RAP proportion change (from stepwat)
  and or by adding change in stepwat cover. 

    
    Patch 1 -- afg biomass converted to cover using the rap based equation.
      For all PFTs Calculated DeltaS as a change in potential (STEPWAT) cover between future and historical simulations 
      and add to observed (RAP) cover
      so future cover = observed cover + (stepwat future cover - stepwat historical cover)
    
    Patch 2 -- calculate 'future RAP cover' by multiplying current RAP cover
    by the proportional change [(future - historical)/historical] STEPWAT biomass. And
    then do an additional correction for sagebrush because this leads to unrealistic changes
    in cover in some cases where the proportion change is high (which occurs when historical
    STEPWAt biomass was very long and then increased). In those cases a weighted average between
    the proportional adjusted RAP cover and the delta cover (i.e. change in STEPWAT cover) calculated
    future RAP cover is done. 
    This weighting occurs in places where the proportion change from stepwat is very large
    and current rap sage cover is very large, causing unrealistic changes in sagebrush cover. 
    
    Patch 3 -- same as patch 3 but proportional change [(future - historical)/historical] calculated using cover 
    (i.e. STEPWAT biomass converted to cover using linear equations (based on RAP relationsions for annuals and perennials
    and S. Carpenter's equation for sagebrush))
    
    Patch 4 -- same method as patch 3, except now started using v11 of SEI as inputs (original version of SEI from Doherty et al 2022)
      and calculated future SEI based on adding a delta SEI to current SEI. the delta SEI was calculated as SEI for a given GCM minus
      control SEI. This corrects for some rounding problems that led c9 classification to not perfectly align with current c3 classes. 
  
  
  Minor version 4 -- `Script 03_SEIsw_method4.js` used. 
  Calculate future and historical potential SEI directly from STEPWAT output, and then 
  calculate future SEI as observed SEI plus delta potential SEI
  Future SEI = observed SEI + [SEI(STEPWAT2, future) - SEI(STEPWAT2, historical)]
   
    Patch 0 -- afg biomass converted to cover (for q curves) using the rap based equation
    Patch 1 -- afg biomass converted to cover (for q curves) using the Mahood equation

