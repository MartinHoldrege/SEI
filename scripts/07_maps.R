# Purpose: Create maps for the manuscript

# Author: Martin Holdrege

# Started: November 21, 2023


# params ------------------------------------------------------------------

download <- FALSE # re-download files from drive?
resolution <- 500 # resolution of the rasters
version <- 'vsw4-3-3'

# paramaters specific to the c9 map
root_c9 <- 'fire1_eind1_c4grass1_co20_2311'
years_c9 <- '2070-2100'
rcp_c9 <- 'RCP45'

# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/general_functions.R")
source('src/figure_functions.R')
# load data ---------------------------------------------------------------

# *c9 ---------------------------------------------------------------------

# file created in 06_exports_for_maps.js
file_regex <- paste0(version, '_9ClassTransition_', resolution, '_', root_c9, '_', 
                     rcp_c9, '_', years_c9, '.tif')

if(download) {
  files1 <- drive_ls_filtered(path = "gee", file_regex = file_regex)
  files1
  
  drive_download_from_df(files1, 'data_processed/transitions')
}

p1 <- newest_file_path('data_processed/transitions',
                       file_regex)

r_c9 <- rast(p1)


# c9 maps -----------------------------------------------------------------
# continue here--colors not working!
tmp <- spatSample(r_c9, c(500, 500), method = 'regular', as.raster = TRUE)
plot_map2(as.factor(tmp)) +
  scale_fill_manual(values = (c9Palette), na.value = 'transparent')
  
  scale_fill_gradientn(colors = unname(c9Palette), breaks = 1:10 - 0.5)
