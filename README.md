# Overview

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.12775518.svg)](https://doi.org/10.5281/zenodo.12775518)

Analysis of sagebrush ecological integrity responses to climate change. 

This is the branch of this repository that provides the scripts used for the analyses presented
in Holdrege et al. 2024 (Rangeland Ecology and Management) and used to create the data files
for the accompanying data-release. 

Manuscript:
Holdrege, M.C., K.A. Palmquist, D.R. Schlaepfer, W.K. Lauenroth, C.S. Boyd, M.K. Creutzburg, M.R. Crist, K.E. Doherty, T.E. Remington, J.C. Tull, L.A. Wiechman, J.B. Bradford,  2024. Climate Change Amplifies Ongoing Declines in Sagebrush Ecological Integrity. Rangeland Ecology & Management, 97:25–40 https://doi.org/10.1016/j.rama.2024.08.003

Data release:
Holdrege, M.C., Schlaepfer, D.R., Palmquist, K.A., Theobald, D.M., and Bradford, J.B., 2024, Current and projected sagebrush ecological integrity across the Western U.S., 2017-2100: U.S. Geological Survey data release,
https://doi.org/10.5066/P13RXYZJ

## A note on reproducibility

The reason for making this code publicly available is so that folks interested in the 
details of our methods can
see the exact analysis steps and decisions we made. Additionally, the code may
be useful as an example for others 
trying to tackle similar problems. The products of this analysis were
all published in a data release on science base (see Holdrege et al.). However, some of the input datasets
used in the scripts described below
are not published datasets (and are read in as Google Earth Engine [GEE] assets in these scrips). These
assets cannot be read in by others because they do not have public read permissions.
Therefore, most of the sequence of scripts described below cannot be run by you in their current
state because not all the inputs are provided. However, please contact us if you
are interested in accessing GEE assets or have other data or code questions. 

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


# R versioning

Much of the R scripts were run using R v4.3

My current R session version and package info (which is suitable for re-running
these scripts) is:

  
R version 4.4.0 (2024-04-24 ucrt)
Platform: x86_64-w64-mingw32/x64
Running under: Windows 10 x64 (build 19045)

Matrix products: default


locale:
[1] LC_COLLATE=English_United States.utf8  LC_CTYPE=English_United States.utf8   
[3] LC_MONETARY=English_United States.utf8 LC_NUMERIC=C                          
[5] LC_TIME=English_United States.utf8    

time zone: America/Denver
tzcode source: internal

attached base packages:
[1] stats     graphics  grDevices utils     datasets  methods   base     

other attached packages:
 [1] mgcv_1.9-1      nlme_3.1-164    lubridate_1.9.3 forcats_1.0.0   stringr_1.5.1   dplyr_1.1.4     purrr_1.0.2    
 [8] readr_2.1.5     tidyr_1.3.1     tibble_3.2.1    ggplot2_3.5.1   tidyverse_2.0.0 patchwork_1.2.0

loaded via a namespace (and not attached):
 [1] gtable_0.3.5       rstatix_0.7.2      lattice_0.22-6     tzdb_0.4.0         vctrs_0.6.5       
 [6] tools_4.4.0        generics_0.1.3     parallel_4.4.0     proxy_0.4-27       fansi_1.0.6       
[11] pkgconfig_2.0.3    Matrix_1.7-0       KernSmooth_2.23-24 RColorBrewer_1.1-3 lifecycle_1.0.4   
[16] farver_2.1.2       compiler_4.4.0     munsell_0.5.1      terra_1.7-78       janitor_2.2.0     
[21] codetools_0.2-20   snakecase_0.11.1   carData_3.0-5      stars_0.6-5        class_7.3-22      
[26] crayon_1.5.2       pillar_1.9.0       car_3.1-2          ggpubr_0.6.0       classInt_0.4-10   
[31] magick_2.8.3       abind_1.4-5        tidyselect_1.2.1   stringi_1.8.4      sf_1.0-16         
[36] labeling_0.4.3     splines_4.4.0      grid_4.4.0         colorspace_2.1-0   cli_3.6.2         
[41] magrittr_2.0.3     utf8_1.2.4         broom_1.0.6        e1071_1.7-14       withr_3.0.0       
[46] scales_1.3.0       backports_1.5.0    bit64_4.0.5        timechange_0.3.0   bit_4.0.5         
[51] ggsignif_0.6.4     hms_1.1.3          rlang_1.1.3        Rcpp_1.0.12        glue_1.7.0        
[56] DBI_1.2.2          rstudioapi_0.16.0  vroom_1.6.5        R6_2.5.1           units_0.8-5    


