# Martin Holdrege

# Script started 4/24/2023

# Purpose: compare stepwat SEI and observed SEI, from 
# a random sample of locations

# params ------------------------------------------------------------------
download <- FALSE # try and download the newest version of the file?

# dependencies ------------------------------------------------------------

library(tidyverse)
source("src/general_functions.R")

# read in data ------------------------------------------------------------

# file created in 05_examine_diagnostics.js
# each row is a pixel (random sample), for a given version of stepwat sei
# and date
diag1 <- read_csv("data_processed/diagnostics/diagnostics_10000obs_1000m_20230331.csv",
                  show_col_types = FALSE)

file_regex <- "diagnostics_\\d+obs_\\d+m_\\d+.csv"

if(download) {
  files1 <- drive_ls_filtered(path = "SEI", file_regex = file_regex)
  
  drive_download_from_df(files1, 'data_processed/diagnostics')
}

p1 <- newest_file_path('data_processed/diagnostics',
                       file_regex)
p1
diag1 <- read_csv(p1, show_col_types = FALSE)

# clean  ------------------------------------------------------------------

diag2 <- diag1 %>% 
  select(-.geo, -`system:index`, -one) %>% 
  mutate(s = paste0(version, date)) # string version identifier

# compare observed and sw sei ---------------------------------------------

# correlations
split(diag2, diag2$s) %>% 
  map_dbl(function(df) {
    cor(df$Q5s_Current, df$Q5s_current_observed)
  })

# scatterplots
ggplot(diag2, aes(Q5s_Current, Q5s_current_observed)) +
  geom_point(alpha = 0.1) +
  geom_smooth(method = 'lm') +
  facet_wrap(~s) +
  labs(x = "STEPWAT SEI",
       y = "Observed (remotely sensed) SEI") 



