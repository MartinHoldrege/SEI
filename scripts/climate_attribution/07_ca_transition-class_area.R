# Purpose: Create figures/summaries of the amount of area where 
# sagebrush, perennials or annuals were the dominant driver 
# of change in SEI
# Area seperately calculated by 9 classes of habitat class transition,
# and by ecoregion

# Martin Holdrege

# Started: November 20, 2023

# dependencies ------------------------------------------------------------

library(tidyverse)
library(ggpattern)
source("src/general_functions.R")
source("src/fig_params.R")
source('../grazing_effects/src/fig_params.R') # for axis labels
source("src/figure_functions.R")
theme_set(theme_custom1())

# params ------------------------------------------------------------------

download <- FALSE # try and download the newest version of the file?
version <- 'vsw4-3-4'

test_run <- FALSE

resolution <- if(test_run) 10000 else 90

yr <- '2071-2100'

# same as yr but keep original date range (i.e. not 2031 or 2071)
# for file saving consistency
yr_save <- str_replace(yr, '1-', '0-')
rcp <- 'RCP45'
target_run <- 'fire1_eind1_c4grass1_co20_2311' # main 'run' used for some pub qual figs

# read in data ------------------------------------------------------------

# file created in 05_ca_transition-class_area.js

file_regex <- if(test_run) {
  paste0("^test-area-by-ecoregionC9Driver_", '\\d+' , "m_", version, "_\\d+.csv")
} else {
  paste0("^area-by-ecoregionC9Driver_", resolution , "m_", version, "_\\d+.csv")
}


if(download) {
  drive_ls_filtered(path = "SEI", file_regex = file_regex,
                    email = 'martinholdrege@gmail.com') %>% 
    drive_download_from_df('data_processed/area')
}

p1 <- newest_file_path('data_processed/area',
                       file_regex)
p1

area1 <- read_csv(p1, show_col_types = FALSE)


# functions ---------------------------------------------------------------

# shorten names of reducers for column names
red2short <- function(x) {
  case_when(x == 'high' ~ 'hi',
            x == 'low' ~ 'lo',
            x == 'median' ~ 'med',
            TRUE ~ x)
}

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
         # 4th digit is whether SEI decreased or increased
         sei_dir = str_sub(index, 4, 4),
         sei_dir = factor(sei_dir, levels = c('2', "1"),
                          labels = c("increasing", "decreasing")),
         ecoregion = c('Great Basin', 'Intermountain', 'Plains')[ecoregionNum],
         driver = c('none', 'sagebrush', 'pfg', 'afg')[driverNum + 1],
         driver = factor(driver, levels = c('sagebrush', 'pfg', 'afg', 'none'))) %>% 
  select(-area_m2, -ecoregionNum, -driverNum)


runs <- unique(area2$run) # for looping
stopifnot(target_run %in% runs)

tmp <- area2 %>% 
  filter((sei_dir == 'decreasing' & c9 %in% c(4, 7, 8))|
          (sei_dir == 'increasing' & c9 %in% c(2, 3, 6))) %>% 
  filter(area_km2 > 0) %>% 
  arrange(desc(area_km2))

nrow(area2)
if(nrow(tmp) > 0) {
  # issue that seems to be caused rounding or projection alignment
  # issues in GEE, here adjusting the 'direction' based 
  warning('some pixels show SEI decreasing but have an improvement in class')
  area2 <- area2 %>% 
    mutate(tmp = case_when(
      sei_dir == 'decreasing' & c9 %in% c(4, 7, 8) ~ 'increasing',
      sei_dir == 'increasing' & c9 %in% c(2, 3, 6) ~ 'decreasing',
      TRUE ~ sei_dir),
      sei_dir = factor(tmp, levels(sei_dir))
      ) %>% 
    select(-tmp) %>% 
  # the previous step created sum duplicated row groupings, so now
  # summing them together (e.g. now there could be to sei decreasing rows for a given
  # set of all other grouping variables)
    group_by(GCM, RCP, run, years, c9, sei_dir, ecoregion, driver) %>% 
    summarise(area_km2 = sum(area_km2))
  
}
nrow(area2)  

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
  sei_dir = levels(area2$sei_dir),
) %>% 
  left_join(area2, by = join_by(GCM, RCP, ecoregion, run, years, c9, driver,
                                sei_dir)) %>% 
  mutate(area_km2 = ifelse(is.na(area_km2), 0, area_km2),
         years = epoch2factor(years),
         c9_name = factor(c9Names[c9], levels = c9Names),
         c12_name = create_c12_factor(c9 = c9, sei_dir = sei_dir),
         c12 = as.numeric(c12_name),
         rcp_years = paste0(RCP, ' (', years, ')'))

