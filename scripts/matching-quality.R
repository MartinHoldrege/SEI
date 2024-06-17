# Purpose:
# plot matching quality from interpolation 
#  script, 
# and plot it over core and grow areas

# Author: Martin Holdrege

# Script started June 12, 2024


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
library(patchwork)
source("src/spatial_functions.R")
source("src/figure_functions.R")

# load data ---------------------------------------------------------------

template <- rast("../grazing_effects/data_processed/interpolation_data/cellnumbers.tif")
# matching quality (calculated in the grazing_effects/scripts/03_interpolate.r)
# where matching was done use study area wide criteria, but matching quality
# calculated via criteria used in Renne et al 2024
qual1 <- read_csv('../grazing_effects/data_processed/interpolation_data/match-qual_v1-interp_v3-criteria.csv')

# c9 layer (to convert to c3)
c9 <- rast('data_processed/transitions/vsw4-3-4_9ClassTransitionMed_180_fire1_eind1_c4grass1_co20_2311.tif')

# temp (for testing)
# c9 <- resample(c9, template)
# prepare layers ----------------------------------------------------------

# *c3 ---------------------------------------------------------------------
c9 <- c9[['RCP45_2070-2100']]
c3 <- subst(c9, 
            from = c(1, 2, 3, 4, 5, 6, 7, 8, 9, 0),
            to   = c(1, 1, 1, 2, 2, 2, 3, 3, 3, NA))
# * matching quality ------------------------------------------------------
# this is the 'mask' at 180 m resolution

r_qual1 <- fill_raster(df = qual1, template = template)
r_qual2 <- resample(r_qual1, c3)
r_qual3 <- terra::mask(r_qual2, c3) # scd mask

# masking to just show core or grow
r_qual_core <- terra::mask(r_qual2, c3, maskvalues = c(NA, 2, 3))
r_qual_grow <- terra::mask(r_qual2, c3, maskvalues = c(NA, 1, 3))
plot(r_qual_grow)

# figures of matching quality ---------------------------------------------

cols <- rev(RColorBrewer::brewer.pal(10, 'RdBu'))[3:9]

match_fill <- function() {
  binned_scale(aesthetics = "fill",
               scale_name = "stepsn", 
               palette = function(x) cols,
               breaks = c(0.5, 1, 1.5, 2, 3, 5),
               labels = c(0.5, 1, 1.5, 2, 3, 5),
               name = 'Match quality',
               na.value = 'transparent',
               limits = c(0, 10),
               guide = "colorsteps"
  )
}

g1 <- plot_map2(r_qual_core,
          panel_tag = 'Matching quality in CSAs') +
  match_fill() 


g2 <- plot_map2(r_qual_grow,
          panel_tag = 'Matching quality in GOAs') +
  match_fill() 

g3 <- plot_map2(r_qual3,
          panel_tag = 'Matching quality across study area') +
  match_fill()

jpeg('figures/matching_quality/match-qual_Renne-criteria.jpg',
     res = 800, width = 8, height = 8, units = 'in')
design <- "
AB
C#
"
g1 + g2 + g3 + patchwork::plot_layout(design = design) +
  plot_annotation(caption = 'Matching quality calculated using Criteria from Renne et al. 2024')
dev.off()
