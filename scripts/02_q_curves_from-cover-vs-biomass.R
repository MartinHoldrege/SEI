# Martin Holdrege

# Script started March 17, 2023

# Use shrub biomass vs cover relationship (developed by Scott Carpenter)
# to derive a shrub biomass q curve. And do the same for annuals and perennials
# but based on relationships fit to rap cover and rap biomass data


# parameters --------------------------------------------------------------
download <- FALSE # download files from drive (use true only if new
# ee assets have been exported)
run <- "fire1_eind1_c4grass1_co20"

# dependencies ------------------------------------------------------------

# set the 'runs' (i.e what simulations settings) that data should be fore
# in this script
source("scripts/01_create_sw_biomass_df.R")
source("src/general_functions.R")
source("src/fig_params.R")
library(patchwork)
theme_set(theme_classic())
library(mgcv)




# read in data ------------------------------------------------------------

# * stepwat biomass -------------------------------------------------------

# stepwat biomass under current conditions
sw_bio_cur <- sw_bio_cur %>% # created in 01_create_sw_biomass_df.R
  filter(run == .GlobalEnv$run)

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


# functions ---------------------------------------------------------------

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

# coefficients for the equation of cover = b0 + b1*biomass
# (this equation was estimated by scott carpenter)
b0_sage <- 0.107836
b1_sage <- 0.034505

cov2bio_sage <- function(cover) {
  # now writing equation in terms of biomass
  biomass <- (cover - b0_sage)/b1_sage
  biomass
}

x <- seq(0, 100, by = 0.1)
plot(x, cov2bio_sage(x))


# *afg --------------------------------------------------------------------

rap_l1 <- split(rap2, rap2$pft)
mod_afg <- gam(Biomass ~ s(Cover, bs = 'cs'), data = rap_l1$AFG)
# linear function for tables below
mod_afg_cov_lin <- lm(Cover ~ Biomass, data = rap_l1$AFG) 

rap_l1$AFG$phat <- predict(mod_afg)
plot(phat ~ Cover, data = rap_l1$AFG)

# cover vs biomass from mahood
cov2bio_afg_mahood <- function(cover) {
  # from Mahood et al 2021
  (2.67*cover^0.5 + 1.53)^2
}

# prediction function for annuals based on rap
cov2bio_afg_rap <- cov2bio_factory(mod_afg) # based on gam from RAP data

# reverse predictions so cover is predicted from biomass
bio2cov_afg_rap <- bio2cov_factory(cov2bio_afg_rap)
bio2cov_afg_mahood <- bio2cov_factory(cov2bio_afg_mahood)


jpeg("figures/q_curves/afg_RAP_vs_mahood_relaionship.jpeg")
plot(cov2bio_afg_mahood(x), x, type = 'l', xlim = c(0, 400), 
     col = 'red', xlab = "Biomass of annuals (g/m2)", ylab = "Cover of annuals (%)")
lines(cov2bio_afg_rap(x), x, col = 'blue')
legend("topright",                    # Add legend to plot
       legend = c("Mahood et al. 2021 (plot level)", "RAP cover vs biomass"),
       col = c("red", "blue"),
       lty= 1)
dev.off()
# *pfg --------------------------------------------------------------------

mod_pfg <- gam(Biomass ~ s(Cover, bs = 'cs'), data = rap_l1$PFG)
rap_l1$PFG$phat <- predict(mod_pfg)
plot(phat ~ Cover, data = rap_l1$PFG)

# linear function for tables below
mod_pfg_cov_lin <- lm(Cover ~ Biomass, data = rap_l1$PFG) 

# prediction function for perennials
cov2bio_pfg <- cov2bio_factory(mod_pfg)


plot(x, cov2bio_pfg(x))


# plot cover/biomass ------------------------------------------------------

jpeg('figures/q_curves/RAP_biomass-vs-cover_v1.jpeg', res = 600,
     units = "in", height = 5, width = 8)
rap_l1 %>% 
  bind_rows(.id = "PFT") %>% 
  ggplot(aes(Biomass, Cover)) +
  geom_point(alpha = 0.1) +
  geom_smooth(method = 'lm', color = 'blue') +
  geom_smooth(method = 'gam', color = 'red') +
  facet_wrap(~PFT, scales = "free") +
  labs(subtitle = 'average RAP biomass vs cover, smoothed to 560 m')
dev.off()

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
q_afg
q2$afg <- q_afg %>% 
  # the default here is to use biomass derived from the rap based equation
  mutate(biomass = biomass_rap)



q2_long <- q2 %>% 
  bind_rows(.id = "PFT") %>% 
  pivot_longer(c(great_basin, intermountain, great_plains),
               values_to = "q", names_to = "region")

# figures  -----------------------------------------------------------

# converting biomass to be 'rap' equivelant]
x <- 1:1000

sw_afg <- sw_bio_cur %>% 
  filter(PFT == "afg") %>% 
  mutate(# rap equivelant cover
         cover_rap_eq = bio2cov_afg_rap(biomass),
         # convert to cover (based on mahood relationship)
         cover_mahood_eq = bio2cov_afg_mahood(biomass))

