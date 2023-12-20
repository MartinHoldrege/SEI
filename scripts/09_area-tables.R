# create summary tables of areas (e.g. of stable core, etc)
# Values used in the appendix and main text

# Author: Martin Holdrege

# dependencies ------------------------------------------------------------

source("scripts/climate_attribution/07_ca_transition-class_area.R")


# prepare dataframe -------------------------------------------------------

area_c9a <- area_med_c9 %>% 
  mutate(c3_name = c9_to_c3(c9)) %>% 
  select(-matches('_perc_')) %>% 
  left_join(area_c3, by = 'c3_name') %>% 
  mutate(across(matches('area_km2'), 
                .fns = \(x) x/.data[["tot_area"]]*100,
                .names = "{.col}_perc")) %>% 
  rename_with(.fn = \(x) str_replace(str_replace(x, '_km2', '_perc'),
                                     "_perc$", ""),
              .cols = matches('km2_.*_perc')) %>% 
  # converting from units of km2 to thousands of km2
  mutate(across(matches('km2'), .fns = \ (x) x/1000)) 

# making into a wide format, and rounding numbers to an appropriate degree
# for a table
# rounding percentages more aggressively
area_c9b <- area_c9a %>% 
  select(-tot_area, -c3_name, -rcp_years) %>% 
  pivot_longer(cols = matches('area_'),
               names_to = c('units', 'summary'),
               names_pattern = 'area_(.*)_(.*)') %>%
  mutate(
    value = round(value, 3), # want to be rounded to the nearest 1km (for 1000km2 values)
    value_char = case_when(
      units == "perc" & value >= 1 ~ as.character(round(value, 0)),
      units == "perc" & value < 1 ~ as.character(signif(value, 1)),
      units == "km2" & value >= 1 ~ as.character(round(value, 1)),
      units == "km2" & value < 1 ~ as.character(signif(value, 2)),
      TRUE ~ NA_character_
    ),
    value_char = case_when(
      # adding a lagging 0 which got removed by as.character
      units == "km2" & value >= 1 & !str_detect(value_char, "\\.") ~ paste0(value_char, '.0'),
      TRUE ~ value_char
    ),
    # reordering c9_name so stable comes first for each category (to make table easier to read)
    c9_order2 = c(1, 2, 3, 5, 4, 6, 8, 9, 7)[as.numeric(c9)],
    c9_name = fct_reorder(c9_name, .x = as.numeric(c9_order2))) %>% 
  select(-c9_order2) %>% 
  arrange(c9_name) %>% 
  pivot_wider(id_cols = c(run, RCP, years, units,  summary),
              names_from = 'c9_name',
              values_from = 'value_char') %>% 
  mutate(summary = factor(summary, levels = c('lo', 'med', 'hi')),
         units = str_replace(units, 'km2', '1000km2')) %>% 
  arrange(run, RCP, years, units, summary)

names(area_c9b)

area_c3b <- area_c3 %>% 
  mutate(tot_area = tot_area/1000,
         units = '1000km2') %>% 
  pivot_wider(values_from = "tot_area",
              names_from = 'c3_name')

# area by c3 as percent of total
area_c3 %>% 
  mutate(percent = tot_area/sum(tot_area) *100)

# write output ------------------------------------------------------------

write_csv(area_c9b, paste0('data_processed/summary_stats/area-by-c9_summaries_', version, '.csv'))
write_csv(area_c3b, paste0('data_processed/summary_stats/area-by-c3_', version, '.csv'))
