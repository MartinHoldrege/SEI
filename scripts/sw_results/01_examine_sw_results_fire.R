# Martin Holdrege

# Started: July 24, 2023

# Purpose: Map and examine  fire probability from stepwat


# dependencies ------------------------------------------------------------

library(terra)
library(tidyverse)
library(stars)
library(patchwork)
source("../grazing_effects/src/general_functions.R")
source("../grazing_effects/src/fig_params.R")
source("src/figure_functions.R")
source("src/Functions__DisplayItems.R")
source("src/general_functions.R")

# params ------------------------------------------------------------------

runs <- c('fire1_eind1_c4grass1_co20', 
          'fire1_eind1_c4grass1_co21')
date <- "20230822"

graze_levels <- c("grazL" = "Light")

# Read in data ------------------------------------------------------------

# selecting which rasters to load
# interpolated rasters of stepwat data
path_r <- "../grazing_effects/data_processed/interpolated_rasters"


# * median fire probability (across GCMs) --------------------------------------------

paths <- list.files(path_r, full.names = TRUE,
                    pattern = 'fire-prob_future_median_across_GCMs.tif') %>% 
  str_subset(pattern = paste("(", runs, ")", collapse = "|", sep = "")) 


r1 <- rast(paths)

into <- c("type", "RCP", "years", 
          "graze")
info1 <- create_rast_info(r1, into = into)

info1 <- info1 %>% 
  filter(graze %in% graze_levels)

r2 <- r1[[info1$id]]

# *median delta fire-prob ---------------------------------------------------

# raw difference relative to historical climate conditions
paths_rdiff <- list.files(path_r, full.names = TRUE,
                          pattern = 'fire-prob-rdiff-cref_median') %>% 
  str_subset(pattern = paste("(", runs, ")", collapse = "|", sep = "")) 

rdiff1 <- rast(paths_rdiff)

info_rdiff1 <- create_rast_info(rdiff1, into = into)%>% 
  filter(graze %in% graze_levels) %>% 
  # for exploratory reasons just looking at the most and least
  # extreme scenarios
  filter_clim_extremes()

# Figures -----------------------------------------------------------------

# combining difference and absolute biomass
info_c1 <- bind_rows(info1, info_rdiff1) %>% 
  filter_clim_extremes() %>% 
  mutate(type = fct_rev(factor(type))) %>% 
  arrange(run, RCP, type, years)

r_c1 <- c(r2, rdiff1) # combined raster


# maps of biomass and raw difference --------------------------------------
# One big map on the left of historical biomass, and 4 panels on the left
# showing 2 future time periods and for each time period 1 map shows
# biomass the other shows delta biomass
info_c_l <- info_c1 %>% 
  group_by(run2) %>% 
  group_split() # split into list

# ranges for axes
# ids for all runs for this PFT
fire_id_all <- info_c1 %>% 
  filter(type == 'fire-prob') %>% 
  pull(id)

diff_id_all <- info_c1 %>% 
  filter(type != 'fire-prob') %>% 
  pull(id)

# want to get range across run types so that figures will
# have comparable colors across runs for given pft
range_f <- range(as.numeric(minmax(r_c1[[fire_id_all]])))
range_d0 <- range(as.numeric(minmax(r_c1[[diff_id_all]])))
m <- max(abs(range_d0)) # for colour gradient b/ can't sent midpoint
range_d <- c(-m, m)

title_diff <- "\u0394 # fires/century" # delta

# using cair_pdf so 'delta' symbol printed
cairo_pdf(paste0("figures/fire/sw_maps_fire-prob-rdiff-cref_", date, ".pdf"),
          width = 12, height = 7, onefile = TRUE)
for(df in info_c_l){
  print(df$id[1])
  fire_id <- df$id[df$type == 'fire-prob']
  diff_id <- df$id[df$type != 'fire-prob']
  stopifnot(length(fire_id) == 3)
  stopifnot(length(diff_id) == 2)
  
  # plots of biomass
  maps_fire1 <- map(fire_id, function(id) {
    
    d <- create_rast_info(id, into = into)
    
    plot_map_inset(r = r_c1[[id]],
                   colors = cols_firep,
                   tag_label = paste("Fire probability", rcp_label(d$RCP, d$years)),
                   limits = range_f,
                   scale_name = lab_firep0)
    
  })
  
  # maps of biomass difference (for each time period)
  maps_diff1 <- map(diff_id, function(id) {
    
    d <- create_rast_info(id, into = into)
    
    plot_map_inset(r = r_c1[[id]],
                   colors = rev(cols_map_bio_d),
                   tag_label = paste(title_diff, rcp_label(d$RCP, d$years)),
                   limits = range_d,
                   scale_name = lab_firep1)
    
  })
  
  # combining the plots
  p <- maps_fire1[[1]] + ((maps_fire1[[2]] + maps_diff1[[1]])/(maps_fire1[[3]] + maps_diff1[[2]])) 
  
  p2 <- (p + plot_layout(guides = 'collect'))&
    theme(legend.position = 'bottom')
  
  p3 <- p2+
    patchwork::plot_annotation(caption = paste('simulation settings:',  df$run2))
  print(p3)
}


dev.off()

