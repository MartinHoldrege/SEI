# Martin Holdrege

# Started: July 24, 2023

# Purpose: Map and examine stepwat inputs to future SEI calculation
# (i.e. biomass of annuals, perennials, and sagebrush)


# dependencies ------------------------------------------------------------

library(terra)
library(tidyverse)
library(stars)
source("../grazing_effects/src/general_functions.R")
source("../grazing_effects/src/fig_params.R")
source("src/figure_functions.R")
source("src/Functions__DisplayItems.R")
source("src/general_functions.R")

# params ------------------------------------------------------------------

graze_levels <- c("grazL" = "Light")
# PFTs for which to keep data when reading in
PFTs <- c("Sagebrush", 'C4Pgrass', "C3Pgrass", "PGrass", "Pforb", "Pherb", "Cheatgrass", "Aforb")
# PFTs for which to plot (herb calculated in code below)
PFTs2plot <- c(PFTs, "Aherb")
runs <- c('fire0_eind1_c4grass1_co20',
          'fire1_eind1_c4grass1_co20', 
          'fire1_eind1_c4grass1_co21')
date <- "20230802"
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



# sum cheatgrass and aforb to get total aherb

# biomass raster
r3 <- calc_aherb(r2, into = into) 
info2 <- create_rast_info(r3, into = into)

# biomass difference raster
rdiff2<- calc_aherb(rdiff1, into = into)
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


# maps of biomass and raw difference --------------------------------------
# One big map on the left of historical biomass, and 4 panels on the left
# showing the change in biomass uncere multiple RCP*time periods
info_c_l <- info_c1 %>% 
  group_by(PFT, run2) %>% 
  group_split() # split into list

# using cair_pdf so 'delta' symbol printed
cairo_pdf(paste0("figures/stepwat/sw_maps_bio-rdiff-cref_", date, ".pdf"),
          width = 11, height = 7, onefile = TRUE)
for(df in info_c_l){
  print(df$id[1])
  bio_id <- df$id[df$type == 'biomass']
  diff_id <- df$id[df$type != 'biomass']
  stopifnot(length(diff_id) == 4)
  
  r_bio <- r_c1[[bio_id]]
  s_bio <- st_as_stars(r_bio)
  r_diff <- r_c1[[diff_id]]
  
  # ids for all runs for this PFT
  bio_id_all <- info_c1 %>% 
    filter(df$PFT[[1]] == PFT,
           type == "biomass") %>% 
    pull(id)
  
  diff_id_all <- info_c1 %>% 
    filter(df$PFT[[1]] == PFT,
           type != "biomass") %>% 
    pull(id)
  
  # want to get range across run types so that figures will
  # have comparable colors across runs for given pft
  range_b <- range(as.numeric(minmax(r_c1[[bio_id_all]])))
  range_d <- range(as.numeric(minmax(r_c1[[diff_id_all]])))
  
  m <- max(abs(range_d)) # for colour gradient b/ can't sent midpoint
  title_diff <- "\u0394 Biomass" # delta
  
  # plot of biomass
  p <- plot_map(s_bio, st_geom_state = states,
           add_coords = TRUE) +
    ggplot2_map_theme() +
    scale_fill_gradientn(na.value = 'transparent',
                         limits = range_b,
                          name = lab_bio0,
                          colors = cols_map_bio(10)) + 
    add_tag_as_label("Biomass (historical)")
  

  inset_bio <- inset_densitycountplot(as.numeric(values(r_bio)),
                                  add_vertical0 = FALSE)
  
  p <- (p + inset_element2(inset_bio)) & theme(legend.position = 'bottom')
  
  # maps of biomass difference (for each time period)
  maps_diff1 <- map(diff_id, function(id) {
    
    inset <- inset_densitycountplot(as.numeric(values(r_diff[[id]])),
                           limits = range_d,
                           add_vertical0 = TRUE)
    
    d <- create_rast_info(id, into = into)
    
    s <- st_as_stars(r_diff[[id]])
    map <- plot_map(s, 
                    st_geom_state = states,
                    add_coords = TRUE) +
      ggplot2_map_theme() +
      scale_fill_gradientn(name = lab_bio1,
                           limits = c(-m, m),
                           na.value = 'transparent',
                           colors = cols_map_bio_d) + 
      add_tag_as_label(paste0(title_diff, " (",d$RCP,", ",d$years, ")")) 
    
    map + inset_element2(inset)
  })
  
  # combining difference maps
  maps_diff2 <- patchwork::wrap_plots(maps_diff1, nrow = 2,
                                   guides = 'collect')&
    theme(legend.position = 'bottom')
  
  
  comb <- p + maps_diff2 +
    patchwork::plot_annotation(df$PFT[1], 
                               caption = paste('simulation settings:', 
                                               df$run2))
  print(comb)
}


dev.off()