# testing ~~~~
tmp <- area3 %>% 
  filter(GCM %in% c('low', 'high', 'median')) %>% 
  #select(area_km2, GCM) %>% 
  pivot_wider(values_from = "area_km2",
              names_from = "GCM") 
tmp %>% 
  filter(median > low & median > high)

# area3 %>% 
#   filter(driver == 'none') %>% 
#   arrange(run, ecoregion, rcp_years, driver, c12_name) %>% 
#   View()
# end testing ~~~~
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

# pixelwise reducers used (low is 2nd lowest, high is 2nd highest) in GEE
# these summaries were added on as additional 'GCMs', and should
# either be used on their on, or be removed prior to more actual GCM summaries
names_red <- c('low', 'median', 'high') 
lookup_red <- c('low' = 'lo', 'median' = 'med', 'high' = 'hi')


# * c9 area ---------------------------------------------------------------


# First looking at the area in each transition class

# area by c9 by ecoregion
area_gcm_c9_eco0 <- area3 %>% 
  group_by(run, GCM, RCP, years, rcp_years, c9_name, c9, ecoregion) %>% 
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop_last') %>% 
  left_join(tot_area_eco, by = 'ecoregion') %>% 
  mutate(area_perc = area_km2/.data[['tot_area']]*100)

# area_gcm_c9_eco <- area_gcm_c9_eco0 %>% 
#   filter(GCM %in% names_red)

# area by c9 across entire region
area_gcm_c90 <- area_gcm_c9_eco0 %>% 
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop')%>% 
  mutate(area_perc = area_km2/tot_area*100)

# median, low, and high across GCMS (pixelwise)

area_med_c9_eco <- area_gcm_c9_eco0 %>% 
  filter(GCM %in% names_red) %>% 
  mutate(GCM = red2short(GCM)) %>% 
  pivot_wider(id_cols = c(run, RCP, rcp_years, years, c9, c9_name, ecoregion, tot_area),
              values_from = c("area_km2", "area_perc"),
              names_from = 'GCM')

# pixel level (across GCM at each pixel) wide format
area_med_c9 <- area_gcm_c90 %>% 
  #filter(!GCM %in% names_red) %>% 
  group_by(run, RCP, years, rcp_years, c9_name, c9) %>% 
  filter(GCM %in% names_red) %>% 
  mutate(GCM = red2short(GCM)) %>% 
  pivot_wider(id_cols = c(run, RCP, years, rcp_years, c9_name, c9),
              values_from = c("area_km2", "area_perc"),
              names_from = 'GCM')

# area_c3 -----------------------------------------------------------------

# historical total area in each of the three categories
tmp <- area3 %>% 
  #filter(!GCM %in% names_red) %>% 
  #filter(GCM %in% c('CESM1-CAM5', 'median', 'low')) %>% 
  mutate(c3_name = c9_to_c3(c9)) %>% 
  group_by(run, GCM, RCP, years, rcp_years, c3_name) %>% 
  summarize(area_km2 = sum(area_km2)) %>% 
  mutate(area_km2 = round(area_km2))

