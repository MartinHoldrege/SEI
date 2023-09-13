# Purpose: Explore quantile delta matching (QDM) and quantile matching as described
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
library(patchwork)
source("src/general_functions.R")
# for create_rast_info function
source("../grazing_effects/src/general_functions.R")
source("src/qdm_functions.R")
source("src/figure_functions.R")
source("src/fig_params.R") # for cols_region
source("../grazing_effects/src/fig_params.R") # for colors, and labels
theme_set(theme_classic())

# params ------------------------------------------------------------------

# runs <- c('fire1_eind1_c4grass1_co20', 'fire1_eind1_c4grass1_co21')
runs <- c('fire1_eind1_c4grass1_co20')

# how big the neighborhood was for smoothin RAP cover
# smooths <- c(707, 2000, 5000, 10000)
smooths <- c(2000)
additive <- TRUE # whether QDM is additive or not (multiplicative)

date <- "20230913"
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
# pdf(paste0('figures/qdm/qdm_CDF-plots_maps_', date, '.pdf'),
#     width = 11, height = 8)

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
# historical RAP/rcmap cover
cov1 <- rast(paste0("data_processed/cover/cover_rap-rcmap_", 
                     year_start, "_", year_end, "_1000m_",
                     smooth, "msmooth_20230905.tif"))

# 560m smoothed RAP cover, layers used for SEI
rapSEI1 <- rast("data_processed/cover/cover_SEIv11_2017_2020_1km_560msmooth_20211228.tif")

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

rapSEI2 <- project(rapSEI1, sw3[[1]]) %>% 
  mask(sw3[[1]])

names(rapSEI2) <- names(rapSEI2) %>% 
  str_replace("cov_", "")
  

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
  mutate(PFT = PFTlookup0[as.character(PFT)]) %>% 
  arrange(run, PFT, RCP, years)


# * sw proportin change ---------------------------------------------------

# current stepwat cover (this works b/ info2 ordered)
sw_cov_c <- sw_cov2[[info2$id[info2$RCP == 'Current']]]
# future
sw_cov_f <- sw_cov2[[info2$id[info2$RCP == RCP]]]

# proportion change
r_sw_prop <- (sw_cov_f - sw_cov_c)/sw_cov_c
names(r_sw_prop) <- info2$PFT[info2$RCP == RCP]

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

additive_name <- if(additive) {
  'additive'
} else {
  'multiplicative'
}

sw_cov_corr1 <- map_dfr(PFTabbr, function(pft) {
  infoc <- info2 %>% # current stepwat layer
    filter(PFT == pft,
           RCP == 'Current') 
   lyrc <- infoc$id
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
  x_mf <- sw_cov_df2[[lyrf]] # modeled future
  x_mc <- sw_cov_df2[[lyrc]] # modeled current
  
  # bias correcting future modeled values
  # quantile delta mapping
  xcorr_qdm <- qdm_xcorr(x_mf = x_mf, cdfo = cdfoc, cdfm = cdfmc, additive = additive)
  # correcting curre
  

  out_f <- tibble(cover_corr_qdm = xcorr_qdm) %>% 
    bind_cols(infof) %>% 
    mutate(cellnum = sw_cov_df2$cellnum)
  
  # bias correcting current modeled values
  # this is an exploratory 'off label' use of the qdm and qm methods
  # that I think might be good
  out_c <- tibble(cellnum = sw_cov_df2$cellnum)
  # qdm
  out_c$cover_corr_qdm <- qdm_xcorr(x_mf = x_mc, cdfo = cdfoc, cdfm = cdfmc, 
                                    additive = additive)

  out <- bind_cols(out_c, infoc) %>% 
    bind_rows(out_f)
  out
})

# fit cdfs to corrected data
corr_cdf_qdm1 <- sw_cov_corr1 %>% 
  select(cover_corr_qdm, id, cellnum) %>% 
  pivot_wider(id_cols =  cellnum,
              values_from = 'cover_corr_qdm',
              names_from = 'id') %>% 
  select(-cellnum) %>% 
  map(ecdf)

