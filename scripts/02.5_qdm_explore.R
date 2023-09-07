# Purpose: Explore quantile delta matching (QDM) as described
# by https://doi.org/10.5194/ascmo-9-29-2023.
# here convert stepwat biomass to cover (both current and futre), and compare
# CDFs to CDFs of RAP.
# Then apply quantile delta mapping to get 'corrected' future stepwat
# biomass. 

# Author: Martin Holdrege

# Started: September 5, 2023


# depencencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/general_functions.R")
# for create_rast_info function
source("../grazing_effects/src/general_functions.R")
source("src/qdm_functions.R")
theme_set(theme_classic())
# params ------------------------------------------------------------------

runs <- c('fire1_eind1_c4grass1_co20', 'fire1_eind1_c4grass1_co21')

smooths <- c(707, 2000, 5000, 10000) # how big the neighborhood was for smoothin RAP cover
additives <- c(TRUE, FALSE)# whether QDM is additive or not (multiplicative)

date <- "20230905"
graze_level <- c("grazL" = "Light")
# PFTs for which to keep data when reading in
PFTs <- c("Sagebrush", "Pherb", "Cheatgrass", "Aforb")
RCP <- "RCP45"
years <- "2070-2100"

# 'constants' 
PFTlookup0 <- c("Sagebrush" = "sagebrush", 
                "Pherb" = "pfg", 
                "Aherb" = "afg")
PFTabbr <- PFTlookup0
names(PFTabbr) <- PFTabbr
# which historical rap datasets to use
cols <- c('sagebrush' = 'sagebrush_p50_p95',
          'pfg' = 'pfg_p50_p95',
          'afg' = 'afg_p50_p50')


# * params to loop over ---------------------------------------------------

iter <- expand_grid(run = runs,
       smooth = smooths)

# start loop
pdf(paste0('figures/qdm/qdm_CDF-plots_', date, '.pdf'),
    width = 11, height = 8)

