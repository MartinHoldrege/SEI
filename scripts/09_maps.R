# Purpose: Create maps for the manuscript

# Author: Martin Holdrege

# Started: November 21, 2023


# params ------------------------------------------------------------------

download <- FALSE # re-download files from drive?
resolution <- 500 # resolution of the rasters
version <- 'vsw4-3-4'

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
source('../grazing_effects/src/fig_params.R') # for labels
# source('scripts/rgb_triangle.R') # run this to create rgb triangle png used below
theme_set(theme_custom1())

# functions ---------------------------------------------------------------

# name band based on the run (and replace parts of pattern as necessary)
rename_lyr_by_run <- function(r, path, pattern = '', replacement = '') {
  run <- basename(path) %>% 
    str_extract('fire\\d+_eind\\d+_c4grass\\d+_co2\\d+_{0,1}\\d{0,4}') %>% 
    str_replace_all(pattern = pattern, replacement = replacement)
  names(r) <- run
  r
}
# load data ---------------------------------------------------------------
file_regex <- paste0(version, '_9ClassTransition_', resolution, '_', root_c9, '.tif')

# most tifs exported from 06_exports_for_maps.js
# *c9 ---------------------------------------------------------------------

file_regex0 <- paste0(version, '_9ClassTransitionMed_', 180, '_', root_c9,'.tif')

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex0) %>% 
    drive_download_from_df('data_processed/transitions')
}

p1 <- newest_file_path('data_processed/transitions',
                       file_regex0)

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

r_c9diff <- rast(p2) # %>% 
  # rename_lyr_by_run(p2, pattern = 'fire01', replacement = 'fire0')

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

p3 <- newest_file_path('data_processed/transitions',
                       file_regex3)

r_c9diffco2 <- rast(p3) #%>% 
  #rename_lyr_by_run(p3, pattern = 'co201', replacement = 'co21')

r_c9diff_all <- list(
  
)

# * c9 diff (grass) ---------------------------------------------------------------

file_regex3g <- file_regex %>% 
  str_replace('9ClassTransition', 'c9-diff') %>% 
  str_replace('grass1', 'grass01')

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex3g) %>% 
    drive_download_from_df('data_processed/transitions')
}

p4 <- newest_file_path('data_processed/transitions',file_regex3g)
r_c9diffgrass <- rast(p4) # %>% 
  # rename_lyr_by_run(p4, 'grass01', 'grass0') 
  
# list named by run the default is being compared to. 
r_c9diff_all <- list(
  'fire0_eind1_c4grass1_co20' = r_c9diff,
  'fire1_eind1_c4grass0_co20_2311' = r_c9diffgrass, 
  'fire1_eind1_c4grass1_co21_2311' = r_c9diffco2)# combining rasters


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

# * numGcmGood  ----------------------------------------------------

file_regex6 <- file_regex %>% 
  str_replace('9ClassTransition', 'numGcmGood') 

if(download) {
  drive_ls_filtered(path = "gee", file_regex = file_regex6) %>% 
    drive_download_from_df('data_processed/transitions')
}

r_numGcm1 <- newest_file_path('data_processed/transitions', file_regex6) %>% 
  rast()


# ** area by numGcmGood ---------------------------------------------------

file_regex6a <- paste0("area-by-numGcmGood_\\d+m_", version, "_\\d{8}.csv")

# file created in  06_ca_transition-class_area.js
if(download) {
  drive_ls_filtered(path = "SEI", file_regex = file_regex6a) %>% 
    drive_download_from_df('data_processed/transitions')
}

area_numGcm1 <- newest_file_path('data_processed/transitions', file_regex6a) %>% 
  read_csv()

# * area by c9-diff  ----------------------------------------------------

file_regex7 <- paste0("area-by-c9-diff_\\d+m_", version, "_\\d{8}.csv")

if(download) {
  drive_ls_filtered(file_regex = file_regex7) %>% 
    drive_download_from_df('data_processed/transitions')
}

area_c9diff1 <- newest_file_path('data_processed/transitions', file_regex7) %>% 
  read_csv()

# *figures ----------------------------------------------------------------

# boxplot created in 07_ca_transition-class_area.R
box_l <- readRDS(paste0("figures/area/c9_area_barplot_by-scenario_",
                        version, "_", root_c9, ".RDS"))


# boxplot of primary drivers, created in 07_ca_transition-class_area.R
dbox <- readRDS(paste0("figures/area/c12_driver", "_", version, "_", rcp_c9, 
                       "_", years_c9, ".RDS"))