corr_prob_qdm1 <- map(corr_cdf_qdm1, \(f) f(cov_vec)) %>% 
  bind_cols() %>% 
  mutate(cover = cov_vec) %>% 
  pivot_longer(cols = -cover,
               values_to = 'prob',
               names_to = "id") %>% 
  left_join(info2, by = 'id') %>% 
  mutate(description = paste0('STEPWAT (', RCP, ' ', years, ') corrected (qdm)')) 

# combine datasets (for visualization) -------------------------------------

# cumulative probability, by cover for observed, current and future (raw)
# cover and corrected future cover. 
comb_prob1 <- corr_prob_qdm1 %>% 
  filter(RCP != "Current") %>% # don't want to show 'corrected' current (b/ same cdf as observed)
  bind_rows(sw_prob1) %>% 
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

cap0 <- paste('Simulation settings: ', run,
              '\n RAP data smoothed over', smooth, 'm',
              '(temporal 50th percentile, spatial 95th (except 50th for afg))')

cap1 <- paste(cap0,'\nQDM done with the', additive_name, 'approach')


cols_cdf <- c('black', 'gold', 'red', '#9ebcda', '#8856a7')
g <- ggplot(comb_prob2, aes(cover, prob, color = description)) +
  geom_line() +
  facet_wrap(~PFT, scales = 'free_x') +
  theme(legend.position = 'bottom') +
  guides(color=guide_legend(nrow=2, byrow=TRUE)) +
  scale_color_manual(values = cols_cdf,
                     name = "") +
  labs(y = "cumulative probability",
       caption = cap1)
print(g)


# create corrected rasters -------------------------------------------------------
# taking the dataframes and converting back to rasters, of corrected
# cover values

r_corr_qdm <- sw_cov_corr1 %>%
  select(cover_corr_qdm, id, cellnum) %>%
  pivot_wider(names_from = 'id',
              values_from = 'cover_corr_qdm',
              id_cols = 'cellnum') %>%
  fill_raster(., template = sw1)


# maps of corrected values ------------------------------------------------


# * qdm/qm ---------------------------------------------------------------------

for (pft in PFTabbr) {
  infoc <- info2 %>% # current stepwat layer
    filter(PFT == pft,  RCP == 'Current') 
  lyrc <- infoc$id
  
  stopifnot(length(lyrc) == 1)

  infof <- info2 %>% # future stepwat layer
    filter(PFT == pft, RCP != 'Current') 
  
  lyrf <-  infof$id
  l <- c(lyrc, lyrf)
  range <- minmax(rast(list(r_corr_qdm[[l]], sw_cov2[[l]]))) %>% 
    as.numeric() %>% 
    range()
  
  # create delta layers (change in cover, current vs future)
  raw_d <- sw_cov2[[lyrf]] - sw_cov2[[lyrc]] # raw delta 
  
  # bias corrected deltas
  qdm_d <- r_corr_qdm[[lyrf]] - r_corr_qdm[[lyrc]]

  labc <- rcp_label(infoc$RCP, infoc$years)
  labf <- rcp_label(infof$RCP, infof$years)
  
  # list contain elements for 6 different maps
  tmp1 <- list(r = list(sw_cov2[[lyrc]],    sw_cov2[[lyrf]], # the rasters
                        r_corr_qdm[[lyrc]], r_corr_qdm[[lyrf]]),
               # the type of correction
       type = list("raw", "raw", 
                   "QDM", "QDM"),
       # the time period
       period = list(labc, labf, 
                     labc, labf)
       )
  
  # maps of cover
  maps1 <- pmap(tmp1, function(r, type, period) {
    plot_map_inset(r = r,
                   colors = cols_map_bio(10),
                   tag_label = paste('STEPWAT', type, 'cover', period),
                   limits = range,
                   scale_name = lab_cov0)
  })
  
  # maps of delta cover
  delta <- list()
  delta$raw <- sw_cov2[[lyrf]] - sw_cov2[[lyrc]]   
  delta$QDM<- r_corr_qdm[[lyrf]] - r_corr_qdm[[lyrc]]  

  # ranges for QM and QDM deltas are quite different so using different scales
  range_delta1 <- map(delta[c('raw', 'QDM')], minmax) %>% 
    unlist() %>%  abs() %>%  max() %>% c(-., .)
  
  range_l <- list('raw' = range_delta1,
                  'QDM' = range_delta1)
  
  maps_d1 <- map2(delta, names(delta), function(r, type) {
    plot_map_inset(r = r,
                   colors = cols_map_bio_d,
                   tag_label = paste('Delta', type, 'STEPWAT cover'),
                   limits = range_l[[type]],
                   scale_name = lab_cov1)
  })
  
  # combine cover and delta maps

  maps_qdm1 <- (maps1[[1]] + maps1[[2]] + maps_d1$raw)/
    (maps1[[3]] + maps1[[4]] + maps_d1$QDM) + 
    plot_layout(guides = 'collect') & 
    theme(legend.position = 'bottom') 
  
  maps_qdm2 <- maps_qdm1 + patchwork::plot_annotation(title = pft,
                               caption = cap1)
  

  print(maps_qdm2)
}


