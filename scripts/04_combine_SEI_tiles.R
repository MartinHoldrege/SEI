# Author: Martin Holdrege

# Date started 1/11/2023

# Purpose--combine SEI raster tiles. For large rasters
# with multiple layers (e.g. SEI, 5 Q layers), they
# are exported as multiple seperate tiles, here I 
# combine them
# these are assets that were outputted to a gcs bucket
# in 02_write_SEI_to_drive.js

#
# dependencies ------------------------------------------------------------

library(terra)
library(purrr)

# read in data ------------------------------------------------------------

# names of the original earth engine assets
# which each have been split into multipe tiles (.tif)
# that i want to combine together
r_names <- c('SEIv11_1998_2001_30_Current_20220718',
           'SEIv11_2003_2006_30_Current_20220718',
           'SEIv11_2017_2020_30_Current_20220717')
names(r_names) <- r_names

path_l <- map(r_names, function(x) {
  # note--these tiles will be deleted later after
  # I've combined them all (b/ they're 80+ Gb), so this code won't work
  # after that
  list.files("data_processed/SEI_rasters/tiles/",
             pattern = x,
             full.names = TRUE)
})

# list of of virtual raster datasets
vrt_l1 <- map(path_l, vrt)

# combine write/tiles -----------------------------------------------------------

# writing each set of tiles to a single tif
# b/ these rasters are so big this is quite slow (hour+ to complete)
map2(vrt_l1, names(vrt_l1), function(x, name) {
  writeRaster(x, paste0("data_processed/SEI_rasters/",name, "_multiband.tif"))
})