# created in 'scripts/rgb_triangle.R'
triangle <- magick::image_read('figures/rgb_triangle.png') %>% 
  magick::image_ggplot()

# fig params --------------------------------------------------------------

c9Palette2 <- unname(c('transparent', c9Palette))
#2 = same transition, but fire1 better SEI
# 3 = same transition, but fire1 worse SEI, 4= fire1 better transition, 5 = fire1 worse transition)
cols_diff <- c('grey', # same SEI
                '#92c5de', # same transition, but fire1 better SEI
               '#f4a582',# same transition, but fire1 worse SEI
               '#053061', # fire1 better transition
               '#67001f' #fire1 worse transition
               ) 

# c9 maps -----------------------------------------------------------------

#tmp <- spatSample(r_c9, c(500, 500), method = 'regular', as.raster = TRUE)
g1 <- r_c9[["RCP45_2070-2100"]] %>% 
  spatSample(c(2000, 2000), method = 'regular', as.raster = TRUE) %>% 
  # spatSample(c(100, 100), method = 'regular', as.raster = TRUE) %>% 
  as.factor() %>% 
  plot_map2(panel_tag = fig_letters[1]) +
  # labs(subtitle = fig_letters[1])+
  scale_fill_c9() +
  theme(legend.position = 'none', plot.margin = margin()) +
  inset_color_matrix()

box2 <- box_l$fig +
  labs(subtitle = NULL,
       tag = fig_letters[2]
       ) +
  theme(plot.tag = element_text(face = 'plain'),
        legend.position = c(0.25, 0.8), # c(0.7, 0.8)
        legend.text = element_text(size = ),
        legend.key.size = unit(0.12, 'in'),
         legend.background = element_rect(fill = 'transparent')) # +
#   patchwork::inset_element(
#   color_matrix(),
#     0.005, 0.32, 0.45, 0.97, # left, bottom, right, top in npc units
#     align_to = "panel",
#     clip = TRUE,
#     ignore_tag = TRUE
# )

# box2
comb <- wrap_elements(full = g1)/wrap_elements(full = box2) + plot_layout(heights = c(1.9, 1), tag_level = 'keep') 
# comb
jpeg(paste0(paste('figures/transition_maps/c9_with-barplot', version, root_c9, rcp_c9, years_c9, sep = "_"), '.jpg'), 
     width = 5.5, height = 9, units = 'in',
     res = 600)
comb
dev.off()


# * 4 panel ---------------------------------------------------------------
# 4 panel c9 map, 1 panel for each scenario (for appendix)

r <- r_c9 %>% 
  spatSample(c(2000, 2000), method = 'regular', as.raster = TRUE) %>% 
  subst(from = 0, to = NA) %>% 
  set_all_cats(ID = 1:9, names = c9Names)

names(r) <- names(r) %>% 
  str_replace('_', " ") %>% 
  update_yr() %>% 
  paste(fig_letters[1:4], .)
names(r)
tmp <- plot_map2(st_as_stars(r, as_attributes = FALSE)) +
  scale_fill_manual(values = c9Palette,
                    na.value = 'transparent',
                    na.translate = FALSE) +
  facet_wrap(~band, ncol = 2) +
  theme(strip.text = element_text(hjust = 0),
        legend.position = 'none')

design <- "
11
11
2#
"
comb <- tmp + wrap_elements(color_matrix()) + plot_layout(heights = c(1, 1, 0.5),
                                           widths = c(0.7, 1), 
                                           design=design)
jpeg(paste0(paste('figures/transition_maps/c9_by-scenario', 
                  version, root_c9, sep = "_"), '.jpg'), 
     width = 5, height = 7, units = 'in',
     res = 600)
comb
dev.off()

# c9-diff (vs default) -----------------------------------------------------
# maps showing effects of modelling assumptions

base_diff <- function() {
  list(
    theme(legend.position = 'bottom',
          legend.title = element_blank(),
          legend.text = element_text(size = rel(0.6))
          ),
    guides(fill = guide_legend(ncol = 2))
  )
}

labels <- c('Same SEI (+/- 0.01) projected relative to default, and same habitat class',
            'Better SEI projected relative to default, but same habitat class',
            'Worse SEI projected relative to default, but same habitat class',
            'Better SEI & habitat class projected relative to default',
            'Worse SEI & habitat class projected relative to default')

# preparing raster (converting to factor etc.)
lyr <- "RCP45_2070-2100"



