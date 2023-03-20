# Martin Holdrege

# Started March 20, 2023

# Purpose--compile upscaled stepwat biomass from rasters into into a dataframe
# to use in downstream scripts. 


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/spatial_functions.R")

# read in data -------------------------------------------------------------

# for now using older upscaled data
dir_rast <- "../grazing_effects/data_processed/interpolated_rasters/biomass/"

files_afg <- paste0("c4on_", c("Aforb", "Cheatgrass"),
                    "_biomass_Current_Current_Light_Current.tif")

files_pfg <- "c4on_Pherb_biomass_Current_Current_Light_Current.tif"
files_sage <- "c4on_Sagebrush_biomass_Current_Current_Light_Current.tif"

r_afg <- rast(file.path(dir_rast, files_afg))
r_pfg <- rast(file.path(dir_rast, files_pfg))
r_sage <- rast(file.path(dir_rast, files_sage))

# compile dataframe --------------------------------------------------------

r_afg2 <- sum(r_afg) # summing across cheatgrass and annual forbs

r_list <- list(afg = r_afg2, pfg = r_pfg, sage = r_sage)

df1 <- map_dfr(r_list, get_values, .id = "PFT") %>% 
  rename(biomass = value) 


# to be used in downstream scripts ----------------------------------------

sw_bio_cur <- df1 # stepwat biomass under current conditions
