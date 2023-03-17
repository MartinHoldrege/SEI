# martin holdrege

# Script started 12/21/2022

# Purpose--quantile matching between rap cover and
# stepwat biomass


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/general_functions.R")
source("src/fig_params.R")
theme_set(theme_classic())

# read in data ------------------------------------------------------------


# * rap/rcmap -------------------------------------------------------------

rapPerc1 <- read_csv("data_processed/percentiles/percentiles_rap_30m_20221220.csv")
rcmapPerc1 <- read_csv("data_processed/percentiles/percentiles_rcmap_30m_20221220.csv")

# * stepwat biomass -------------------------------------------------------

# for now using older upscaled data
dir_rast <- "../grazing_effects/data_processed/interpolated_rasters/biomass/"

files_afg <- paste0("c4on_", c("Aforb", "Cheatgrass"),
                    "_biomass_Current_Current_Light_Current.tif")

files_pfg <- "c4on_Pherb_biomass_Current_Current_Light_Current.tif"
files_sage <- "c4on_Sagebrush_biomass_Current_Current_Light_Current.tif"

r_afg <- rast(file.path(dir_rast, files_afg))
r_pfg <- rast(file.path(dir_rast, files_pfg))
r_sage <- rast(file.path(dir_rast, files_sage))


# *Q curves ---------------------------------------------------------------

# main q curves (i.e. used in doherty et al 2022)
q1 <- parse_q_curves()

regions <- names(q1[[1]])[2:4]
# process data ------------------------------------------------------------

# * rap/rcmap -------------------------------------------------------------

rapPerc2 <- rapPerc1 %>% 
  mutate(value = value/100) %>% # convert to proportion
  bind_rows( rcmapPerc1) %>% 
  select(-.geo, -`system:index`) %>% 
  mutate(
    # name of cover variable
    var = str_extract(var_perc, "^[A-z]+(?=_)"),
    perc = str_extract(var_perc, "\\d{1,3}$"),
    # percentile on the range from 0 to 1
    perc = as.numeric(perc)/100) %>% 
  select(-var_perc) %>% 
  mutate(var = case_when(
    var == "AFGC" ~ "afg",
    var == "PFGC" ~ "pfg",
    var == "nlcdSage" ~ "sage"
  )) %>% 
  rename(cover = value)




# * stepwat biomass -------------------------------------------------------

r_afg2 <- sum(r_afg) # summing across cheatgrass and annual forbs

r_list <- list(afg = r_afg2, pfg = r_pfg, sage = r_sage)

# stepwat values
sw1 <- map(r_list, function(r) {
  x <- as.numeric(values(r))
  x[!is.na(x)]
})

# calculate percentiles of each level of cover-------------------------------

rapPerc3 <- split(rapPerc2, f = rapPerc2$var)

vars <- c("afg", "pfg", "sage")

stopifnot(
  vars %in% names(rapPerc3),
  vars %in% names(q_long1)
)

# throws warnings but i think they're ok
q2 <- map2(q1[vars], rapPerc3[vars], function(x, y) {
  # percentile of cover for each level of cover
  # using linear interpolation in case it's needed 
  interp <- approx(x = y$cover, y = y$perc,
                         xout = x$cover, rule = 2)
  out <- x
  
  # interpolated percentile associated with that level of cover
  out$perc <- interp$y
  out
})

q2

# matching stepwat biomass --------------------------------------------------

q_sw1 <- map2(q2[vars], sw1[vars], function(q, sw) {
  out <- q
  #
  out$sw_biomass <- quantile(sw, q$perc)
  out
})

# long form
q_sw2 <- q_sw1 %>% 
  bind_rows(.id = "PFT") %>% 
  pivot_longer(c(great_basin, intermountain, great_plains),
               values_to = "q", names_to = "region")


# figures -----------------------------------------------------------------


g <- ggplot(q_sw2, aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free') +
  labs(y = "Q Value") +
  scale_color_manual(values = cols_region)

pdf("figures/q_curves/q_curves_v1.pdf",
    width = 6, height = 4)
g +
  geom_line(aes(x = cover)) +
  labs(subtitle = "Original Q curve (Theobald 2022)")

g +
  geom_line(aes(x = perc*100)) +
  labs(x = "Percentile",
       subtitle = "RAP/RCMAP cover converted to percentile")

g +
  geom_line(aes(x = sw_biomass)) +
  labs(x = "Stepwat biomass (g/m2)",
       subtitle = "Q curve based on quantile matching between stepwat biomass and RAP cover") 

ggplot(rapPerc2, aes(perc*100, cover)) +
  geom_point() +
  facet_wrap(~var, ncol = 2) +
  labs(x = "Percentile",
       subtitle = "Percentiles of RAP/RCMAP cover data smoothed to 560m")

dev.off()


# write q-curves into js script -------------------------------------------
# do
q_sw3 <- q_sw2 %>% 
  select(-cover, -perc) %>% 
  # removing duplicated rows because covers (e.g. 75% cover and 100%cover
  # both got mapped to the maximum biomass)
  distinct() %>% 
  pivot_wider(#id_cols = c("PFT", "q"), 
              names_from = "region",
              values_from = "q") %>% 
  # making sure
  # same order of regions as original q curves
  select(sw_biomass, all_of(regions), PFT) %>% 
  split(.$PFT) %>% 
  map(select, -PFT)

# putting bio in the name to denote that this is 'biomass' q-curve
afg_js <- create_js_q_curve_code(q_sw3$afg, name = 'annualQBio1')
pfg_js <- create_js_q_curve_code(q_sw3$pfg, name = 'perennialQBio1')
sage_js <- create_js_q_curve_code(q_sw3$sage, name = 'sageQBio1')

# strings to write
q2write <- c("//Note: this is an automatically created file, do not edit",
             "//File created in 02_quantile_matched_q_curves.R script",
             "//These are adjusted q-curved to use with stepwat biomass output",
             "\n", 
             afg_js, pfg_js, sage_js)
cat(q2write)
write_lines(q2write, "src/qCurves4StepwatOutput.js")