hist(sw_afg$cover_rap_eq)
# separate figure for annuals
a <- q2_long %>% 
  filter(PFT == "afg") %>% 
  ggplot(aes(x = cover, y = q, color = region)) +
  geom_line() +
  scale_color_manual(values = cols_region)

a1 <- a  +
  scale_x_continuous(sec.axis = sec_axis(trans = cov2bio_afg_rap_lin,
                                         name = "Biomass (RAP)")) 
a1
a2 <- a  +
  scale_x_continuous(sec.axis = sec_axis(trans = ~cov2bio_afg_mahood(.*100),
                                         name = "Biomass (Mahood)"))
a2

a3 <- a +
    geom_histogram(data = sw_afg, 
                   aes(x = cover_rap_eq/100, y = after_stat(density)/30),
                   bins = 100, color = 'gray') +
    labs(caption = 'Stepwat biomass converted to cover based on 
       Rap cover vs biomass',
         subtitle = paste0("RAP equivelant cover", "\nsimulation settings: ", run))


a4 <- a +
  geom_histogram(data = sw_afg, 
                 aes(x = cover_mahood_eq/100, y = after_stat(density)/60),
                 bins = 100, color = 'gray') +
  labs(caption = 'Stepwat biomass converted to cover based on 
       mahood equation',
       subtitle = paste0("Mahood equivelant cover", "\nsimulation settings: ", run))

pdf("figures/q_curves/q_curves_mahood-vs-rap-biomass_v2.pdf",
    width = 11, height = 8)
  wrap_plots(a1, a2, a3, a4, guides = 'collect', ncol = 2) +
    plot_annotation(title = "annuals")
dev.off()


g <- ggplot(q2_long, aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(y = "Q Value") +
  scale_color_manual(values = cols_region)# +
  # geom_histogram(data = sw_bio_cur, 
  #                aes(biomass, y = after_stat(density)*20), color = 'gray')

pdf(paste0("figures/q_curves/q_curves_from-cover-vs-biomass_", run, ".pdf"),
    width = 6, height = 4)
cap1 <- paste("sage cover-biomass conversion done w/ Scott Carpenters equations",
              "\npfg & afg converted based on RAP relationships")
g +
  geom_line(aes(x = cover)) +
  labs(subtitle = "Original Q curve (Theobald 2022)")

g2 <- g + 
  labs(x =  lab_bio0,
       subtitle = "Cover converted to biomass (using cover-biomass relationships)",
       caption = cap1)

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
       subtitle = "comparing stepwat biomass (histograms) to q curves",
       caption = cap1) +
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
afg_js2 <- q2$afg %>% 
  select(biomass_mahood, all_of(regions)) %>% 
  rename(biomass = biomass_mahood) %>% 
  create_js_q_curve_code(name = 'annualQBioMahood')

pfg_js <- create_js_q_curve_code(q_out$pfg, name = 'perennialQBio1')
sage_js <- create_js_q_curve_code(q_out$sage, name = 'sageQBio1')

# strings to write
q2write <- c("//Note: this is an automatically created file, do not edit",
             "//File created in 02_q_curves_from-cover-vs-biomass.R script",
             "//These are adjusted q-curved to use with stepwat biomass output",
             "//these are based on cover-biomass relationships.",
             "//note that annualQBio1 is based on the rap cover-biomass relationship",
             "//but 'annualQBioMahood' is based on the mahood equation",
             "\n", 
             afg_js, afg_js2, pfg_js, sage_js)
cat(q2write)
write_lines(q2write, "src/qCurves4StepwatOutput2.js")


# biomass-cover tables---------------------------------------------------------
#(for converting stepwat biomass to cover in gee)

b0b1sage1 <- create_js_b0b1_code(b0 = b0_sage, b1 = b1_sage, 'sage1')
b0b1afg1 <- create_js_b0b1_code(b0 = mod_afg_cov_lin$coefficients['(Intercept)'], 
                                b1 = mod_afg_cov_lin$coefficients['Biomass'], 
                                'afg1')
# consider also including mahood--not it is not a linear function
b0b1pfg1 <- create_js_b0b1_code(b0 = mod_pfg_cov_lin$coefficients['(Intercept)'], 
                                b1 = mod_pfg_cov_lin$coefficients['Biomass'], 
                                'pfg1')

lin2write <- c("/*",
               "Slope and intercept for linear functions that convert biomass",
               "to cover for sage, pfg and afg",
               "These lists also created in 02_q_curves_from-cover-vs-biomass.R",
               "*/\n\n",
               "//sage equation (from Carpenter)",
               b0b1sage1,
               "//afg equation (derived from RAP)",
               b0b1afg1,
               "//pfg equation (derived from RAP)",
               b0b1pfg1
               )

write_lines(lin2write, "src/qCurves4StepwatOutput2.js", append = TRUE)
