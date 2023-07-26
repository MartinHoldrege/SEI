# Martin Holdrege

# Started: July 24, 2023

# Purpose: Map and examine stepwat inputs to future SEI calculation
# (i.e. biomass of annuals, perennials, and sagebrush)


# dependencies ------------------------------------------------------------

library(terra)
library(tidyverse)
library(stars)
source("../grazing_effects/src/general_functions.R")
source("src/basemaps.R")


# params ------------------------------------------------------------------

graze_levels <- c("grazL" = "Light")
# PFTs for which to keep data when reading in
PFTs <- c("Sagebrush", "Pherb", "Cheatgrass", "Aforb")
# PFTs for which to plot (herb calculated in code below)
PFTs2plot <-  c("Sagebrush", "Pherb", "Aherb")
runs <- c('fire1_eind1_c4grass1_co20')

# Read in data ------------------------------------------------------------

# selecting which rasters to load
# interpolated rasters of stepwat data
path_r <- "../grazing_effects/data_processed/interpolated_rasters"


# * median biomass (across GCMs) --------------------------------------------


paths <- list.files(path_r, full.names = TRUE,
                    pattern = 'bio_future_median_across_GCMs.tif') %>% 
  str_subset(pattern = paste("(", runs, ")", collapse = "|", sep = "")) 


r1 <- rast(paths)

into <- c("PFT", "type", "RCP", "years", 
          "graze")
info1 <- create_rast_info(r1, into = into)

info1 <- info1 %>% 
  filter(graze %in% graze_levels,
         PFT %in% PFTs)

r2 <- r1[[info1$id]]


# *median delta biomass ---------------------------------------------------

# raw difference relative to historical climate conditions
paths_rdiff <- list.files(path_r, full.names = TRUE,
                    pattern = 'bio-rdiff-cref_median') %>% 
  str_subset(pattern = paste("(", runs, ")", collapse = "|", sep = "")) 

rdiff1 <- rast(paths_rdiff)

info_rdiff1 <- create_rast_info(rdiff1, into = into)%>% 
  filter(graze %in% graze_levels,
         PFT %in% PFTs)

# calculate total annual herbacious ---------------------------------------

# raw biomass raster
info1_cheat <- info1 %>% 
  filter(PFT == 'Cheatgrass') %>% 
  arrange(id)

info1_aforb <- info1 %>% 
  filter(PFT == 'Aforb') %>% 
  arrange(id)

stopifnot( # confirm adding the matching layers together
  all.equal(info1_aforb[, c("run2", "type", "RCP", "years")], 
            info1_cheat[, c("run2", "type", "RCP", "years")])
)

r_ahorb <- r2[[info1_cheat$id]] + r2[[info1_aforb$id]]



names(r_ahorb) <- names(r_ahorb) %>% 
  str_replace("Cheatgrass", "Aherb")

r3 <- c(r2, r_ahorb)
info2 <- create_rast_info(r3, into = into)

# biomass difference raster
info_rdiff_cheat <- info_rdiff1 %>% 
  filter(PFT == 'Cheatgrass') %>% 
  arrange(id)

info_rdiff_aforb <- info_rdiff1 %>% 
  filter(PFT == 'Aforb') %>% 
  arrange(id)

stopifnot( # confirm adding the matching layers together
  all.equal(info_rdiff_cheat[, c("run2", "type", "RCP", "years")], 
            info_rdiff_aforb[, c("run2", "type", "RCP", "years")])
)

rdiff_aforb <- rdiff1[[info_rdiff_cheat$id]] + rdiff1[[info_rdiff_aforb$id]]

names(rdiff_aforb) <- names(rdiff_aforb) %>% 
  str_replace("Cheatgrass", "Aforb")

rdiff2 <- c(rdiff1, rdiff_aforb) 
info_rdiff2 <- create_rast_info(rdiff2, into = into) 

# Figures -----------------------------------------------------------------

# combining difference and absolute biomass
info_c1 <- bind_rows(info2, info_rdiff2) %>% 
  filter((type == "biomass" & RCP == "Current")|
           (type != "biomass" & RCP != "Current"),
         PFT %in% PFTs2plot) %>% 
  mutate(type = fct_rev(factor(type))) %>% 
  arrange(run, PFT, type, RCP, years)

r_c1 <- c(r3, rdiff2) # combined raster

s <- st_as_stars(rdiff2[[1]], ignore_file = TRUE, as_attributes = FALSE)


ggplot() +
  geom_stars(data = s) +
  basemap1()

bio_maps1 <- map(info_c1$id[info_c1$type == 'biomass'], function(id) {
  s <- st_as_stars(r_c1[[id]])
  ggplot() +
    geom_stars(data = s)+
    basemap1()+
    labs(subtitle = id) +
    theme(legend.title = element_text())
})
bio_maps1
