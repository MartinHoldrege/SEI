# Purpose: For data from  sites sampled across the sagebrush region (e.g.,
# SEI, Q, current and future RAP cover etc.) to climate variables 

# Author: Martin Holdrege

# Script started Oct 4, 2023


# params ------------------------------------------------------------------

resolution <- 90;     

versionFull <-'vsw4-3-3'
  
runs <-  c('fire0_eind1_c4grass1_co20', 
            'fire1_eind1_c4grass1_co20', 
            'fire1_eind1_c4grass1_co21');

RCP <-   'RCP45';
epoch <-  '2070-2100';

# dependencies ------------------------------------------------------------

library(tidyverse)
library(dtplyr)
# for scaled_change function
source('../grazing_effects/src/general_functions.R')
source("../grazing_effects/src/fig_params.R") # for axis labels etc
source("src/figure_functions.R")
source("src/fig_params.R")
theme_set(theme_custom1())


# read in data ------------------------------------------------------------

# data pulled together in the 05_sample_lyrs.js script

paths <- paste0(
  "data_processed/lyr_samples/lyr-samples_", versionFull,
  "_", resolution, "_",
  runs, "_", RCP, "_", epoch, "_by-GCM_20000n.csv"
)
names(paths) <- runs
samples_wide <- map_dfr(paths, read_csv, .id = 'run')

# fig params --------------------------------------------------------------

# order of GCMs determined in 02_ca_clim-vs-sw-response.R (based on median
# delta MAT)

cols_GCM1 <- c(inmcm4 = "#313695", `GISS-E2-R` = "#416AAE", `MRI-CGCM3` = "#649AC7", 
              `FGOALS-s2` = "#8FC3DC", `FGOALS-g2` = "#BCE1ED", `CSIRO-Mk3-6-0` = "#E5F4EE", 
              `CESM1-CAM5` = "#FFFFBF", MIROC5 = "#FEE597", `IPSL-CM5A-MR` = "#FDBE70", 
              `HadGEM2-CC` = "#F88D52", CanESM2 = "#EA5839", `HadGEM2-ES` = "#CE2826", 
              `MIROC-ESM` = "#A50026")

cols_GCM2 <-  c('Historical' = 'black', cols_GCM1)

cols_id <- c('blue', 'darkred')
names(cols_id) <- c('Historical',  paste0(RCP, ' (', epoch, ')'))
# prepare data ------------------------------------------------------------

samples_wide2 <- samples_wide %>% 
  rename(index = 'system:index') %>% 
  rename_with(.fn = \(x) str_replace(x, '_control', '_Historical')) %>% 
  select(-`.geo`)

# * long form -------------------------------------------------------------

# s for 'samples'
s1 <- samples_wide2 %>% 
  # site is the stepwat site from which the interpolation pulled data from
  pivot_longer(cols = -all_of(c('run', 'index', 'site')),
               names_pattern = '([[:alnum:]]+)_(.*)',
               names_to = c('variable', 'GCM')) %>% 
  pivot_wider(names_from = 'variable',
              values_from = 'value') %>% 
  mutate(RCP = RCP,
         years = epoch,
         id = ifelse(GCM == 'Historical', 'Historical', 
                     paste0(RCP, ' (', years, ')')))

# misc vectors of col names
cols_group <- c("run", "RCP", "years", "index", "site", 'id')
cols_group_gcm <- c(cols_group, "GCM")

clim_vars <- c("MAT", "MAP")
non_vars <- c(clim_vars, 'SEI', 'c9', 'c3')

# * PFT level variables ---------------------------------------------------

s_cov <- s1 %>% 
  select(all_of(cols_group_gcm), matches('560m')) %>% 
  pivot_longer(cols = matches('560m'),
               names_to = "PFT",
               values_to = "cover") %>% 
  mutate(PFT = str_replace(PFT, '560m', ''),
         # using a lookup vector to rename
         PFT = c('sage' = 'sagebrush',
                 'annual' = 'afg',
                 'perennial' = 'pfg')[PFT])

s_Q <- s1 %>% 
  select(all_of(cols_group_gcm), matches('Q\\draw')) %>% 
  pivot_longer(cols = matches('Q\\draw'),
               names_to = "PFT",
               values_to = "Q") %>% 
  mutate(PFT = str_replace(PFT, 'raw', ''),
         # using a lookup vector to rename
         PFT = c('Q1' = 'sagebrush',
                 'Q2' = 'pfg',
                 'Q3' = 'afg')[PFT])

# only data that has 'pft' level values (i.e. cover and Q)
s_pft1 <- left_join(s_cov, s_Q, by = c(cols_group_gcm, 'PFT'))

