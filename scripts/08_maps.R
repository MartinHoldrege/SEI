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
library(stars)
library(patchwork)
source("src/general_functions.R")
source('src/figure_functions.R')
source('src/rgb_triangle.R')
theme_set(theme_custom1())
# load data ---------------------------------------------------------------

# most tifs exported from 06_exports_for_maps.js
# *c9 ---------------------------------------------------------------------

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

# * c9 diff (fire) ---------------------------------------------------------------
# compare fire1 vs fire0 simulations
# where are c9 transition different? (1 = same transition & same SEI
# 2 = same transition, but fire1 better SEI
# 3 = same transition, but fire1 worse SEI, 4= fire1 better transition, 5 = fire1 worse transition)
file_regex2 <- file_regex %>% 
  str_replace('9ClassTransition', 'c9-diff') %>% 
  str_replace('fire[01]', 'fire01')

if(download) {
 drive_ls_filtered(path = "gee", file_regex = file_regex2) %>% 
    drive_download_from_df('data_processed/transitions')
}

p2 <- newest_file_path('data_processed/transitions',
                       file_regex2)

r_c9diff <- rast(p2)

# * c9 diff (co2) ---------------------------------------------------------------
# compare co21 and co20 simualtions
# where are c9 transition different? (1 = same transition & same SEI
# 2 = same transition, but co21 better SEI
# 3 = same transition, but co21 worse SEI, 4= co21 better transition, 5 = co21 worse transition)
file_regex3 <- file_regex %>% 
  str_replace('9ClassTransition', 'c9-diff') %>% 
  str_replace('co2[01]', 'co201')

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex3) %>% 
    drive_download_from_df('data_processed/transitions')
}

p2 <- newest_file_path('data_processed/transitions',
                       file_regex3)

r_c9diffco2 <- rast(p2)

# * RGB lyr ---------------------------------------------------------------
# layer for visualizing contribution of sagebrush, perennials and annuals to delta SEI

file_regex4 <- file_regex %>% 
  str_replace('9ClassTransition', 'qPropMean') 

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex4) %>% 
    drive_download_from_df('data_processed/ca_lyrs')
}

r_qprop1 <- newest_file_path('data_processed/ca_lyrs', file_regex4) %>% 
  rast()

# * prop diff (q, sei) ----------------------------------------------------
# proportion change of Qs and SEI from current to future

file_regex5 <- file_regex %>% 
  str_replace('9ClassTransition', 'diffProp') 

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex5) %>% 
    drive_download_from_df('data_processed/ca_lyrs')
}

r_diffprop1 <- newest_file_path('data_processed/ca_lyrs', file_regex5) %>% 
  rast()


# *figures ----------------------------------------------------------------

# boxplot created in 07_ca_transition-class_area.R
box_l <- readRDS("figures/area/c9_area_barplot_by-scenario.RDS")

# make sure boxplot used the same scenarios/runs
stopifnot(box_l$run == root_c9,
          box_l$years == years_c9,
          box_l$RCP == rcp_c9)

# boxplot of primary drivers, created in 07_ca_transition-class_area.R
dbox_l <- readRDS("figures/area/c9_driver_barplot_by-run.RDS")

# make sure boxplot used the same scenarios/runs
stopifnot(dbox_l$years == years_c9,
          dbox_l$RCP == rcp_c9)


# fig params --------------------------------------------------------------

c9Palette2 <- unname(c('transparent', c9Palette))
#2 = same transition, but fire1 better SEI
# 3 = same transition, but fire1 worse SEI, 4= fire1 better transition, 5 = fire1 worse transition)
cols_diff <- c('#92c5de', # same transition, but fire1 better SEI
               '#f4a582',# same transition, but fire1 worse SEI
               '#053061', # fire1 better transition
               '#67001f' #fire1 worse transition
               ) 

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


# c9-diff maps ------------------------------------------------------------

base_diff <- function() {
  list(
    theme(legend.position = 'bottom',
          legend.title = element_blank(),
          legend.text = element_text(size = rel(0.6))
          ),
    guides(fill = guide_legend(ncol = 1))
  )
}
# * fire ------------------------------------------------------------------

labels_fire <- c('Better SEI projected when fire incorporated, but same habitat class',
                 'Worse SEI projected when fire incorporated, but same habitat class',
                 'Better SEI & habitat class projected when fire incorporated',
                 'Worse SEI & habitat class projected when fire incorporated')

g <- subst(r_c9diff, from = c(0, 1), to = c(NA, NA)) %>% 
  #spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  as.factor() %>% 
  plot_map2() +
  scale_fill_manual(values = cols_diff,
                    labels = labels_fire,
                    na.value = 'transparent',
                    na.translate = FALSE) +
  base_diff()


name_fire <- file_regex2 %>% 
  str_replace('.tif', '') %>% 
  str_replace(paste0('_c9-diff_', resolution), '')

