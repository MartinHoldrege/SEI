# Martin Holdrege

# Script started Feb 21, 2022.

# Purpose is to create scaled change rasters to use when estimate future
# sagebrush ecosystem integrity. Note, that most of the rasters have previously
# been created by John B.
# The point of this script is to make additional rasters from simulations
# with c4 expansion off.

# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)

# read in files -----------------------------------------------------------

# the upscaled biomass rasters are in the grazing_effects project
path_bio <- "../grazing_effects/data_processed/interpolated_rasters/biomass"

# these are the 3 PFTs of interest
pft_levs <- c("Sagebrush", "Pgrass", "Cheatgrass")

# *current biomass -------------------------------------------------------

paths_current <- list.files(path_bio,
                            pattern = "Current_Light")%>% 
  str_subset(paste0("(_", pft_levs, "_)", collapse = "|"))

stopifnot(length(paths_current) == length(pft_levs)) # should only be 3 files

current1 <- rast(file.path(path_bio, paths_current))

# *future biomass --------------------------------------------------------

paths_future <- list.files(path_bio,
                           # light grazing only
                           pattern = "^c4off.*RCP.*_Light") %>% 
  str_subset(paste0("(_", pft_levs, "_)", collapse = "|"))

future1 <- rast(file.path(path_bio, paths_future))


# raster info -------------------------------------------------------------

# names of the rasters
r_names <- list(current = names(current1), 
                future = names(future1))


info1 <- map(r_names, function(x) {
  out <- tibble(id = x,
               id2 = id) %>% 
    # separate the file name into components
    separate(col = id2,
             into = c("c4", "PFT", "type", "RCP", "years", "graze", "GCM"),
             sep = "_")
  out
})


# calculate proportion change ---------------------------------------------


for (i in 1:nrow(info1$future)) {
  row <- info1$future[i, ]
  pft <- row$PFT

  # name of the raster for current conditions
  name_current <- with(info1$current, id[PFT == pft])
  
  # should be only one 'current' raster used for comparison
  stopifnot(length(name_current) == 1) 
  
  out_name <- paste("CheatgrassFireC4off",
                    pft, "ChangePropHistoricalMax", row$RCP, row$years,
                    row$GCM, sep = "_")
  out_name <- paste0(out_name, ".tif")
  print(out_name)
  r_fut <- future1[[row$id]] # future biomass raster
  r_cur <- current1[[name_current]] # current biomass raster
  
  r_change <- r_fut - r_cur # change in biomass
  
  # raster that gives the change in biomass as a proportion of historical
  # maximum
  r_change_prop_hist_max <- r_change/max(values(r_cur), na.rm = TRUE)
  
  writeRaster(r_change_prop_hist_max,
              filename = file.path("data_raw/stepwat_change_rasters",
                                    out_name),
              overwrite = TRUE)
}