# * non PFT variables -----------------------------------------------------
# (i.e. not one row per PFT)
s_non1 <- s1 %>% 
  select(all_of(cols_group_gcm), all_of(clim_vars), 'Q5s', 'c9', 'Q5sc3') %>% 
  rename(SEI = Q5s,
         c3 = Q5sc3)


# calculating change ------------------------------------------------------
# absolute deltas (not % change)

s_non1 <- s_non1 %>% 
  # setting dataframe up this way so that scaled_change funs work
  mutate(RCP = ifelse(GCM == 'Historical', 'Current', RCP),
         years = ifelse(GCM == 'Historical', 'Current', years))

s_pft1 <- s_pft1 %>% 
  # setting dataframe up this way so that scaled_change funs work
  mutate(RCP = ifelse(GCM == 'Historical', 'Current', RCP),
         years = ifelse(GCM == 'Historical', 'Current', years)) %>% 
  # adding climate variables in
  left_join(select(s_non1, all_of(cols_group_gcm), all_of(clim_vars)))


s_non_diff1  <- s_non1 %>% 
  # setting dataframe up this way so that scaled_change funs work
  mutate(RCP = ifelse(GCM == 'Historical', 'Current', RCP),
         years = ifelse(GCM == 'Historical', 'Current', years)) %>% 
  scaled_change_2var(vars = c(clim_vars, 'SEI'),
                     by = c('run', 'index'),
                     percent = FALSE, 
                     divide_by_max = FALSE,
                     within_GCM = FALSE) 


s_pft_diff1 <- s_pft1 %>% 
  scaled_change_2var(vars = c('cover', 'Q'),
                     by = c('run', 'PFT', 'index'),
                     percent = FALSE, 
                     divide_by_max = FALSE,
                     within_GCM = FALSE)

# adding 'current' conditions columns 
s_non_cur  <- s_non1 %>% 
  filter(RCP == 'Current') %>% 
  select(-RCP, -GCM, -years, -c9, -id) 
  
s_non_diff2 <- s_non_cur %>% 
  right_join(s_non_diff1,
             by = c('run', 'site', 'index'),
             # current and future
             suffix = c('_cur', '')) %>% 
  mutate(GCM = factor(GCM, levels = names(cols_GCM1)))

# adding 'current' conditions columns 
s_pft_diff2  <- s_pft1 %>% 
  filter(RCP == 'Current') %>% 
  select(-RCP, -GCM, -years) %>% 
  right_join(s_pft_diff1,
             by = c('run', 'site', 'index', 'PFT'),
             # current and future
             suffix = c('_cur', '')) %>% 
  mutate(GCM = factor(GCM, levels = names(cols_GCM1)))

# add _cur to clim var column names
pattern <- paste0('(?<=(', paste0(clim_vars, collapse = ')|('),'))$')
clim_cur <- s_non_cur %>% 
  select(-SEI, -c3) %>% 
  rename_all(.funs = \(x) str_replace(x, pattern, '_cur'))


s_non2 <- s_non1 %>% 
  left_join(clim_cur) %>% 
  mutate(GCM = factor(GCM, levels = names(cols_GCM2)))


s_pft2 <- s_pft1 %>% 
  # adding in 'current' climate conditions
  left_join(clim_cur) %>% 
  # adding in climate conditions for the given GCM, RCP etc. 
  left_join(select(s_non1, all_of(cols_group_gcm), all_of(clim_vars))) %>%
  mutate(GCM = factor(GCM, levels = names(cols_GCM2)))


# calculating medians across GCMs -----------------------------------------

s_non_med1 <- s_non2 %>% 
  group_by(across(all_of(cols_group))) %>% 
  summarise(across(where(is.numeric), median),
            .groups = 'drop')

s_pft_med1 <- s_pft2 %>% 
  group_by(across(c(all_of(cols_group), 'PFT'))) %>% 
  summarise(across(where(is.numeric), median),
            .groups = 'drop')

s_non_diff_med1 <- s_non_diff2 %>% 
  group_by(across(all_of(cols_group))) %>% 
  summarise(across(where(is.numeric), median),
            .groups = 'drop')

s_pft_diff_med1 <- s_pft_diff2 %>% 
  group_by(across(c(all_of(cols_group), 'PFT'))) %>% 
  summarise(across(where(is.numeric), median),
            .groups = 'drop')


# median vars vs climate ------------------------------------------
# figures

pdf('figures/climate_attribution/sampled_sites/SEI-responses_vs_clim_median_v1.pdf',
    height = 8, width = 8)

# * non PFT variables -------------------------------------------------------

# ** original values ---------------------------------------------------
# i.e. these are not delta variables

