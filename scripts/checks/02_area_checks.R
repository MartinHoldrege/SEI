# this is a messy, exploratory script, to understand 
# diffences in areas calculated by R vs in GEE--conclusion:
# most of it has to do with datasets having different projections/scales

# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
source('src/paths.R')

# read in data ------------------------------------------------------------


r_gee <- rast("C:/Users/mholdrege/OneDrive - DOI/scd_data_for_portal/Level of agreement among GCMs for projected change in SEI class (under RCP4.5 2071-2100).tif")
r <- rast(file.path(path_large, 'SEI_rasters/data_publication2/gcmAgree_Default_RCP45_2071-2100.tif'))

p <- list.files(file.path(path_large, 'SEI_rasters/data_publication2'),
                'gcmAgree', full.names = TRUE)
r_l <- map(p, rast)

# layers on science base
c3_sb <- rast("data_publication1/rasters/SEIv11_2017_2020_30_Current_20220717.tif")

# created in 09_maps.R
area_numGcm3 <- read_csv('data_processed/summary_stats/area-by-agreement_vsw4-3-4.csv')
c9a <- read_csv("data_processed/summary_stats/area-by-c9_summaries_vsw4-3-4.csv")
eco1 <- read_csv("data_processed/area/area-by-ecoregionC9Driver_90m_vsw4-3-4_20240426.csv")


# created in scripts/checks/01_area_calc_checks.js

# c9 area calculated from two different sources

# from ingested published tif
c9_pub1 <- read_csv('data_processed/area/checks/c9_area_check_90m_from-pub-asset_v2.csv')

# calculated from gee assets (different projections)
c9_gee1 <- read_csv('data_processed/area/checks/c9_area_check_90m_from-gee-asset_v2.csv')

# calculated from gee assets (different projections) then reprojected to match
# the pub projection and scale, prior to area calculation
c9_gee_reproj1 <- read_csv('data_processed/area/checks/c9_area_check_90m_from-gee-asset-reproj_v2.csv')

#   -----------------------------------------------------------------------



is_equal <- as.numeric(values(r)) == as.numeric(values(r_gee))
sum(!is_equal, na.rm = TRUE)/(sum(!is_equal, na.rm = TRUE) +sum(is_equal, na.rm = TRUE))*100 # 0.004% difference--could be b/
# gee calculations are done at a different projection, prior to creating the final layer?

# are the same grid-cells NA and non-NA?
same_mask <- is.na(as.numeric(values(r))) == is.na(as.numeric(values(r_gee)))
sum(!same_mask)
table(r[!is_equal])
table(r_gee[!is_equal])


r_l <- map(r_l, function(x) {
  coltab(x) <- cols_ng
  x
})
r2 <- rast(r_l)
plot(r2) # should look very similar fig E.2 (note
# E.2 is made from asset output from GEE at a much
# lower resolution, strictly for the purpose of
# visualization)

# comparing to area calculations made in GEE that appear
# in appendix D
# (values should be very similar)
size <- cellSize(r_gee, unit = 'ha')

area_l <- map(r_l, function(r) {
  zonal(size, r, fun = 'sum')
})
area_gee <- zonal(size, r_gee, fun = 'sum')
area_gee; area_l[[2]] # these two areas should be very similar (they are)



df1 <- area_numGcm3 %>% 
  filter(run == "fire1_eind1_c4grass1_co20_2311",
         RCP == 'RCP45',
         years == '2070-2100') %>% 
  mutate(area_ha = area_km2*100) %>% 
  select(category, category_name, area_ha)
area_l[[2]]
sum(df1$area_ha[1:4]);sum(area_l[[2]]$area[1:4])
sum(df1$area_ha) # total areas are different? why?
sum(area_l[[2]]$area)
plot(area_l[[2]]$area/(sum(area_l[[2]]$area)), df1$area_ha/sum(df1$area_ha))
abline(0, 1)


# total area comparisons --------------------------------------------------
eco_tot <- eco1 %>% 
  mutate(area_ha = area_m2/10000) %>% 
  filter(GCM == unique(GCM)[1],
         RCP == unique(RCP)[1],
         years == unique(years)[2],
         run == unique(run)[2]) %>% 
  pull(area_ha) %>% 
  sum()
eco_tot

r_c9 <- rast(file.path(path_large, "SEI_rasters/data_publication2/c9_Default_RCP45_2071-2100.tif"))

area_c9 <- zonal(size, r_c9[['c9_median']], fun = 'sum')
sum(area_c9$area)
sum(df1$area_ha)

ha_to_ac <- \(x) x*2.47105

# these numbers (match tables in appendix D
# and in Doherty et al. at least to the number
# of significant figures presented in both those places
ha_to_ac(sum(df1$area_ha[1:4])) # total core in 2020, doherty 2022 reports 33.4 Million acres
ha_to_ac(sum(df1$area_ha[5:8])) # this also matches doherty
ha_to_ac(sum(df1$area_ha[9])) # this also matches doherty

# making sure the zonal approach is working, and estimating area by
# cell count and approximate cell size
n_cells <- sum(freq(r_c9[[1]])$count)
n_cells*0.81


# Doherty data publication ------------------------------------------------

size_sb <- cellSize(c3_sb, unit = 'ha')
area_sb <- zonal(size_sb, c3_sb)

# compare c9 area calculations --------------------------------------------

c9_areas <- list(pub = c9_pub1, gee = c9_gee1, reproj = c9_gee_reproj1) %>% 
  map(function(x) {
    mutate(x,
           area_ha = area_m2/10000) %>% 
      select(-`system:index`, -`.geo`)
  })
# differences in areas between those published  in appendix
# those re-calculated from the published tifs is that those
# published in appendix (the c9_gee1 areas match those in table D.1.)
# are calculated from the native projection of the data,
# when the scale and projection are made to match the output
# this changes areas at the margin ('ragged edges') as well
# as small (presumably ~30x30 m pixels that are surrounded by masked cells)
# are removed. Therefore, reprojected and increasing the scale to 90m
# reduced the total study area. So the area values in the manuscript
# are accurate, but they can't re-produced from the projection and scale
# of the data that is provided in the published .tif files

# I'm unsure why there are very small differences in area calculations of the exact same dataset
# when done in R and GEE. I assume this has to do with how area of each
# projected (flat) grid-cell is done by the terra vs gee. 

map(c9_areas, \(x) sum(x$area_ha)) 
c9_areas$pub$area_ha/c9_areas$gee$area_ha
plot(c9_areas$pub$area_ha, c9_areas$gee$area_ha)
abline(0, 1)


a1 <- area_c9$area # area from R
a2 <- c9_areas$pub$area_ha # area from GEE

perc_diff <- (a1 - a2)/a2*100 # large % difference for category 3, which has trivial total area
names(perc_diff) <- as.character(area_c9$c9_median)
sum(a1); sum(a2)
(sum(a1) - sum(a2))/sum(a2)*100 # GEE calculates less area, but the difference is small 0.06%

