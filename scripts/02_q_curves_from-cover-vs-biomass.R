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
library(patchwork)
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
  b0 <- 0.107836
  b1 <- 0.034505
  
  # now writing equation in terms of biomass
  biomass <- (cover - b0)/b1
  biomass
}

x <- seq(0, 100, by = 0.1)
plot(x, cov2bio_sage(x))


# *afg --------------------------------------------------------------------

rap_l1 <- split(rap2, rap2$pft)
mod_afg <- gam(Biomass ~ s(Cover, bs = 'cs'), data = rap_l1$AFG)
rap_l1$AFG$phat <- predict(mod_afg)
plot(phat ~ Cover, data = rap_l1$AFG)

# cover vs biomass from mahood
cov2bio_afg_mahood <- function(cover) {
  # from Mahood et al 2021
  (2.67*cover^0.5 + 1.53)^2
}

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

# predict cover from biomass, by 'inversing' the cover to biomass equations
bio2cov_factory <- function(f, cover = seq(0, 100, by = 0.1)) {
  biomass <- f(cover)
  approxfun(biomass, cover)
}

# prediction function for annuals based on rap
cov2bio_afg_rap <- cov2bio_factory(mod_afg) # based on gam from RAP data
bio2cov_afg_rap <- bio2cov_factory(cov2bio_afg_rap)
bio2cov_afg_mahood <- bio2cov_factory(cov2bio_afg_mahood)


plot(cov2bio_afg_mahood(x), x)

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
            pfg = cov2bio_pfg)

# convert cover to biomass
q2 <- map2(q1[names(fns)], fns, function(df, f) {
  df$biomass <- f(df$cover*100) # first convert to % cover
  df
})
q2

# dealing with annuals seperately
q_afg <- q1$afg
# "RAP biomass"
q_afg$biomass_rap <- cov2bio_afg_rap(q_afg$cover*100)
# mahood biomass (which we think should be comparable to stepwat biomass)
q_afg$biomass_mahood <- cov2bio_afg_mahood(q_afg$cover*100)

# linear interpolation function for figures (cov2bio_afg_rap is a gamm
# and not fully monotonic I guess)
cov2bio_afg_rap_lin <- approxfun(q_afg$cover, q_afg$biomass_rap, 
                              rule = 1)

# correction factor for stepwat biomass (multiplier)
q_afg$correction_multiplier <- q_afg$biomass_rap/q_afg$biomass_mahood

# linear interpolation of the correction multiplier
correction_multiplier <- approxfun(q_afg$biomass_mahood, q_afg$correction_multiplier,
                                   rule = 1)

q_afg
q2$afg <- q_afg

df_correction <- tibble(biomass = 0:164) %>% 
  mutate(cover_rap = bio2cov_afg_rap(biomass),
         cover_mahood = bio2cov_afg_mahood(biomass),
         correction_multiplier2 = cover_rap/cover_mahood)

# linear interpolation of the correction multiplier
correction_multiplier2 <- approxfun(df_correction$cover_mahood, 
                                    df_correction$correction_multiplier2,
                                    rule = 1)

q2_long <- q2 %>% 
  bind_rows(.id = "PFT") %>% 
  pivot_longer(c(great_basin, intermountain, great_plains),
               values_to = "q", names_to = "region")


# * correction multiplier 2 -----------------------------------------------



# figures  -----------------------------------------------------------

# converting biomass to be 'rap' equivelant]
x <- 1:1000
plot(x, correction_multiplier(x))

sw_afg <- sw_bio_cur %>% 
  filter(PFT == "afg") %>% 
  mutate(correction_multiplier = correction_multiplier(biomass),
         # rap equivelat biomass
         biomass_rap_eq = biomass*correction_multiplier,
         # rap equivelant cover
         cover_rap_eq = bio2cov_afg_rap(biomass_rap_eq),
         # convert to cover (based on mahood relationship)
         cover_mahood_eq = bio2cov_afg_mahood(biomass),
         correction_multiplier2 = correction_multiplier2(cover_mahood_eq),
         # this should be equivelant/comparable to the cover in the q table
         cover_rap_eq2 = cover_mahood_eq*correction_multiplier2)

hist(sw_afg$cover_rap_eq2)
# separate figure for annuals
a <- q2_long %>% 
  filter(PFT == "afg") %>% 
  ggplot(aes(x = cover, y = q, color = region)) +
  geom_line() +
  scale_color_manual(values = cols_region) +
  labs(title = 'afg')

a1 <- a  +
  scale_x_continuous(sec.axis = sec_axis(trans = cov2bio_afg_rap_lin,
                                         name = "Biomass (RAP)")) 
a1
a2 <- a  +
  scale_x_continuous(sec.axis = sec_axis(trans = ~cov2bio_afg_mahood(.*100),
                                         name = "Biomass (Mahood)"))
a2
wrap_plots(a1, a2, guides = 'collect')

a +
  geom_histogram(data = sw_afg, 
                 aes(x = cover_rap_eq2/100, y = after_stat(density)/30),
                 bins = 100, color = 'gray') 

a1 +
  geom_histogram(data = sw_afg, 
                 aes(x = cover_rap_eq/100, y = after_stat(density)/30),
                 bins = 100, color = 'gray') 

x <- sort(sw_afg$cover_rap_eq) %>% 
  unique()
y <- cov2bio_afg_rap_lin(x/100)
sum(diff(y) <=0)

q2_long %>% 
  filter(PFT != "afg")



g <- ggplot(q2_long, aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(y = "Q Value") +
  scale_color_manual(values = cols_region) +
  geom_histogram(data = sw_bio_cur, 
                 aes(biomass, y = after_stat(density)*20), color = 'gray')

pdf("figures/q_curves/q_curves_from-cover-vs-biomass_v3.pdf",
    width = 6, height = 4)
g +
  geom_line(aes(x = cover)) +
  labs(subtitle = "Original Q curve (Theobald 2022)")

g2 <- g + 
  labs(x =  lab_bio0,
       subtitle = "Cover converted to biomass (using cover-biomass relationships)",
       caption = paste("sage cover converted to biomass w/ Scott Carpenters equations",
                       "\npfg converted to biomass based on RAP relationships"))

g2 +
  geom_line(aes(x = biomass))

ggplot(sw_bio_cur, aes(biomass)) +
  geom_histogram()  +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(subtitle = 'stepwat biomass (current conditions)',
       x = lab_bio0)

q2_long %>% 
  filter((PFT == 'sage' & biomass < 1000) | PFT != 'sage') %>% 
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
             "//(based on cover-biomass relationships)",
             "\n", 
             afg_js, pfg_js, sage_js)
cat(q2write)
write_lines(q2write, "src/qCurves4StepwatOutput2.js")