# SEI vs clim vars (both historic and period specific)
g <- ggplot(s_non_med1, aes(y = SEI,
                            color = id)) +
  facet_wrap(~run, ncol = 1) +
  scale_color_manual(values = cols_id) +
  theme(legend.title = element_blank())

map(clim_vars, function(clim) {
  out <- list()
  out[[1]] <- g + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]]),
               alpha = 0.1, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]]), se = FALSE) +
    labs(x = paste(clim, '(Historical)')) 
  out[[2]]<- g + 
    geom_point(aes(x = .data[[paste0(clim)]]),
               alpha = 0.1, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim)]]), se = FALSE) +
    labs(x = paste(clim, '(period specific)')) 
  out
})  


# ** delta values ---------------------------------------------------------
# delta SEI vs clim (historical)
g <- ggplot(s_non_diff_med1, aes(y = SEI_diff)) +
  geom_hline(yintercept = 0, linetype = 2) 

map(clim_vars, function(clim) {
  out <- list()
  g2 <- g + labs(x = paste(clim, '(Historical)'),
       y = lab_sei1) 
  out[[1]] <- g2 + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]]),
               alpha = 0.1, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]]), se = FALSE) +
    facet_wrap(~run)
    
  # just smoothers, all on the same panel
  out[[2]] <- g2 + 
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    color = run), se = FALSE)
  out
})  

# * PFT variables -------------------------------------------------------

# ** original values ---------------------------------------------------
# i.e. these are not delta variables

# cover and Q vs clim vars (historic clim)
g <- ggplot(s_pft_med1, aes(color = id)) +
  facet_grid(PFT ~ run, scales = 'free_y') +
  scale_color_manual(values = cols_id) +
  theme(legend.title = element_blank(),
        legend.position = 'bottom')

# cover ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]],
               y = cover),
               alpha = 0.05, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    y = cover,), se = FALSE) +
    labs(x = paste(clim, '(Historical)'),
         y = lab_cov0) 
})  

# Q ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]],
                   y = Q),
               alpha = 0.05, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    y = Q), se = FALSE) +
    labs(x = paste(clim, '(Historical)')) 
})


# ** delta values ---------------------------------------------------------
# cover and Q vs clim vars (historic clim)
g <- ggplot(s_pft_diff_med1) +
  facet_grid(PFT~run, scales = 'free_y')

# delta cover ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]],
                   y = cover_diff),
               alpha = 0.05, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    y = cover_diff,), se = FALSE) +
    labs(x = paste(clim, '(Historical)'),
         y = lab_cov1) 
})  

# delta Q ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_point(aes(x = .data[[paste0(clim, "_cur")]],
                   y = Q_diff),
               alpha = 0.05, size = 0.1) +
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    y = Q_diff), se = FALSE) +
    labs(x = paste(clim, '(Historical)'),
         y = lab_q1) 
})

dev.off()

# GCM level responses vs climate ------------------------------------------
pdf('figures/climate_attribution/sampled_sites/SEI-responses_vs_clim_by-GCM_v1.pdf',
    height = 8, width = 8)
# ** original values ---------------------------------------------------
# i.e. these are not delta variables

# cover and Q vs clim vars (historic clim)
g <- ggplot(s_pft2, aes(color = GCM)) +
  facet_grid(PFT ~ run, scales = 'free_y') +
  scale_color_manual(values = cols_GCM2) +
  theme(legend.position = 'bottom')

# cover ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                    y = cover,), se = FALSE) +
    labs(x = paste(clim, '(Historical)'),
         y = lab_cov0) 
})  

# Q ~ clim
map(clim_vars, function(clim) {
  g + 
    geom_smooth(aes(x = .data[[paste0(clim, "_cur")]],
                   y = Q), se = FALSE) +
    labs(x = paste(clim, '(Historical)')) 
})


# * plots of c9 -----------------------------------------------------------
# stacked bar chart showing the 9 transition categories

# proportion of samples in each c9 category
prop_c9 <- s_non2 %>% 
  filter(GCM != "Historical") %>% 
  mutate(GCM = droplevels(GCM),
         c9 = factor(c9)) %>% 
  group_by(run, GCM) %>% 
  mutate(n_samples = n()) %>% 
  group_by(run, GCM, c9, n_samples) %>% 
  summarise(n_c9 = n(), .groups = 'drop_last') %>% 
  mutate(proportion = n_c9/n_samples,
         c9_name = factor(c9, levels = 9:1, labels = rev(c9Names)))

ggplot(prop_c9, aes(x = GCM, y = proportion, fill = c9_name, group = c9_name)) +
  geom_bar(stat = 'identity') +
  facet_wrap(~run, ncol = 1) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1))+
  scale_fill_manual(values = rev(c9Palette), name = 'Change in classification')

dev.off()
