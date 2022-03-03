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

library(tidyverse)
library(terra)
library(tmap)
library(spData) # for us_states polygon
source("src/fig_params.R")

# read in data ------------------------------------------------------------

# current to future SEI transition, file created in
# 02_SE_transitions_current-vs-future.js
c9 <- rast("data_processed/transitions/SEIv11_9ClassTransition_1000_byScenario_median_20220224.tif")


# create 9 color matrix ---------------------------------------------------
# Creating a 3x3 colored matrix of current and future SEI classes,

c3_levels <- c('CSA', 'GOA', 'ORA')

# c9 levels, with there associated current and future SEI categories
df_c9 <- tibble(
  c9Name  = c9Names, 
  c9Value = 1:9,
  current = rep(c3_levels, each = 3), # Current SEI (3 levels)
  future = rep(c3_levels, 3) # future SEI (3 levels)
 ) %>% 
  mutate(
    current = factor(current, levels = rev(c3_levels)),
    future = factor(future, levels = c3_levels)
  )

# Adding label column (category of change)
df_c9$label <- NA
df_c9$label[c(1, 5, 9)] <- "Stable"
df_c9$label[c(2, 3, 6)] <- "Declining"
df_c9$label[c(4, 7, 8)] <- "Increasing"

df_c9

# color of text in color matrix
text_color <- rep('black', 9)
text_color[c(1, 5)] <- 'white' # background is dark
names(text_color) <- c9Names

color_matrix <- ggplot(df_c9, aes(future, current, fill = c9Name)) +
  geom_tile() +
  geom_text(aes(label = label, color = c9Name)) +
  theme_minimal() +
  scale_x_discrete(position = 'top') +
  scale_fill_manual(values = c9Palette) +
  labs(x = "Future condition",
       y = "Current condition") +
  scale_color_manual(values = text_color)+
  theme(panel.grid = element_blank(),
        legend.position = 'none')
color_matrix
png("figures/c9_color_matrix.png",
     width = 3.5, height = 2.5, units = 'in',
     res = 600)
color_matrix
dev.off()

# maps --------------------------------------------------------------------
# Maps color coded by transition category, for each climate scenario 

bands <- names(c9)
c9[c9==0] <- NA # 0s are the values that were originally masked


tmap_mode('plot')

# creating a larger bounding box
bbox <- tmaptools::bb(x = raster::raster(c9), ext = 1.05) 
bbox['xmin'] <- bbox['xmin'] - 5 # extend left margin of bbox


# the 1000 refers to the resolution
pdf("figures/transition_maps/c9_transition_1000_byScenario_v2.pdf")
# creating one map for each climate scenario (band in the raster)
for (i in seq_along(bands)) {
  map <- tm_shape(shp = c9[bands[i]], bbox = bbox) +
    tm_raster(
      title = "Transition",
      breaks = -0:9 + 0.5,
      palette = c9Palette,
      legend.show = FALSE
    ) +
    tmap_options( # increase number of pixels plotted
      max.raster = c(plot = 1e10, view = 1e6) 
    ) +
    tm_logo("figures/c9_color_matrix.png",
            position = c("LEFT", "BOTTOM"), height = 7) +
  tm_shape(us_states) +
    tm_borders() +
  tm_layout(
    legend.outside = TRUE,
    legend.text.size = 0.75,
    main.title = bands[i],
    main.title.size = 0.75,
    frame = FALSE) 
  
  print(map)
}      
dev.off()

