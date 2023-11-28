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
library(patchwork)
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



# *figures ----------------------------------------------------------------

# boxplot created in 07_ca_transition-class_area.R
box_l <- readRDS("figures/area/c9_area_barplot_by-scenario.RDS")

# make sure boxplot used the same scenarios/runs
stopifnot(box_l$run == root_c9,
          box_l$years == years_c9,
          box_l$RCP == rcp_c9)

# fig params --------------------------------------------------------------

c9Palette2 <- unname(c('transparent', c9Palette))

# c9 maps -----------------------------------------------------------------

#tmp <- spatSample(r_c9, c(500, 500), method = 'regular', as.raster = TRUE)

g1 <- plot_map2(as.factor(r_c9)) +
  labs(subtitle = fig_letters[1])+
  scale_fill_c9() +
  theme(legend.position = 'none')

g2 <- g1 +
  inset_color_matrix()

comb <- g2/box_l$fig + plot_layout(heights = c(3, 1))

jpeg(paste0(paste('figures/transition_maps/c9_with-barplot', version, root_c9, rcp_c9, years_c9, sep = "_"), '.jpg'), 
     width = 6, height = 10.5, units = 'in',
     res = 600)
comb
dev.off()
