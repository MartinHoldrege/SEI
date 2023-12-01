# Purpose: Create figures/summaries of the amount of area where 
# sagebrush, perennials or annuals were the dominant driver 
# of change in SEI
# Area seperately calculated by 9 classes of habitat class transition,
# and by ecoregion

# Martin Holdrege

# Started: November 20, 2023


# params ------------------------------------------------------------------

download <- FALSE # try and download the newest version of the file?
version <- 'vsw4-3-3'
resolution <- 90

yr <- '2070-2100'
rcp <- 'RCP45'
target_run <- 'fire1_eind1_c4grass1_co20_2311' # main 'run' used for some pub qual figs

# dependencies ------------------------------------------------------------

library(tidyverse)
library(ggpattern)
source("src/general_functions.R")
source("src/fig_params.R")
source('../grazing_effects/src/fig_params.R') # for axis labels
source("src/figure_functions.R")
theme_set(theme_custom1())
# read in data ------------------------------------------------------------

# file created in 05_ca_transition-class_area.js
file_regex <- paste0("area-by-ecoregionC9Driver_",
                     resolution , "m_",
                     version,
                     "_\\d+.csv")

if(download) {
  files1 <- drive_ls_filtered(path = "SEI", file_regex = file_regex)
  
  drive_download_from_df(files1, 'data_processed/area')
}

p1 <- newest_file_path('data_processed/area',
                       file_regex)
p1

area1 <- read_csv(p1, show_col_types = FALSE)


# fig params --------------------------------------------------------------

cap1 <- paste0('Details:', rcp, ' (', yr, '), ', resolution, 'm, ', version)
cap2 <- paste0(cap1, '\n Bars are median, and range is 2nd lowest to 2nd highest across GCMs')

# clean -------------------------------------------------------------------

area2 <- area1 %>% 
  select(-`system:index`, -`.geo`) %>% 
  mutate(run = str_replace(run, "_$", ""),
         area_km2 = area_m2/1e6,
         index = as.character(index),
         # first digit of index is ecoregion
         ecoregionNum = as.integer(str_sub(index, 1, 1)),
         # 2nd digit is the 9 class transition
         c9 = as.integer(str_sub(index, 2, 2)),
         # 3rd digit is the primary driver of change in SEI
         driverNum = as.integer(str_sub(index, 3, 3)),
         ecoregion = c('Great Basin', 'Intermountain', 'Plains')[ecoregionNum],
         driver = c('none', 'sagebrush', 'pfg', 'afg')[driverNum + 1],
         driver = factor(driver, levels = c('sagebrush', 'pfg', 'afg', 'none'))) %>% 
  select(-area_m2, -ecoregionNum, -driverNum)

runs <- unique(area2$run) # for looping
stopifnot(target_run %in% runs)

# making sure final dataset has all 'combinations' so that, for example, no GCMs are missing
# for areas that are 0. 
area3 <- expand_grid(
  GCM = unique(area2$GCM),
  RCP = unique(area2$RCP),
  ecoregion = unique(area2$ecoregion),
  run = unique(area2$run),
  years = unique(area2$years),
  c9 = unique(area2$c9),
  driver = unique(area2$driver),
) %>% 
  left_join(area2, by = join_by(GCM, RCP, ecoregion, run, years, c9, driver)) %>% 
  mutate(area_km2 = ifelse(is.na(area_km2), 0, area_km2),
         c9_name = factor(c9Names[c9], levels = c9Names),
         rcp_years = paste0(RCP, ' (', years, ')')) 

# total area per ecoregion or biome-wide (for calculating % of total area)

# total area by ecoregion
tot_area_eco <- area3 %>% 
  filter(run == unique(run)[1],
         GCM == unique(GCM)[1],
         RCP == unique(RCP)[1],
         years == unique(years)[1]) %>% 
  group_by(ecoregion) %>% 
  summarise(tot_area = sum(area_km2),
            .groups = 'drop_last')

# area across biome
tot_area <- sum(tot_area_eco$tot_area)


# summary dataframes ------------------------------------------------------


# * c9 area ---------------------------------------------------------------


# First looking at the area in each transition class

# area by c9 by ecoregion
area_gcm_c9_eco <- area3 %>% 
  group_by(run, GCM, RCP, years, rcp_years, c9_name, c9, ecoregion) %>% 
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop_last') %>% 
  left_join(tot_area_eco, by = 'ecoregion') %>% 
  mutate(area_perc = area_km2/.data[['tot_area']]*100)