jpeg(paste0('figures/transition_maps/c9-diff_', name_fire, '.jpg'), 
     width = 5, height = 5, units = 'in',
     res = 800)
g
dev.off()

# * co2 -------------------------------------------------------------------

labels_co2 <- str_replace(labels_fire, 'fire', 'CO2 fertilization')
g2 <- subst(r_c9diffco2, from = c(0, 1), to = c(NA, NA)) %>% 
  #spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  as.factor() %>% 
  plot_map2() +
  scale_fill_manual(values = cols_diff,
                    labels = labels_co2,
                    na.value = 'transparent',
                    na.translate = FALSE) +
  base_diff()


name_co2 <- file_regex3 %>% 
  str_replace('.tif', '') %>% 
  str_replace(paste0('_c9-diff_', resolution), '')

jpeg(paste0('figures/transition_maps/c9-diff_', name_co2, '.jpg'), 
     width = 5.5, height = 5, units = 'in',
     res = 800)
g2
dev.off()


# RGB-maps ----------------------------------------------------------------

# converting to a 'rgb' stars object
s_rgb <- r_qprop1 %>% 
  spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  stars::st_as_stars() %>% 
  stars::st_rgb(maxColorValue = 1)

rgb <- plot_map2(s_rgb)+
  scale_fill_identity()+
  labs(subtitle = fig_letters['a'])
rgb
triangle <- rgb_triangle()
triangle
rgb + grid::grob(triangle)
annotation_custom(triangle)
triangle + ggplotGrob(triangle)
rgb + 
  theme_classic() +
  annotation_custom(ggplotGrob(triangle),
                      ymax = 40)
wrap_elements(rgb, ggplotGrob(triangle))
rgb + 
  inset_element(ggplotGrob(triangle + 
                             theme(text = margin(t = 5.5, r = 20, b = 5.5, l = 20, unit = "pt"))),
                0.002, 0.002, 500 / 1133, 230 / 1236)

 triangle + 
  theme(plot.margin = margin(t = 5.5, r = 100, b = 5.5, l = 20, unit = "pt"))
g <- rgb + 
  patchwork::inset_element(
    ~rgb_triangle(),
    0.002, 0.002, 360 / 1133, 230 / 1236, # left, bottom, right, top in npc units
    align_to = "panel",
    clip = FALSE,
    ignore_tag = TRUE
  )
g
rgb + wrap_elements(panel = ~rgb_triangle())
comb <- rgb/dbox_l$fig + plot_layout(heights = c(3.5, 2))

jpeg(paste0(paste('figures/climate_attribution/maps/rgb_with-barplot', version, root_c9, rcp_c9, years_c9, sep = "_"), '.jpg'), 
     width = 5, height = 9, units = 'in',
     res = 600)
comb
dev.off()


# proportion change maps --------------------------------------------------
lookup_q <- c("Q1raw_median" = "Q1 (Sagebrush)", 
              "Q2raw_median" = "Q2 (Perennials)", 
              "Q3raw_median" = "Q3 (Annuals)", 
              "Q5s_median" = "Sagebrush ecological integrity"
) 

lookup_q[] <- paste(fig_letters[1:length(lookup_q)], lookup_q) # using [] to preservenames 
r_diffprop2 <- r_diffprop1*100 #convert to %

pmax <- as.data.frame(r_diffprop2) %>% 
  map(\(x) max(abs(x), na.rm = TRUE)) %>% 
  unlist() %>% 
  max()

tmp <- r_diffprop2 %>% 
  spatSample(c(500, 500), method = 'regular', as.raster = TRUE) # uncomment for testing

# continue here--look at color ramps from stepwat biomass maps for better color spacing. 
b <- c(25, 15, 10, 5, 1)
breaks <- c(-100, -b, rev(b), 200) 
colors <- RColorBrewer::brewer.pal(length(breaks) - 1, 'RdBu')
length(colors)
labels <- label_creator(breaks)
labels[1] <- paste0('< ', breaks[2])

colors[ceiling(length(breaks)/2)] <- 'grey' # middle color (no significant)

g <- r_diffprop2 %>% 
  #spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  plot_map2(mapping = aes(fill = cut(Q1raw_median, breaks))) +
  facet_wrap(~band,
             labeller = labeller(band = lookup_q)) +
  theme(strip.text = element_text(hjust = 0)) +
  scale_fill_manual(name = '% Change',
                    values = colors,
                    labels = c(labels, ""), # empty label for NA
                    na.value = 'transparent',
                    drop = FALSE) +
  theme(legend.position = 'right')

jpeg(paste0(paste('figures/delta_maps/perc-change_Qs-SEI_', version, root_c9, rcp_c9, years_c9, sep = "_"), '.jpg'), 
     width = 8, height = 8, units = 'in',
     res = 600)
g
dev.off()  