# preparing raster
prepare_r_diff <- function(x) {
  r0 <- x %>% 
    spatSample(c(3000, 3000), method = 'regular', as.raster = TRUE) %>% 
    subst(from = 0, to = NA)
  
  r <- r0 %>% 
    as.factor()
  
  
  # setting the factor levels
  r <- set_all_cats(r, ID = 1:5, names = labels)
  names(r) <- names(x)
  r
}

r0 <- c(r_c9diff[[lyr]], r_c9diffgrass[[lyr]], r_c9diffco2[[lyr]]) 
r <- prepare_r_diff(r0)

let <- fig_letters[1:nlyr(r)]
band_names <- run2name(names(r_c9diff_all)) %>% 
  as.character() %>% 
  str_replace('exp.', 'expansion') %>% 
  str_replace('CO2', "CO2 fertilization")
names(r) <- paste(let, band_names)
#plot(r)

s <- st_as_stars(r, as_attributes = FALSE)


# ** creating map ---------------------------------------------------------


g_map <- plot_map2(s) +
  scale_fill_manual(values = cols_diff,
                    na.value = 'transparent',
                    na.translate = FALSE) +
  facet_wrap(~band, ncol = 2)+
  theme(legend.position = 'bottom',
        legend.title = element_blank(),
        legend.text = element_text(size = rel(0.6)),
        strip.text = element_text(hjust = 0)
  ) +
  guides(fill = guide_legend(ncol = 2))
  
#g_map

# ** creating barchart -------------------------------------------------------
# barchart of areas in the map 
area_c9diff2 <- area_c9diff1 %>% 
  mutate(run = str_replace(run, "_$", ""),
         area_km2 = area_m2/1000^2,
         diffClass = factor(diffClass),
         run_name = run2name(run)) %>%
  select(-"system:index", -".geo", -"area_m2") %>% 
  filter(RCP == rcp_c9,
         years == years_c9)

bar <- ggplot(area_c9diff2, aes(run_name, area_km2, fill = diffClass)) +
  geom_bar(stat = 'identity',
           position = position_dodge()) +
  scale_fill_manual(values = cols_diff) +
  labs(x = "Model assumptions",
       y = lab_areakm0,
       subtitle = fig_letters['d'])+
  scale_y_continuous(labels = scales::comma) +
  theme(legend.position = 'none',
        axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1))


# ** combine --------------------------------------------------------------

comb <- g_map + inset_element(bar,
                      left = 0.52,
                      bottom = 0,
                      right = 0.9,
                      top = 0.5,
                      align_to = "panel",
                      clip = TRUE,
                      ignore_tag = TRUE)

jpeg(paste0('figures/transition_maps/c9-diff_map-bar_', version, 
            "_", rcp_c9, "_", years_c9, '.jpg'), 
     width = 7, height = 8, units = 'in',
     res = 800)
comb
dev.off()


# ** 4 panel --------------------------------------------------------------
# for e.g. diff from default for no grass show for each RCP/time-period


all_f <- map(r_c9diff_all, prepare_r_diff)
all_rename <- map(all_f, rename_bands)
all_s <- map(all_rename, st_as_stars, as_attributes = FALSE)

all_g <- map(all_s, function(s) {
  plot_map2(s) +
    scale_fill_manual(values = cols_diff,
                      na.value = 'transparent',
                      na.translate = FALSE) +
    facet_wrap(~band, ncol = 2)+
    theme(legend.position = 'bottom',
          legend.title = element_blank(),
          legend.text = element_text(size = rel(0.8)),
          strip.text = element_text(hjust = 0)
    ) +
    guides(fill = guide_legend(ncol = 1))
})

map2(all_g, names(all_g), function(g, run) {
  jpeg(paste0('figures/transition_maps/c9-diff_by-scenario_', version, 
              "_", run, '.jpg'), 
       width = 7, height = 8, units = 'in',
       res = 800)
  print(g)
  dev.off()
})



# RGB-maps ----------------------------------------------------------------

# converting to a 'rgb' stars object
s_rgb <- r_qprop1[[paste0('Q', 1:3, "raw_RCP45_2070-2100")]] %>% 
  # for some reason code breaks when not using spatsample
  spatSample(c(3000, 3000), method = 'regular', as.raster = TRUE) %>% 
  #spatSample(c(100, 100), method = 'regular', as.raster = TRUE) %>% 
  stars::st_as_stars() %>% 
  stars::st_rgb(maxColorValue = 1)

