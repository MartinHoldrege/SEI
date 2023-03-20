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
theme_set(theme_classic())
library('mgcv')
source("src/general_functions.R")
source("src/fig_params.R")
source("scripts/01_create_sw_biomass_df.R")

# read in data ------------------------------------------------------------


# * stepwat biomass -------------------------------------------------------

# stepwat biomass under current conditions
sw_bio_cur # created in 01_create_sw_biomass_df.R

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
    as.numeric(out)
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


# create new q curves -----------------------------------------------------

q2 <- q1

fns <- list(sage = cov2bio_sage,
            pfg = cov2bio_pfg,
            afg = cov2bio_afg)

# convert cover to biomass
q2 <- map2(q1[names(fns)], fns, function(df, f) {
  df$biomass <- f(df$cover*100) # first convert to % cover
  df
})
q2

q2_long <- q2 %>% 
  bind_rows(.id = "PFT") %>% 
  pivot_longer(c(great_basin, intermountain, great_plains),
               values_to = "q", names_to = "region")


  
# figures  -----------------------------------------------------------


g <- ggplot(q2_long, aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(y = "Q Value") +
  scale_color_manual(values = cols_region)

pdf("figures/q_curves/q_curves_from-cover-vs-biomass_v1.pdf",
    width = 6, height = 4)
g +
  geom_line(aes(x = cover)) +
  labs(subtitle = "Original Q curve (Theobald 2022)")

g2 <- g + 
  labs(x =  lab_bio0,
       subtitle = "Cover converted to biomass (using cover-biomass relationships)",
       caption = paste("sage cover converted to biomass w/ Scott Carpenters equations",
                       "\nafg and pfg converted to biomass based on RAP relationships"))

g2 +
  geom_line(aes(x = biomass))

ggplot(sw_bio_cur, aes(biomass)) +
  geom_histogram()  +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(subtitle = 'stepwat biomass (current conditions)',
       x = lab_bio0)

q2_long %>% 
  filter((PFT == 'sage' & biomass < 4000) | PFT != 'sage') %>% 
  ggplot(aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(y = "Q Value",
       subtitle = "comparing stepwat biomass (histograms) to q curves") +
  scale_color_manual(values = cols_region) +
  geom_histogram(data = sw_bio_cur, 
                 aes(biomass, y = after_stat(density)*20), color = 'gray')  +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  geom_line(aes(x = biomass))



dev.off()


# output q-curves ----------------------------------------------------------

q_out <- map(q2, select, biomass, all_of(regions))


# putting bio in the name to denote that this is 'biomass' q-curve
afg_js <- create_js_q_curve_code(q_out$afg, name = 'annualQBio1')
pfg_js <- create_js_q_curve_code(q_out$pfg, name = 'perennialQBio1')
sage_js <- create_js_q_curve_code(q_out$sage, name = 'sageQBio1')

# strings to write
q2write <- c("//Note: this is an automatically created file, do not edit",
             "//File created in 02_q_curves_from-cover-vs-biomass.R script",
             "//These are adjusted q-curved to use with stepwat biomass output",
             "(based on cover-biomass relationships)",
             "\n", 
             afg_js, pfg_js, sage_js)
cat(q2write)
write_lines(q2write, "src/qCurves4StepwatOutput2.js")
