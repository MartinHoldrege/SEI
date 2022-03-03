# Martin Holdrege

# Script started 2/25/2022

# Purpose: create maps of transitions in sagebrush ecosystem integrity
# from current to future conditions. These are 9 classes.

# Next steps
# --update colors to match the newer map that John has
# but make impacted becomes core a mustard yellow
# and make the one blue color a deeper blue

# also add a background (state polygon) to these maps. 

# dependencies ------------------------------------------------------------

library(terra)
library(tmap)
source("src/fig_params.R")

# read in data ------------------------------------------------------------

# current to future SEI transition, file created in
# 02_SE_transitions_current-vs-future.js
c9 <- rast("data_processed/transitions/SEIv11_9ClassTransition_1000_byScenario_median_20220224.tif")


# visualization params ----------------------------------------------------

c9Palette = c(   '#000000', # stable core (black)
                 '#64AC46', # core becomes grow
                 '#ABAB4B', # core becomes impacted
                 '#2159B0', # grow becomes core
                 '#757170', # stable grow
                 '#F0FA77', # grow becomes impacted
                 '#7698D8', # impacted becomes core
                 '#B1CE94', # impacted becomes grow
                 '#D9D9D9') # stable impacted


# maps --------------------------------------------------------------------


bands <- names(c9)
c9[c9==0] <- NA # 0s are the values that were originally masked


tmap_mode('plot')

# the 1000 refers to the resolution
pdf("figures/transition_maps/c9_transition_1000_byScenario_v1.pdf")

for (i in seq_along(bands)) {
print(
  tm_shape(shp = c9[bands[i]]) +
    tm_raster(
      title = "Transition",
      breaks = -0:9 + 0.5,
      palette = c9Palette,
      labels = c9Names
    ) +
    tm_layout(
      legend.outside = TRUE,
      legend.text.size = 0.75,
      main.title = bands[i],
      main.title.size = 0.75
    ) +
    tmap_options( # increase number of pixels plotted
      max.raster = c(plot = 1e10, view = 1e6)
    )
)
}

dev.off()
