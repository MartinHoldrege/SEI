# calculate areas from the c9 default layer, that is on sciencebase
# note these areas are less than the areas provided in the 
# manuscript, because the manuscript areas were calculated
# prior to projection and coarsening of the mask scale.

# Author Martin Holdrege

# script started 1/15/2025


# dependencies ------------------------------------------------------------


library(terra)
library(tidyverse)

source('src/paths.R')
source('src/general_functions.R')
source('src/fig_params.R')


# params ------------------------------------------------------------------

run_name <- 'Default';
RCP <- 'RCP45'
years <- '2071-2100'

# read in data ------------------------------------------------------------

r <- rast(file.path(path_large, paste0(
  'SEI_rasters/data_publication2/c9_', run_name, '_', RCP, '_', years, '.tif')))

# create in 09_area-tables.R (this is the file to compare the output to)
# area_pub1 <- read_csv('data_processed/summary_stats/area-by-c9_summaries_vsw4-3-4.csv')
# calculate area ----------------------------------------------------------

# size of each pixel
size <- cellSize(r, unit = 'ha',
                 transform = FALSE # truly equal area when transform is false, and how it is treated in GEE
)

band_names <- names(r)
names(band_names) <- band_names
c9_areas0 <- map(band_names, function(band_name) {
  zonal(size, r[band_name], fun = 'sum') # area per SEI class change category
})


# calculate area percents -------------------------------------------------

# area of each change class and what percent that
# is of the current SEI class area
areas_df <- map(c9_areas0, function(x) {
  names(x) <- c("c9", 'area')
  x
}) %>% 
  bind_rows(.id = 'band') %>% 
  mutate(summary = str_replace(band, 'c9_', '')) %>% 
  select(-'band') %>% 
  mutate(
    # current SEI class
    c3 = c9_to_c3(c9),
    c9_name = factor(c9, levels = 1:9,
                     labels = c9Names)) %>% 
  group_by(summary, c3) %>% 
  mutate(
    area = area/1000, # convert to 1000 ha
    # percent of current 
    area_c3 = sum(area),
    perc_area = area/area_c3*100 #,
    # perc_area = ifelse(perc_area >= 1, as.character(round(perc_area, digits = 0)),
    #                    as.character(round(perc_area, digits = 1)))
  )

# percent of total area that is each of the SEI classes
areas_c3_perc <- areas_df %>% 
  summarize(area_c3 = sum(area), .groups = 'drop_last') %>% 
  mutate(perc_c3 = area_c3/sum(area_c3)*100)

areas_c3_perc # copied into word doc table

# format to same rows/cols used in appendix D



areas_df_wide <- areas_df %>% 
  ungroup() %>% 
  select(-c3, -area_c3, c9) %>% 
  pivot_longer(cols = c('area', 'perc_area'),
               names_to = 'units') %>% 
  mutate(
    units = ifelse(units == 'perc_area', 'perc', '1000ha'),
    value_char = case_when(
      units == "perc" & value >= 1 ~ as.character(round(value, 0)),
      units == "perc" & value < 1 &  value >= 0.1 ~ as.character(signif(value, 1)),
      units == "perc" & value < 0.1 &  value > 0 ~ '<0.1',
      units == "perc" & value == 0  ~ '0',
      units == "1000ha" & value >= 1 ~ as.character(round(value, 0)),
      units == "1000ha" & value < 1 &  value >= 0.1 ~ as.character(signif(value, 1)),
      units == "1000ha" & value < 0.1 &  value > 0 ~ '<0.1',
      units == "1000ha" & value == 0 ~ '0'
    ),
    # reordering c9_name so stable comes first for each category (to make table easier to read)
    c9_order2 = c(1, 2, 3, 5, 4, 6, 8, 9, 7)[as.numeric(c9)],
    c9_name = fct_reorder(c9_name, .x = as.numeric(c9_order2)),
    summary = factor(summary, levels = c('low', 'median', 'high'),
                     labels = c('Low SEI', 'Median SEI', 'High SEI'))) %>% 
  select(-c9_order2) %>% 
  arrange(c9_name) %>% 
  pivot_wider(id_cols = c(units,  summary),
                               names_from = 'c9_name',
                               values_from = 'value_char') %>% 
  mutate(across(.cols = -c(units, summary),
                .fns = \(x) ifelse(is.na(x), '0', x))) %>%
  arrange(units, summary)  %>% 
  mutate(run = run_name,
         RCP = RCP,
         years = years) %>% 
  select(run, RCP, years, everything())

areas_df_wide


# save output -------------------------------------------------------------

write_csv(areas_df_wide, 'data_processed/area/checks/c9_area_check_90m_from-pub-tif.csv')