# this loop isn't very efficient it requires repeating some
# computation unnecessarily
for (i in 1:nrow(iter)) {
  print(iter[i, ])
  smooth <- iter$smooth[i]
  run <- iter$run[i]

# read in data ------------------------------------------------------------

# * bio2cov params -----------------------------------------------------

# slope/intercept for cover vs biomass linear functions
# created in 02_q_curves_from-covers-vs-biomass.R
b0b1 <- readRDS("models/bio2cov_b0b1_v1.RDS")
# code below is assuming only one function per PFT
stopifnot(length(b0b1) == 3) 

names(b0b1) <- names(b0b1) %>% 
  str_replace_all('(b0b1_)|(\\d$)', '')

# create functions
bio2cov <- map(b0b1, function(x) {
  b0b1_factory(b0 = x[['b0']], b1 = x[['b1']])
})

# *RAP --------------------------------------------------------------------

year_start <- 1986
year_end <- 2021
cov1 <- rast(paste0("data_processed/cover/cover_rap-rcmap_", 
                     year_start, "_", year_end, "_1000m_",
                     smooth, "msmooth_20230905.tif"))

# *stepwat ----------------------------------------------------------------

# selecting which rasters to load
# interpolated rasters of stepwat data
path_r <- "../grazing_effects/data_processed/interpolated_rasters"

sw1 <- rast(paste0(path_r, "/", run, "_bio_future_median_across_GCMs.tif"))

into <- c("PFT", "type", "RCP", "years", 
          "graze")

info1 <- create_rast_info(sw1, into = into) 

info1 <- info1 %>% 
  filter(graze %in% graze_level,
         PFT %in% PFTs,
         .data$RCP %in% c("Current", .env[["RCP"]]),
         .data$years %in% c("Current", .env[["years"]]))%>% 
  mutate(PFT = PFTlookup0[as.character(PFT)])

sw2 <- sw1[[info1$id]]
sw3 <- calc_aherb(sw2, into = into) 

# dropping unnecessary PFTs
sw3 <- sw3[[str_detect(names(sw3), '(herb)|(Sagebrush)')]]
# prepare rasters ---------------------------------------------------------

cov2 <- project(cov1, sw3[[1]])
sw3 <- mask(sw3, cov2[[1]])
cov2 <- mask(cov2, sw3[[1]])
sw3 <- mask(sw3, cov2[[1]])
# *bio2cov ----------------------------------------------------------------
# convert stepwat biomass to cover using linear equations

names(bio2cov) <- names(bio2cov) %>% 
  str_replace('sage$', 'sagebrush')
sw_cov1 <- map(names(sw3), function(lyr) {
  pft1 <- create_rast_info(lyr, into = into)$PFT
  pft2 <- PFTlookup0[as.character(pft1)]
  f <- bio2cov[[pft2]] # 
  stopifnot(!is.null(f))
  f(sw3[[lyr]])
})

sw_cov2 <- rast(sw_cov1) # combine back into single raster
names(sw_cov2) <- names(sw_cov2) %>% 
  str_replace('biomass', 'cover')

sw_cov_df1 <- as.data.frame(sw_cov2) 
sw_cov_df2 <- sw_cov_df1
sw_cov_df2$cellnum <- row.names(sw_cov_df1)

sw_cov_df3 <- sw_cov_df2 %>% 
  pivot_longer(-cellnum,
               values_to = 'cover',
               names_to = 'id')
  

info2 <- create_rast_info(names(sw_cov_df1), into = into) %>% 
  mutate(PFT = PFTlookup0[as.character(PFT)])

# compute cdfs ------------------------------------------------------------
# emperical cumulative distribution functions

cov_vec <- 0:100

# * stepwat ---------------------------------------------------------------

sw_cdf1 <- map(sw_cov_df1, ecdf)

sw_prob1 <- map(sw_cdf1, \(f) f(cov_vec)) %>% 
  bind_cols() %>% 
  mutate(cover = cov_vec) %>% 
  pivot_longer(cols = -cover,
               values_to = 'prob',
               names_to = "id") %>% 
  left_join(info2, by = 'id') %>% 
  mutate(description = paste0('STEPWAT (', RCP, ' ', years, ') raw'))


# * RAP/RCMap -------------------------------------------------------------

cov_df1 <- as.data.frame(cov1) 
names(cov_df1) <- str_to_lower(names(cov_df1))
cov_cdf1 <- map(cov_df1[cols], ecdf)
# cov_prob1 <- map(cov_cdf1, \(f) f(cov_vec))


cov_df2 <- cov_df1
cov_df2$cellnum <- row.names(cov_df1)

cov_prob1 <- map_dfc(cov_cdf1, \(f) f(cov_vec)) %>% 
  mutate(cover = cov_vec) %>% 
  pivot_longer(cols = -cover, 
               values_to = 'prob') %>% 
  mutate(PFT = str_extract(name, "^[[:alpha:]]+"),
         description = 'RAP/RCMAP') %>% 
  select(-name)

# bias correct data ----------------------------------------------------------
# using QDM to bias correct future stepwat cover

for (additive in additives) {
  
additive_name <- if(additive) {
  'additive'
} else {
  'multiplicative'
}

sw_cov_corr1 <- map_dfr(PFTabbr, function(pft) {
  lyrc <- info2 %>% # current stepwat layer
    filter(PFT == pft,
           RCP == 'Current') %>% 
    pull(id)
  stopifnot(length(lyrc) == 1)
  
  # cdf of modeled data over the current or calibration period
  cdfmc <- sw_cdf1[[lyrc]] 
  
  # cdf of observed data over the current or calibration period
  cdfoc <- cov_cdf1[[cols[pft]]]
  
  # future
  infof <- info2 %>% # current stepwat layer
    filter(PFT == pft,
           RCP != 'Current') 
    
  lyrf <-  infof$id
  
  stopifnot(length(lyrf) == 1)
  x_mf <- sw_cov_df2[[lyrf]]
  
  xcorr <- qdm_xcorr(x_mf = x_mf, cdfo = cdfoc, cdfm = cdfmc, additive = additive)
  
  out <- tibble(cover_corr = xcorr) %>% 
    bind_cols(infof) %>% 
    mutate(cellnum = sw_cov_df2$cellnum)
  out
})

# fit cdfs to corrected data
corr_cdf1 <- sw_cov_corr1%>% 
  select(cover_corr, id, cellnum) %>% 
  pivot_wider(id_cols =  cellnum,
              values_from = 'cover_corr',
              names_from = 'id') %>% 
  select(-cellnum) %>% 
  map(ecdf)

corr_prob1 <- map(corr_cdf1, \(f) f(cov_vec)) %>% 
  bind_cols() %>% 
  mutate(cover = cov_vec) %>% 
  pivot_longer(cols = -cover,
               values_to = 'prob',
               names_to = "id") %>% 
  left_join(info2, by = 'id') %>% 
  mutate(description = paste0('STEPWAT (', RCP, ' ', years, ') corrected')) 

# combine datasets (for visualization) -------------------------------------

# cumulative probability, by cover for observed, current and future (raw)
# cover and corrected future cover. 
comb_prob1 <- bind_rows(corr_prob1, sw_prob1) %>% 
  select(cover, prob, PFT, description) %>% 
  bind_rows(cov_prob1) %>% 
  mutate(description = factor(description),
         # re-order for legend
         description = fct_relevel(description,
                                   levels(description)[c(1,2, 4, 3)])
         )

# filter out the right portions where prob is 1 for all scenarios 
# (for better figures)
lims_lookup <- c('afg' = 80, 'pfg' = 100, 'sagebrush' = 40)
comb_prob2 <- comb_prob1 %>% 
  mutate(lim = lims_lookup[PFT]) %>% 
  filter(cover <= lim) %>% 
  select(-lim)
# alternative approach
  # group_by(PFT) %>% 
  # filter(cover <= max(cover[prob < 1]))

# CDF figures -------------------------------------------------------------

cap1 <- paste('Simulation settings: ', run,
              '\n RAP data smoothed over', smooth, 'm',
              '(temporal 50th percentile, spatial 95th (except 50th for afg))',
              '\nQDM done with the', additive_name, 'approach')


cols_cdf <- c('black', 'gold', 'red', 'darkblue')
g <- ggplot(comb_prob2, aes(cover, prob, color = description)) +
  geom_line() +
  facet_wrap(~PFT, scales = 'free_x') +
  theme(legend.position = 'bottom') +
  scale_color_manual(values = cols_cdf,
                     name = "") +
  labs(y = "cumulative probability",
       caption = cap1)
print(g)


} # end additives loop
} # end of loop over smooth and run
dev.off()