rgb <- plot_map2(s_rgb#,
                 #panel_tag = fig_letters[1]
                 )+
  scale_fill_identity()

rgb2 <- rgb + 
  inset_element(triangle,
                0.002, 0.002, 0.25, 0.2,
                align_to = "panel",
                clip = FALSE,
                ignore_tag = TRUE)

dbox2 <- dbox +
  labs(subtitle = NULL
       #tag = fig_letters[2]
       ) +
  theme(plot.tag = element_text(face = 'plain'),
        text = element_text(size = 8),
        strip.text.x.top = element_text(size = 5))
comb <- wrap_elements(full = rgb2) + 
  wrap_elements(full = dbox2) + 
  plot_layout(ncol = 2, widths = c(2, 1.1)) +
  plot_annotation(tag_levels = list(fig_letters[1:2])) &
  theme(plot.tag.position = c(0.06, 0.97),
        plot.tag = element_text(face = 'plain'))
# comb

jpeg(paste0(paste('figures/climate_attribution/maps/rgb_with-barplot', version, 
                  root_c9, rcp_c9, years_c9, sep = "_"), '_v2.jpg'), 
     width = 7.5, height = 5, units = 'in',
     res = 600)
comb
dev.off()


# * 4 panel ---------------------------------------------------------------

scenarios <- names(r_qprop1) %>% 
  str_replace('Q\\draw_', "") %>% 
  unique() %>% 
  sort()

# creating rgb maps for each scenario
rgb_l <- map2(scenarios, fig_letters[1:length(scenarios)], function(x, let) {
  s_rgb <- r_qprop1[[paste0('Q', 1:3, "raw_", x)]] %>% 
    #spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # for testing
    subst(from = c(-Inf, Inf),
          to = c(NA, NA)) %>% 
    stars::st_as_stars() %>% 
    stars::st_rgb(maxColorValue = 1)
  
  rgb <- plot_map2(s_rgb#,
                   #panel_tag = fig_letters[1]
  )+
    scale_fill_identity() +
    labs(subtitle = paste(let, str_replace(x, "_", " ")))
  
  rgb
})

design <- "
1#
12
1#
"

tmp <- wrap_elements(wrap_plots(rgb_l))
comb <- tmp + wrap_elements(triangle) + 
  plot_layout(heights = c(1, 0.5, 1),
              widths = c(1, 0.2), 
              design=design)

#comb

jpeg(paste0('figures/climate_attribution/maps/rgb_by-scenario_', 
            version, "_", root_c9, '.jpg'), 
     width = 6.5, height = 6, units = 'in',
     res = 600)
comb
dev.off()

# proportion change maps --------------------------------------------------
lookup_q <- c("Q1raw_median_RCP45_2070-2100" = "Q1 (Sagebrush)", 
              "Q2raw_median_RCP45_2070-2100" = "Q2 (Perennials)", 
              "Q3raw_median_RCP45_2070-2100" = "Q3 (Annuals)", 
              "Q5s_median_RCP45_2070-2100" = "Sagebrush ecological integrity"
) 

lookup_q[] <- paste(fig_letters[1:length(lookup_q)], lookup_q) # using [] to preservenames 
r_diffprop2 <- r_diffprop1*100 #convert to %

lyrs <- names(r_diffprop2)

b <- c(25, 15, 10, 5, 1)
breaks <- c(-100, -b, rev(b), 200) 
colors <- RColorBrewer::brewer.pal(length(breaks) - 1, 'RdBu')
length(colors)
labels <- label_creator(breaks)
labels[1] <- paste0('< ', breaks[2])

colors[ceiling(length(breaks)/2)] <- 'grey' # middle color (no significant)

fill_diff <- function() {
  scale_fill_manual(name = '% Change',
                    values = colors,
                    labels = c(labels, ""), # empty label for NA
                    na.value = 'transparent',
                    drop = FALSE) 
}