# delta cover scatterplots ------------------------------------------------
# comparing change in cover calculated from raw stepwat cover versus
# calculated from QDM stepwat cover

# binding together corrected and raw stepwat cover values
sw_cov_corr2 <- sw_cov_df3 %>% 
  rename(cover_raw = cover) %>% 
  right_join(sw_cov_corr1, by = c("cellnum", "id")) %>% 
  select(cellnum, run, PFT, RCP, years, cover_corr_qdm, cover_raw)


delta_df <- sw_cov_corr2 %>% 
  filter(RCP == .env[['RCP']]) %>% 
  full_join(filter(sw_cov_corr2, RCP == "Current"), 
            by = c('cellnum', 'run', 'PFT'),
            # current and future
            suffix = c('_f', '_c')) %>% 
  select(-matches('RCP'), -matches('years')) %>%
  # change in cover of qdm and raw cover values (current vs future)
  mutate(delta_qdm = cover_corr_qdm_f - cover_corr_qdm_c,
         delta_raw = cover_raw_f - cover_raw_c)

g <- delta_df %>% 
  group_by(PFT) %>% 
  slice_sample(n = 1e4) %>% 
  ggplot(aes(delta_raw, delta_qdm)) +
    geom_point(alpha = 0.1) +
    facet_wrap(~PFT, scales = 'free')+
    geom_abline(slope = 1, intercept = 0, color = 'blue') +
    geom_abline(slope = 0, intercept = 0, linetype = 2) +
    geom_vline(xintercept = 0, linetype = 2) +
  labs(caption = cap1,
       x = "change in STEPWAT raw cover",
       y = "change in STEPWAT  QDM cover",
       subtitle = paste('comparing changes in cover (future - historical)', 
                        rcp_label(RCP, years)))
print(g)


# comparing sw change vs RAP cov ------------------------------------------


# * create dfs ------------------------------------------------------------

# poportional change in stepwat cover
sw_prop_df1 <- as.data.frame(r_sw_prop) %>% 
  mutate(cellnum = rownames(.)) %>% 
  pivot_longer(cols = -cellnum,
               names_to = 'PFT',
               # proportion change
               values_to = 'sw_prop')

# RAP cover used for SEI
SEI_cov_df1 <- as.data.frame(rapSEI2) %>% 
  mutate(cellnum = rownames(.)) %>% 
  pivot_longer(cols = -cellnum,
               names_to = 'PFT',
               # proportion change
               values_to = 'cov_SEI')