# area by c9 across entire region
area_gcm_c9 <- area_gcm_c9_eco %>% 
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop')%>% 
  mutate(area_perc = area_km2/tot_area*100)

# median, low, and high across GCMS
area_med_c9_eco <- area_gcm_c9_eco %>% 
  group_by(run, RCP, years, rcp_years, c9_name, c9, ecoregion) %>% 
  summarise(area_km2_med = median(area_km2),
            area_km2_lo = low(area_km2),
            area_km2_hi = high(area_km2),
            .groups = 'drop') %>% 
  left_join(tot_area_eco, by = 'ecoregion') %>% 
  mutate(across(matches('area_km2'), 
                .fns = \(x) x/.data[["tot_area"]]*100,
                .names = "{.col}_perc")) %>% 
  rename_with(.fn = \(x) str_replace(str_replace(x, '_km2', '_perc'),
                                     "_perc$", ""),
              .cols = matches('km2_.*_perc'))


area_med_c9 <- area_gcm_c9 %>% 
  group_by(run, RCP, years, rcp_years, c9_name, c9) %>% 
  summarise(area_km2_med = median(area_km2),
            area_km2_lo = low(area_km2),
            area_km2_hi = high(area_km2),
            .groups = 'drop')%>% 
  mutate(across(matches('area_km2'), 
                .fns = \(x) x/tot_area*100,
                .names = "{.col}_perc"
                )) %>% 
  rename_with(.fn = \(x) str_replace(str_replace(x, '_km2', '_perc'),
                                     "_perc$", ""),
              .cols = matches('km2_.*_perc'))


# * drivers ---------------------------------------------------------------


area_gcm_eco <- area3 %>% 
  # exclude 'stable' categories
  filter(! c9 %in% c(1, 5, 9))

area_med_eco <- area_gcm_eco %>% 
  group_by(RCP, ecoregion, run, years, c9_name, c9, GCM) %>% 
  mutate(area_tot = sum(area_km2), # total area for the grouping across drivers
         area_perc = area_km2/area_tot*100,
         # convert NaNs (b/ divide by 0) to 0, I think this results in more resonable medians (than na.rm = T)
         area_perc = ifelse(area_tot == 0, 0, area_perc)) %>% 
  group_by(RCP, ecoregion, run, years, c9_name, c9, driver) %>% 
  summarise(across(c(area_km2, area_perc),
                   .fns = list(med = median, lo = low, hi = high)),
            .groups = 'drop_last') 

area_med <- area_gcm_eco %>% 
  group_by(RCP, run, years, c9_name, c9, GCM, driver) %>% 
  # summing over ecoregions
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop_last') %>% 
  mutate(area_tot = sum(area_km2), # total area for the grouping across drivers
         area_perc = area_km2/area_tot*100,
         # convert NaNs (b/ divide by 0) to 0, I think this results in more resonable medians (than na.rm = T)
         area_perc = ifelse(area_tot == 0, 0, area_perc)) %>% 
  group_by(RCP, run, years, c9_name, c9, driver) %>% 
  summarise(across(c(area_km2, area_perc, area_tot),
                   .fns = list(med = median, lo = low, hi = high)),
            .groups = 'drop_last') 

# don't need to display a c9 category that doesn't exist anywhere
c9_to_keep <- area_med %>% 
  filter(area_tot_hi > 0) %>% 
  pull(c9_name) %>% 
  unique()

area_med <- area_med %>% 
  filter(c9_name %in% c9_to_keep)

area_med_eco <- area_med_eco %>% 
  filter(c9_name %in% c9_to_keep)


# c9 area -----------------------------------------------------------------


# * figures (pub qual) ----------------------------------------------------

# note--consider whether want to include only c9 categories with >0 area

tmp <- area_med_c9 %>% 
  filter(run == target_run) %>% 
  # if any c9 categories have 0 area, then drop them
  filter(c9 %in% unique(c9[area_km2_hi > 0])) %>% 
  mutate(c9_name = droplevels(c9_name)) 


