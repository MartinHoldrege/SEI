# martin holdrege

# Script started 12/21/2022

# Purpose--quantile matching between rap cover and
# stepwat biomass


# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source("src/general_functions.R")

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

ggplot(rapPerc2, aes(perc, cover)) +
  geom_point() +
  facet_wrap(~var)


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


g <- ggplot(q_sw2, aes(y = q, color = region)) +
  facet_wrap(~PFT, ncol = 2, scales = 'free')

g +
  geom_line(aes(x = cover))

g +
  geom_line(aes(x = sw_biomass))

g +
  geom_line(aes(x = perc))
