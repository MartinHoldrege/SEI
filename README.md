# Sagebrush ecological integrity responses to climate change.

**Please see the 'zenodo' branch of this repository**

This is the main branch of the
repository that has all scripts (including old/defunct scripts). Please
switch to the 'zenodo' branch to see the cleaner, more curated, and better documented version
of the repository that only provides the scripts needed for the analyses presented
in Holdrege et al. 2024 (Rangeland Ecology and Management, https://doi.org/10.1016/j.rama.2024.08.003). Note, the version of this repository in the
zenodo branch has also been 
archived on the zenodo repository

## Description of scripts

This repository includes GEE javascript scripts (files with .js ending),
as well as R scripts (files ending in .R). The general workflow was that main analyses, and computationally
intensive tasks were conducted using GEE. Output (and some inputs)
were post (pre) processed in R. The creation of summary tables, and figures 
was done in R. Analysis scripts are in the `/scripts` folder, and source code
(i.e., scripts that define functions etc.) is found the `/src` folder.
R scripts assume the working directory is the project directory (you can
set the working directory by opening the .Rproj file)

### `/scripts` folder

* `/scripts/01_sample-cover-and-biomass.js` Extract cover and biomass data from RAP
(random subset of cells) to be used to fit relationship between cover and biomass for annuals
and perennials.
* `/scripts/02_q_curves_from-cover-vs-biomass.R` Uses the output from `01_sample-cover-and-biomass.js`
to fit linear models to cover vs biomass of annuals and perennials. Also
uses a cover vs biomass relationship fit by S. Carpenter to field data. The slopes
and intercepts for these three regression lines are written to the `qCurves4StepwatOutput2.js`
file, and then used in the `/scripts/03_SEIsw_method3.js` script to convert stepwat2
interpolated biomass to cover. Note that because `qCurves4StepwatOutput2.js` file
is saved in this repository the `01_sample-cover-and-biomass.js` and `02_q_curves_from-cover-vs-biomass.R` wouldn't actually need to be re-run to 
to run the following scripts. 
* `/scripts/03_SEIsw_method3.js` This is the main script, that for a given RCP,
time-period, and set of modelling assumptions creates projections of future SEI.
The output is a GEE asset. 
* `/scripts/04_create_data_products.js`. Takes the output from `03_SEIsw_method3.js`
and creates a summary asset. Note that this is somewhat legacy code, and some of the
layers in the asset created are not used in downstream scripts. 
* `/scripts/05_lyrs_for_apps.js`. The script reads in the output from `04_create_data_products.js` and `03_SEIsw_method3.js`, and creates a function
that returns a dictionary of summary objects (i.e., "rasters"). This dictionary
contains all the summary objects needed in downstream scripts (e.g., medians, high and low values
across GCMs, changes in Q values etc. ). This is the workhorse raster summarizing
script. 
* `/scripts/06_exports_for_data-release.js` Outputs high resolution (90 m) geoTiffs
that are then compiled for the data release(see citation above). It is using the
objects created by `05_lyrs_for_apps.js`
* `/scripts/06_exports_for_maps.js` Exports layers (created by the function
from `05_lyrs_for_apps.js`) that are used for maps in the manuscript (and accompanying 
appendices). These are lower resolution, so that they can more easily be displayed (in a relatively computationally efficient way). 
* `/scripts/climate_attribution/06_ca_transition-class_area.js` This script calculates
the areas shown in bar charts and tables in the manuscript (and appendices),
(e.g. the amount of area of core sagebrush area that becomes growth opportunity area). These area calculations are separately done for many separate sub groupings of pixels, including for pixels where a given plant functional
type is primarily responsible for the change in SEI. 
* `/scripts/climate_attribution/07_ca_transition-class_area.R`. Takes
the output from `06_ca_transition-class_area.js` and aggregates the results
in ways that is useful for figure and table making. 
* `/scripts/07_downloads_for_data-release.R` Downloads the .tif files created
by `exports_for_data-release.js`.
* `/scripts/08_area-figures.R` Using dataframes created in `07_ca_transition-class_area.R`,
bar-charts and similar figures are created that show area summaries (e.g., the amount of
stable core, etc. under given scenarios).
* `/scripts/08_data-release.R` Compiles the tiles downloaded by `07_downloads_for_data-release.R` and properly formats the .tif files into
cloud optimized geotiffs. These are the files that were published in the data-release
(note they were first renamed using `rename_rasters.R`).
* `/scripts/09_area-tables.R` Creates clean output csv file of tables showing
the amount of area (in ha and as % of total), of various change categories, by scenario. The values
of this csv are included in an appendix that accompanies the manuscript.
* `/scripts/09_maps.R` Using output from `08_area-figures.R` and
`06_exports_for_mapsl.js` creates all figures (in many body of 
manuscript and appendices) that contain maps. 
* `/scripts/matching-quality.R` This script creates maps of 'matching quality',
that show how well a given grid-cell matches (climatically) with the site from
which the data were interpolated (i.e., one of the 200 sites where STEPWAT2 simulations
were conducted). Figures appear in the supplemental materials of Holdrege et al. 2024. 
* `/scripts/rename_rasters.R` Renames tif files outputted by `08_data-release.R`, to 
make the final file names used in the data release more human readable. 
* `/scripts/rgb_triangle.R` Creates a 'red-green-blue' triangle image
that is added to some figures in the `09_maps.R` script. 

### `/src` folder

* `/src/fig_params.js` Contains parameters (color vectors etc.) used in visualizations created in
GEE. 
* `/src/fig_params.R` Contains axis labels, colors, etc. used in figures created with R
* `/src/figure_functions.R` Functions for figure creation. 
* `/src/Functions__DisplayItems.R` Functions for map creation, these are functions
written by D. Schlaepfer (that are now part of an R package he developed)
* `/src/general_functions.R` misc. R functions used in various scripts
* `/src/loadClimateData.js` functions that load interpolated climate layers (which are GEE assets).
These layers helped us understand trends in the data, and how to interpret the interpolation
(i.e. these layers were created via matchng the same way that the stepwat2 biomass data
was interpolated). These layers were not included in any final analysis. 
* `/src/paths.R` File path(s) used in other scripts. 
* `/src/qCurves4StepwatOutput2.js` Provides the slopes and intercepts for cover vs biomass equations
* `/src/SEIModule.js` Contains many functions used in almost all the .js scripts
* `/src/spatial_functions.R` Functions for certain spatial data operations


## A note on git

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

