# Martin Holdrege

# Script started March 17, 2023

# Use shrub biomass vs cover relationship (developed by Scott Carpenter)
# to derive a shrub biomass q curve. And do the same for annuals and perennials
# but based on relationships fit to rap cover and rap biomass data


# parameters --------------------------------------------------------------
download <- FALSE # download files from drive (use true only if new
# ee assets have been exported)

# dependencies ------------------------------------------------------------
library(tidyverse)
library('mgcv')
source("src/general_functions.R")
# read in data ------------------------------------------------------------

# *Q curves ---------------------------------------------------------------

# main q curves (i.e. used in doherty et al 2022)
q1 <- parse_q_curves()

regions <- names(q1[[1]])[2:4]


# * RAP cover/biomass table -------------------------------------------------
# RAP data was smoothed to 560m
# data compiled in 01_sample-cover-and-biomass.js

file_regex <- "RAP_cover_and_biomass_mean_smooth560_100000obs"

if(download) {
  files1 <- drive_ls_filtered(path = "SEI", file_regex = file_regex)
  
  drive_download_from_df(files1, 'data_processed/cover_vs_biomass')
}

p1 <- newest_file_path('data_processed/cover_vs_biomass',
                       file_regex)

rap1 <- read_csv(p1, show_col_types = FALSE)


# clean rap data ----------------------------------------------------------

rap2 <- rap1 %>% 
  # the 'one' column was just a dummy variable
  select(-`system:index`, -.geo, -one) %>% 
  rename(afgCov = AFG, pfgCov = PFG) %>% 
  mutate(id = 1:n()) %>% # this is the 'pixel number'
  pivot_longer(-id) %>% 
  mutate(pft = str_extract(name, "^[a-z]{3}"),
         pft = str_to_upper(pft),
         measure = str_extract(name, "[A-z]{3}$"),
         measure = case_when(measure == "Cov" ~ "Cover",
                             measure == "AGB" ~ "Biomass")) %>% 
  select(-name) %>% 
  pivot_wider(names_from = "measure",
              values_from = "value")
# models ------------------------------------------------------------------

# * sage ------------------------------------------------------------------

cov2bio_sage <- function(cover) {
  # coefficients for the equation of cover = b0 + b1*biomass
  # (this equation was estimated by scott carpenter)
  b0 <- -0.026589
  b1 <- 0.0086
  
  # now writing equation in terms of biomass
  biomass <- (cover - b0)/b1
  biomass
}


# *afg --------------------------------------------------------------------

rap_l1 <- split(rap2, rap2$pft)
mod_afg <- gam(Biomass ~ s(Cover, bs = 'cs'), data = rap_l1$AFG)
rap_l1$AFG$phat <- predict(mod_afg)
plot(phat ~ Cover, data = rap_l1$AFG)

# function factory
cov2bio_factory <- function(model) {
  out_function <- function(cover) {
    df <- data.frame(Cover = cover)
    biomass <- predict(model, newdata = df)
    
    out <- ifelse(biomass < 0, 0, biomass) # avoiding negative predictions
    out
  }
  out_function
}

# prediction function for annuals
cov2bio_afg <- cov2bio_factory(mod_afg)
x <- seq(0, 100, by = 0.1)
plot(x, cov2bio_afg(x))
# *pfg --------------------------------------------------------------------

mod_pfg <- gam(Biomass ~ s(Cover, bs = 'cs'), data = rap_l1$PFG)
rap_l1$PFG$phat <- predict(mod_pfg)
plot(phat ~ Cover, data = rap_l1$PFG)

# prediction function for perennials
cov2bio_pfg <- cov2bio_factory(mod_pfg)


plot(x, cov2bio_pfg(x))