area3 %>%
  #filter(GCM %in% c('CESM1-CAM5', 'high', 'median', 'low')) %>%
  mutate(c3_name = c9_to_c3(c9)) %>%
  group_by(GCM, c3_name) %>%
  summarise(area_km2 = sum(area_km2)) %>%
  arrange(c3_name) %>% 
  print(n = 40)

stopifnot(length(unique(tmp$area_km2)) == 3) # should only be 3 unique areas (1 for core, grow other)

area_c3 <- tmp %>% 
  group_by(c3_name) %>% 
  summarise(tot_area = mean(area_km2))

# * drivers ---------------------------------------------------------------
# note--objectes ending in 'gw' means the low, median, high are gcm wise,
# ie area from the 2nd lowest gcm, median gcm etc (not pixelwise)
# this is done for the metrics that include 'driver' which 
# aren't yet successfully calculated pixelwise (gee implementation problems)

area_gcm_eco <- area3 %>% 
  filter(!GCM %in% names_red) %>% 
  # exclude 'stable' categories
  filter(! c9 %in% c(1, 5, 9))

area_med_eco_gw <- area_gcm_eco %>% 
  group_by(run, GCM, RCP, years, rcp_years, c9_name, c9, ecoregion, driver) %>% 
  summarise(area_km2 = sum(area_km2),
            .groups = 'drop_last') %>% 
  group_by(RCP, ecoregion, run, years, c9_name, c9, GCM) %>% 
  mutate(area_tot = sum(area_km2), # total area for the grouping across drivers
         area_perc = area_km2/area_tot*100,
         # convert NaNs (b/ divide by 0) to 0, I think this results in more resonable medians (than na.rm = T)
         area_perc = ifelse(area_tot == 0, 0, area_perc)) %>% 
  group_by(RCP, ecoregion, run, years, c9_name, c9, driver) %>% 
  summarise(across(c(area_km2, area_perc),
                   .fns = list(med = median, lo = low, hi = high)),
            .groups = 'drop_last') 

area_med_gw <- area_gcm_eco %>% 
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

# group by c12
area_med_dir_gw <- area3 %>% 
  filter(!GCM %in% names_red) %>% 
  group_by(RCP, run, years, c12_name, c12, GCM, driver) %>% 
  summarize(area_km2 = sum(area_km2), # total area for the grouping across drivers
         .groups = 'drop_last') %>% 
  mutate(area_tot = sum(area_km2),
         area_perc = area_km2/area_tot*100) %>% 
  group_by(RCP,run, years, c12_name, c12, driver) %>% 
  summarise(across(c(area_km2, area_perc),
                   .fns = list(med = median, lo = low, hi = high)),
            .groups = 'drop') 

# this code has been updated and works--input data needs to have values
# for the drivers (this hasn't been corrected yet)
area_med_dir <- area3 %>% 
  filter(GCM %in% names_red) %>% 
  #filter(GCM == 'low') %>% 
  group_by(RCP, run, years, c12_name, GCM, driver, rcp_years) %>% 
  # summing over ecoregions, and sei dir for 
  summarize(area_km2 = sum(area_km2),
            .groups = 'drop') %>% 
  correct_lohi() %>% 
  group_by(RCP, run, years, c12_name, GCM) %>% 
  # total area so can get % of total area
  mutate(area_tot = sum(area_km2),
         area_perc = area_km2/area_tot*100) %>% 
  pivot_wider(id_cols = c(run, RCP, years, rcp_years, c12_name, driver),
              values_from = c("area_km2", "area_perc"),
              names_from = 'GCM')
  

# don't need to display a c9 category that doesn't exist anywhere
c9_to_keep <- area_med_gw %>% 
  filter(area_tot_hi > 0) %>% 
  pull(c9_name) %>% 
  unique()

area_med_gw <- area_med_gw %>% 
  filter(c9_name %in% c9_to_keep)

area_med_eco_gw <- area_med_eco_gw %>% 
  filter(c9_name %in% c9_to_keep)




