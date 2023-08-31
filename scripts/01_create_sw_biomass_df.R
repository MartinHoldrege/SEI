# Martin Holdrege

# Started March 20, 2023

# Purpose--compile upscaled stepwat biomass from rasters into into a dataframe
# to use in downstream scripts. 


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/spatial_functions.R")

# read in data -------------------------------------------------------------

runs <- c('fire1_eind1_c4grass1_co20', 'fire1_eind1_c4grass1_co21')
names(runs) <- runs

# for now using older upscaled data
dir_rast <- "../grazing_effects/data_processed/interpolated_rasters/biomass/"

s <- "_biomass_Current_Current_Light_Current.tif"

files_afg <- map(runs, \(x) {paste0(x, c("_Aforb", "_Cheatgrass"), s)})
files_pfg <- map(runs, \(x) {paste0(x, "_Pherb", s)})
files_sage <- map(runs, \(x) {paste0(x, "_Sagebrush", s)})


r_afg <- map(files_afg, \(x) {
    r <- rast(file.path(dir_rast, x))
    out <- sum(r)# summing across aforb and cheatgrass
    names(out) <- names(r)[1] %>% str_replace("Aforb", "Aherb")
    out
})
r_pfg <- map(files_pfg, \(x) {rast(file.path(dir_rast, x))})
r_sage <- map(files_sage, \(x) {rast(file.path(dir_rast, x))})

# compile dataframe --------------------------------------------------------

r_comb <- c(r_afg, r_pfg, r_sage) %>% 
  unname() %>% # so that raster takes layer names not list element names
  rast()

pft_lookup <- c("Aherb" = 'afg', "Pherb" = "pfg", "Sagebrush" = "sage")

df1 <- map_dfr(names(r_comb), function(x) {
  PFT_name <- str_extract(x, "(?<=co2._)[[:alpha:]]+")
  out <- get_values(r_comb, lyr = x) %>% 
    # extracing the simulation settings (i.e. run)
    mutate(run = str_extract(x, "^fire.+co2."),
           # renaming the pft's for layter use
           PFT = pft_lookup[PFT_name]) %>% 
    rename(biomass = value) 
  out
})


# to be used in downstream scripts ----------------------------------------

sw_bio_cur <- df1 # stepwat biomass under current conditions