g <- r_diffprop2[[str_subset(lyrs, 'RCP45_2070-2100')]] %>% 
  # for some reason an error is thrown when this sampling step not taken
  spatSample(c(3000, 3000), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  #st_as_stars(as_attributes = FALSE) %>% 
  plot_map2(mapping = aes(fill = cut(`Q1raw_median_RCP45_2070-2100`, breaks))) +
  facet_wrap(~band,
             labeller = labeller(band = lookup_q)) +
  theme(strip.text = element_text(hjust = 0)) +
  fill_diff() +
  theme(legend.position = 'right')

jpeg(paste0(paste('figures/delta_maps/perc-change_Qs-SEI', version, root_c9, 
                  rcp_c9, years_c9, sep = "_"), '.jpg'), 
     width = 8, height = 8, units = 'in',
     res = 600)
g
dev.off()  


# * 4 panel maps -----------------------------------------------------------
# 4 panel maps (1 panel per scenario) for change in each of Q1, Q2, Q3 and SEI
Qs <- str_extract(lyrs, 'Q\\d[a-z]+') %>% 
  unique() %>% 
  sort()

for(Q in Qs) {
  r <- r_diffprop2[[str_subset(lyrs, Q)]]
  lyr_names <- names(r) %>% 
    str_extract('RCP.+') %>% 
    str_replace("_", " ") %>% 
    paste(fig_letters[1:length(.)], .)
  names(r) <- letters[1:nlyr(r)]
  
  names(lyr_names) <- letters[1:nlyr(r)]
  
  g <- r %>% 
    # for some reason an error is thrown when this sampling step not taken
    spatSample(c(3000, 3000), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
    #st_as_stars(as_attributes = FALSE) %>% 
    plot_map2(mapping = aes(fill = cut(a, breaks))) +
    facet_wrap(~band,
               labeller = labeller(band = lyr_names)) +
    theme(strip.text = element_text(hjust = 0)) +
    fill_diff() +
    theme(legend.position = 'right')
  
  jpeg(paste0('figures/delta_maps/perc-change_', Q, "_",
                    version, "_", root_c9, '.jpg'),
       width = 6, height = 6, units = 'in',
       res = 600)
    print(g)
  dev.off()
}

# numGcmGood --------------------------------------------------------------
# map showing agreement among GCMs

# 113 means 13 GCMS agree will stay core (class 1)
# note some 215s exist (i.e. grow, 15 GCMs agree on stability/improvement
# which isn't possible, this has to do with how the pyramid is being
# defined in GEE and disappears when you 'zoom' in on GCM (i.e. isn't a problem
# at high resolution);
c3_cutoffs <- c(115:112, 111:107, 106:102, 101, 100)
replacement <- c(rep(1, 4), rep(2, 5), rep(3, 5),  4, 4)

from <- c(c3_cutoffs, # currently core
          c3_cutoffs+ 100, # currently grow
          300, # currently other areas
          0 # masked out areas
          )

to <- c(replacement + 10, replacement+20, 30, 
        NA # NA values 
        )

r_numGcm2 <- subst(r_numGcm1, from = from, to = to)

# perc1 <- paste0('\n(', round(12/13*100, digits = -1), '-', '100% of GCMs agree)')
perc1 <- '\n(robust agreement)'
# perc2 <- paste0('\n(', round(7/13*100, digits = -1), '-', round(12/13*100, digits = -1), '% of GCMs agree)')
perc2 <- '\n(non-robust agreement)'
names_numGcm <- c("11" = paste('Stable CSA', perc1),
                 "12" = paste('Stable CSA', perc2),
                 "13" = paste('Loss of CSA', perc2), 
                 "14" = paste('Loss of CSA', perc1), 
                 "21" = paste('Stable (or improved) GOA', perc1), 
                 "22" = paste('Stable (or improved) GOA', perc2), 
                 "23" = paste('Loss of GOA', perc2), 
                 "24" = paste('Loss of GOA', perc1), 
                 "30" = 'Other rangeland area')

g <- r_numGcm2[["numGcmGood_RCP45_2070-2100"]] %>% 
  #spatSample(c(500, 500), method = 'regular', as.raster = TRUE) %>% # uncomment for testing
  as.factor() %>% 
  plot_map2() +
  scale_fill_manual(values = cols_numGcm,
                    labels = names_numGcm,
                    na.value = 'transparent') +
  theme(legend.position = 'bottom',
        legend.title = element_blank(),
        legend.text = element_text(size = rel(0.6)),
        legend.box.margin = margin()) +
  guides(fill = guide_legend(ncol = 1))+
  labs(subtitle = fig_letters['a'])


# * bar chart -------------------------------------------------------------

area_numGcm2 <- area_numGcm1 %>% 
  mutate(area_km2 = area_m2/1000^2,
         category = factor(numGcmGood, levels = from, labels = to),
         run = str_replace(run, '_$', ''),
         category_name = names_numGcm[as.character(category)]) %>% 
  select(-"system:index", -".geo", -area_m2) %>% 
  group_by(RCP, run, years, category, category_name) %>% 
  summarize(area_km2 = sum(area_km2),
            .groups = 'drop')

bar <- area_numGcm2 %>% 
  filter(RCP == rcp_c9, years == years_c9, run == root_c9) %>% 
  ggplot(aes(category, area_km2, fill = category)) +
  geom_bar(stat = 'identity') +
  scale_fill_manual(values = cols_numGcm) +
  scale_y_continuous(labels = scales::comma) +
  labs(y = lab_areakm0,
       x = NULL,
       subtitle = fig_letters['b']) +
  theme(legend.position = 'none',
        axis.text.x = element_blank())


# *combine ----------------------------------------------------------------
design <- "
1112
1113
1113
"
comb <- g + bar + guide_area() + plot_layout(design=design, guides = "collect") 

name_numGcm <- file_regex6 %>% 
  str_replace('.tif', '') %>% 
  str_replace(paste0('_numGcmGood_', resolution), '')
jpeg(paste0('figures/transition_maps/numGcm_', name_numGcm , '_v6.jpg'), 
     width = 7, height = 5.4, units = 'in',
     res = 800)
comb
dev.off()


# * 4 panel -----------------------------------------------------------------
# 4 panel map

r_numGcm3 <- r_numGcm2[[sort(names(r_numGcm2))]]
names <- names(r_numGcm3) %>% 
  str_replace('numGcmGood_', '') %>% 
  str_replace('_', " ") %>% 
  paste(fig_letters[1:4], .)
r_numGcm4 <- r_numGcm3 %>% 
  spatSample(c(3000, 3000), method = 'regular', as.raster = TRUE) %>% # for testing
  as.factor() 
names(r_numGcm4) <- names  
  
g <- r_numGcm4 %>% 
  st_as_stars(as_attributes = FALSE) %>% 
  plot_map2() +
  facet_wrap(~band) +
  scale_fill_manual(values = cols_numGcm,
                    labels = names_numGcm,
                    na.value = 'transparent') +
  theme(legend.title = element_blank(),
        strip.text = element_text(hjust = 0),
        legend.position = 'right',
        legend.text = element_text(size = rel(0.6)),
        legend.box.margin = margin())

#g
jpeg(paste0('figures/transition_maps/numGcm_by-scenario_', name_numGcm , '.jpg'), 
     width = 7, height = 5.5, units = 'in',
     res = 800)
g
dev.off()

# 4 component area barchart to accompany the 4 panel map
# To Do
g <- area_numGcm2 %>% 
  filter(run == root_c9) %>% 
  arrange(RCP, years) %>% 
  mutate(rcp_yr = rcp_label(RCP, years, include_parenth = FALSE,
                            add_letters = TRUE)) %>% 
  ggplot(aes(category, area_km2, fill = category)) +
  facet_wrap(~rcp_yr) +
  geom_bar(stat = 'identity') +
  scale_fill_manual(values = cols_numGcm,
                    labels = names_numGcm,
                    name = 'Confidence in \nprojected habitat class') +
  scale_y_continuous(labels = scales::comma) +
  labs(y = lab_areakm0,
       x = NULL) +
  theme(legend.position = 'right',
        axis.text.x = element_blank(),
        legend.title = element_blank(),
        strip.text = element_text(hjust = 0)
        )

jpeg(paste0('figures/area/numGcm_area_barplot_by-scenario_', name_numGcm , '.jpg'), 
     width = 7, height = 5.5, units = 'in',
     res = 600)
g
dev.off()

# * output numGcmGood area summaries --------------------------------------

# summary stats for use in paper
# calculating e.g. the percent of stable core where there is high vs low agreement
area_numGcm3 <- area_numGcm2 %>% 
  mutate(approx_c9= factor(category, levels = c(11, 12, 13, 14, 
                                                21, 22, 23, 24, 
                                                30),
                        labels = c(c9Names[1], c9Names[1], c9Names[2], c9Names[2],
                                   c9Names[5], c9Names[5], c9Names[6], c9Names[6],
                                   'Other'))) %>% 
  group_by(RCP, run, years, approx_c9) %>% 
  mutate(area_pcent = area_km2/sum(area_km2)*100,
         area_pcent = round(area_pcent, 1),
         # \n is causing problems when writing to csv
         category_name = str_replace(category_name, '\n', ''))

write_csv(area_numGcm3, paste0('data_processed/summary_stats/area-by-agreement_', version, '.csv'))

