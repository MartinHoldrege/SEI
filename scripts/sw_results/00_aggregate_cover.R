# Purpose taking smoothed 30 m RAP/RCMAP cover and project to 1 km grid
# putting this in it's own script b/ the code is slow (~1 hour to run)

# Author: Martin Holdrege

# Date started: Aug 1, 2023


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/paths.R")


# Read in data ------------------------------------------------------------


# *'snap raster' ----------------------------------------------------------

# to get the resolution, etc to sample the RAP data to
sw1 <- rast("../grazing_effects/data_processed/interpolated_rasters/fire1_eind1_c4grass1_co20_bio_future_median_across_GCMs.tif")

# *RAP/RCMAP --------------------------------------------------------------

# smoothed cover for the 2017-2020 time period. These are the layers
# outputted by Dave T. 
files_cov <- list.files(
  path = file.path(path_large, "SEI_rasters/WAFWA30mdata"),
  pattern = "2017_2020.*560m",
  full.names = TRUE
)

rap_aherb1 <- files_cov %>% 
  str_subset("annual") %>% 
  vrt()

cov_pft <- c("sagebrush" = "sage", "pfg" = "perennial", "afg" = "annual")

# list of rasters
cov_l1 <- map2(cov_pft, names(cov_pft), function(pft, pft_name) {
  out <- files_cov %>% 
    str_subset(pft) %>% 
    vrt()
  names(out) <- pft_name
  out
})

cov1 <- rast(cov_l1)

# *SEI classification -----------------------------------------------------
# also using this as a mask
files_sc3 <- list.files(
  path = file.path(path_large, "SEI_rasters/WAFWA30mdata"),
  pattern = "2017_2020.*Q5sc3",
  full.names = TRUE
)

sc3a <- vrt(files_sc3)
names(sc3a) <- "sc3"

# prepare rasters ---------------------------------------------------------


# * cover -----------------------------------------------------------------

# masking before projecting to a coarser resolution, so that only rangeland
# 30m pixels are aggregated into 1km grid-cells. 
cov2 <- terra::mask(cov1, sc3a, maskvalues = c(NA, 0))
cov3 <- project(cov2, sw1[[1]], method = 'average', threads = TRUE)
names(cov3) <- paste0(c("cov_", "cov_", "cov_"), names(cov2))


# save output -------------------------------------------------------------

writeRaster(cov3, "data_processed/cover/cover_SEIv11_2017_2020_1km_560msmooth_20211228.tif")