g <- ggplot(tmp, aes(c9_name, y = area_km2_med),fill = c9_name) +
  geom_bar_pattern(aes(pattern = rcp_years,
                       pattern_density = rcp_years,
                       pattern_angle = rcp_years,
                       fill = c9_name),
                   stat = 'identity',
                   position = position_dodge(),
                   pattern_fill = 'black',
                   pattern_spacing = 0.05,
                   color = 'white',
                   pattern_key_scale_factor = 1 # relative density in the legend
                   )  +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi, group = rcp_years),
                stat = 'identity',
                width=.3,
                position=position_dodge(0.9)) +
  scale_fill_manual(values = c9Palette, guide = 'none')+
  # scale_pattern_manual(values = c("stripe", "none", "crosshatch", "circle")) +
  scale_pattern_manual(values = c("stripe", "none", "stripe", "stripe")) +
  scale_pattern_density_manual(values = rep(0.02, 4))+ 
  scale_pattern_angle_manual(values = c(45, 0, 0, -45)) +
  guides(pattern = guide_legend(override.aes = list(fill = "white"))) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.title = element_blank(),
        legend.position = 'bottom') +
  labs(y = lab_areakm0,
       x = NULL,
       subtitle = fig_letters['b']) +
  guides(pattern = guide_legend(nrow = 2, 
                                override.aes = list(fill = "white", color = 'black'))) +
  scale_y_continuous(labels = scales::comma) 

g

list2save <- list('fig' = g,
                  run = target_run,
                  RCP = rcp,
                  years = yr,
                  version = version)

# saving so that can be combined with a map in a downstream script
saveRDS(list2save, "figures/area/c9_area_barplot_by-scenario.RDS")


# * figures (exploratory) ---------------------------------------------------


pdf(paste0("figures/area/c9_area_barplots_", version, "_v1.pdf"), height = 8, width = 8)
# panels for each ecoregion
g <- area_med_c9_eco %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(c9_name, fill = c9_name)) +
  facet_grid(run ~ ecoregion) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = NULL,
       caption = cap1)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)


g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)

# biome-wide values
g <- area_med_c9 %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(fill = c9_name)) +
  facet_wrap(~run) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = NULL,
       caption = cap1)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)


g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)

dev.off()


# area by driver --------------------------------------------------------

# * biome-wide figures ----------------------------------------------------

# ** pub qual --------------------------------------------------------------
# continue here
g <- area_med %>% 
  filter(RCP == rcp, years == yr) %>% 
  mutate(run_name = run2name(run),
         driver_name = driver2factor(driver)) %>% 
  ggplot(aes(x = run_name, fill = driver_name)) +
  facet_wrap(~c9_name, nrow = 2) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'bottom') +
  scale_fill_manual(values = c('red', 'green', 'blue', 'grey'),
                    name = "Primary driver of change")  +
  labs(x = "Factors included in model",
       subtitle = fig_letters['b']) +
  geom_bar(aes(y = area_km2_med), stat = 'identity',
           position = position_dodge()) +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3,
                position=position_dodge(0.9)) +
  labs(y = lab_areakm0) +
  guides(fill = guide_legend(nrow = 2))

list2save <- list('fig' = g,
                  RCP = rcp,
                  years = yr,
                  version = version)

# saving so that can be combined with a map in a downstream script
saveRDS(list2save, "figures/area/c9_driver_barplot_by-run.RDS")
# ** regular ---------------------------------------------------------------

pdf(paste0("figures/climate_attribution/area/area-by-driver_", version, "_v1.pdf"),
    width = 10, height = 10)

g <- area_med %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(x = driver, fill = c9_name)) +
  facet_grid(run~c9_name) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = "Primary driver of change",
       caption = cap2)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)

g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)
  
# * ecoregion figures ----------------------------------------------------

r <- runs[2]

for (r in runs) {
  tmp_eco <- area_med_eco %>% 
    filter(run == r, RCP == rcp, years == yr)

  g <- ggplot(tmp_eco, aes(x = driver, fill = c9_name)) +
    facet_grid(ecoregion~c9_name, scales = 'free_y') +
    theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
          legend.position = 'none') +
    scale_fill_manual(values = c9Palette)  +
    labs(x = "Primary driver of change",
         caption = paste('simulation settings:', r, '\n', cap2))
  
  print(
  g + 
    geom_bar(aes(y = area_km2_med), stat = 'identity') +
    geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                  width = 0.3) +
    labs(y = lab_areakm0)
  )
  
  print(
  g + 
    geom_bar(aes(y = area_perc_med), stat = 'identity') +
    geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                  width = 0.3) +
    labs(y = lab_areaperc0)
  )
  
}
dev.off()


