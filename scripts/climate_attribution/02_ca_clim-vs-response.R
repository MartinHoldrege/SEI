# Purpose: For data from the 200 stepwat sites compare response (e.g.,
# proportional change in cover) to climate variables 

# Author: Martin Holdrege

# Script started Oct 2, 2023


# params ------------------------------------------------------------------


# dependencies ------------------------------------------------------------

library(tidyverse)
theme_set(theme_classic())
# for scaled_change function
source('../grazing_effects/src/general_functions.R')

# read in data ------------------------------------------------------------

# biomass & cover by climate scenario, site etc. 
# file created in 01_ca_compile-sw-site-data.R
bio1 <- read_csv("data_processed/sw_sites/cover_mean_by_site-PFT_v1.csv")


# current climate ---------------------------------------------------------

clim_cur1 <- bio1 %>% 
  filter(RCP == 'Current') %>% 
  select(site, MAT, MAP) %>% 
  distinct()

stopifnot(nrow(clim_cur1) == 200)

# calculate change --------------------------------------------------------

bio1 <- bio1 %>% 
  filter(graze == "Light")
# for each GCM, time period etc. the % change in cover relative to 
# current contitions
diff1 <- scaled_change(bio1, 
                          var = 'cover',
                          by = c("PFT", 'run', 'graze'), 
                          percent = TRUE, 
                          divide_by_max = FALSE,
                          within_GCM = FALSE) %>% 
  rename(cover_prop = cover_diff)

# median across GCMs
diff_med1 <- diff1 %>% 
  group_by(run, site, graze, RCP, years, PFT) %>% 
  summarise(cover_prop = median(cover_prop),
            .groups = 'drop') %>% 
  left_join(clim_cur1)


# % change vs clim --------------------------------------------------------


runs <- unique(bio1$run) %>% 
  sort()
pfts <- unique(bio1$PFT)
iter <- expand_grid(pft = pfts,
                    run = runs)

pdf('figures/climate_attribution/sw_sites/prop-change_vs_clim_v1.pdf')
for(i in 1:nrow(iter)) {
  
  r <- iter$run[i]
  p <- iter$pft[i]
  
  cap1 <- paste('simulation settings:', r, 
                '\neach point represents one STEPWAT site')
  
  g <- diff_med1 %>% 
    filter(.data$run == r, PFT == p) %>% 
    ggplot(aes(y = cover_prop)) +
    facet_grid(years~RCP) +
    labs(title = p,
         y = "% change in cover", 
         caption = cap1)
  
  
  g2 <- g +
    geom_point(aes(x = MAT)) +
    geom_smooth(aes(x = MAT), se = FALSE)
  print(g2)
  
  if(p == 'sagebrush') {
    print(
      g + 
        geom_point(aes(x = MAT)) +
        geom_smooth(aes(x = MAT), se = FALSE) +
        labs(caption = paste(cap1, '(ylim restricted)')) +
        ylim(c(-70, 100))
    )
  }
  
  g2 <- g +
    geom_point(aes(x = MAP)) +
    geom_smooth(aes(x = MAP), se = FALSE)
  print(g2)
  if(p == 'sagebrush') {
    print(
      g + 
        geom_point(aes(x = MAP)) +
        geom_smooth(aes(x = MAP), se = FALSE) +
        labs(caption = paste(cap1, '(ylim restricted)')) +
        ylim(c(-70, 100))
    )
  }

}
dev.off()