# calculation of 'future' rap
rap_fut <- delta_df %>% 
  select(cellnum, PFT, delta_qdm) %>% 
  left_join(sw_prop_df1, by = c("cellnum", "PFT")) %>% 
  left_join(SEI_cov_df1, by = c("cellnum", "PFT")) %>% 
  mutate(
    # calculating future rap cover by multiply proportion change
    cov_SEI_f_prop = cov_SEI*sw_prop + cov_SEI,
    # future cover calculating by adding delta cover (qdm corrected)
    cov_SEI_f_qdm = cov_SEI + delta_qdm) %>% 
  drop_na(matches('cov_'))

set.seed(1234)
rap_fut_sample <- rap_fut %>% 
  group_by(PFT) %>% 
  slice_sample(n = 1e4)
# * scatterplot -----------------------------------------------------------

g <- ggplot(rap_fut_sample, aes(x = cov_SEI)) +
  labs(caption = cap1,
       x = "RAP/RCMAP cover (as used for SEI)") +
  facet_wrap(~PFT) +
  scale_color_continuous(type = 'viridis')

print(g +
  geom_point(aes(y = delta_qdm, color = cov_SEI_f_qdm)) +
  labs(y = 'Delta STEPWAT qdm cover',
       title = 'Future RAP cover calculated by adding delta (qdm) cover',
       color = 'Future RAP cover'))

g3 <- g +
  geom_point(aes(y = sw_prop, color = cov_SEI_f_prop))+
  labs(title = 'Future RAP cover calculated by multiplying proportion STEPWAT change',
       color = 'Future RAP cover') 

print(g3)

print(g3 +
  ylim(c(-1, 2)) +
  labs(subtitle = 'ylim restricted'))

g2 <- g +
  geom_abline(slope = 1, intercept = 0) +
  labs(title = 'Current vs future RAP, with dotted lines denoting doubling
       or cutting in half of cover') +
  geom_abline(slope = 2, linetype = 2) +
  geom_abline(slope = 0.5, linetype = 2)

print(g2  +
        geom_hline(yintercept = 0, linetype = 2) + 
        geom_point(aes(y = cov_SEI_f_qdm, color = delta_qdm)) +
        labs(y = "Future RAP cover (calculated by adding QDM delta)",
             color = 'Delta (QDM) cover')) 

print(g4 <- g2 +
  geom_point(aes(y = cov_SEI_f_prop, color = sw_prop)) +
  labs(y = "Future RAP cover (calculated using proportion change)",
       color = 'Proportion change (STEPWAT)')
  )

print(
g4 +
  scale_color_continuous(type = 'viridis', limits = c(-0.5, 2)) +
  labs(subtitle = 'color range restricted')
)
# histograms with Q curves superimposed -----------------------------------

# # convert to longer format
# sw_cov_corr2 <- sw_cov_corr1 %>%
#   rename_with(.fn = \(x) str_replace(x, 'cover_corr_', '')) %>%
#   pivot_longer(cols = matches('qm|qdm'),
#                names_to = 'method',
#                values_to = 'cover') %>% 
#   filter(method == 'qdm') %>% 
#   mutate(rcp_label = rcp_label(RCP, years))
# 
# q1 <- parse_q_curves()[c('sage', 'pfg', 'afg')]
# names(q1) <- names(q1) %>%
#   str_replace("^sage$", "sagebrush")
# 
# q2 <- map(q1, \(x) pivot_longer(x, cols = -cover, names_to = "region",
#                                 values_to = "q"))
# 
# pft <- 'afg'
# 
# ggplot() +
#   geom_line(data = q2[[pft]],
#             aes(x = cover*100, y = q, color = region)) +
#   labs(y = "Q Value") +
#   scale_color_manual(values = cols_region) +
#   geom_density(data = sw_cov_corr2[sw_cov_corr2$PFT == pft, ],
#                aes(x = cover, fill = rcp_label))

# end loops ---------------------------------------------------------------



} # end of loop over smooth and run
dev.off()



