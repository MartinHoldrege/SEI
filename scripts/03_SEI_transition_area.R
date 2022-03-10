# martin holdrege

# Script started March 2, 2022

# Purpose:
# Determine the proportion of area in each of the 9 SEI (sagebrush 
# ecosystem integrity) transition categories, and plot it.

# dependencies ------------------------------------------------------------

library(tidyverse)
library(lemon) # for facet_rep_wrap
library(rgee)
source("src/fig_params.R")
source("src/general_functions.R")
ee_check()
# ee_clean_pyenv()
# this file remove command removes the credentials that otherwise
# cause an error: This is a workaround that Yvan Aquino at Google recommended
# (at least for now)
#Note that if just use ee_Initialize(), with no username
# then remove the username from the file path (i.e. go up one directory)
#
file.remove("/Users/mholdrege/.config/earthengine/mholdrege@gcp.usgs.gov/credentials")
ee_Initialize(user = "mholdrege@gcp.usgs.gov")

# connect to assets -------------------------------------------------------

path_ee <- 'projects/gee-guest/assets/SEI/'

# dataset of the 9 transition classes, layers are different climate
# scenarios
# c9 stands for 9 classes
c9image <- ee$Image(paste0(
  path_ee,
  'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224'))

# defines study region
region <- ee$FeatureCollection(paste0(path_ee, "US_Sagebrush_Biome_2019"))$
  geometry()

resolution <- c9image$projection()$nominalScale()

# calculate area of each class --------------------------------------------
# e.g. calculating the total area of pixels belonging to 'stable core'

area <- c9image$pixelArea() # area of each pixel in sqr meters

classes <- ee$List$sequence(1, 9) # the 9 classes

calcAreaOfClass <- ee_utils_pyfunc(
  function(x) {
    # pixels of a given given class have a values equal to their
    # area, every other pixel is zero
    # then summing across the region
    out = c9image$eq(ee$Number(x))$multiply(area)$
      reduceRegion(
        reducer = ee$Reducer$sum(),
        geometry = region,
        scale = resolution,
        maxPixels = 1e12
      )
    out
})

# this takes ~3 min to run
areas_by_class <- classes$map(calcAreaOfClass)$getInfo()


# compile into dataframe --------------------------------------------------

names(areas_by_class) <- c9Names

# dataframe of total area for each class, for each scenario
area_df <- map_dfr(areas_by_class, as_tibble, .id = 'transition') %>% 
  # each column is a scenario, now making 
  pivot_longer(cols = matches("^SEI"),
               values_to = 'area') %>% 
  group_by(name) %>% 
  mutate(area_km2 = area/100000,# convert to km^2
         name = str_replace(name, "_median_\\d{8}$", ""), # remove date at end
         # remove preamble
         name = str_replace(name, "^SEIv\\d+_\\d{4}_\\d{4}_\\d+_", ""),
         # percent of total area made up by the given class
         area_perc = area_km2/sum(area_km2)*100,
         name2 = name,
         transition = factor(transition, levels = c9Names)) %>% 
  ungroup() %>% 
  select(-area) %>% 
  separate(col = 'name2', 
           into = c('root', 'RCP', 'epoch'),
           sep = "_") %>% 
  mutate(root = factor(root, levels = rev(unique(root))),
         epoch = epoch2factor(epoch),
         RCP = RCP2factor(RCP))

unique(area_df$root)
str(area_df)

# figures -----------------------------------------------------------------
theme_set(theme_classic())


# * params ------------------------------------------------------------------


vline <- function() {
  geom_vline(xintercept = 1:2 + 0.5, linetype = 2)
}


# * dotplots --------------------------------------------------------------
# dotplots shoing the amount of area falling into each transtion
# class by climate scenario
pdf("figures/transition_area/c9_area_dotplots_v1.pdf",
    width = 8, height = 7)

g1 <- ggplot(area_df, aes(root, color = RCP, shape = epoch)) +
  facet_wrap(~transition, scales = 'free_y') +
  theme(axis.text.x = element_text(angle = 45, hjust = 1))+
  labs(x = 'STEPWAT2 model run type',
       subtitle = "Amount of area representing each of 9 SEI transition classes, by scenario") +
  scale_color_manual(values = cols_rcp)

g1 +
  geom_point(aes(y = area_perc),
             position = position_dodge2(width = 0.5, preserve = 'single')) +
  vline() +
  labs(y = "% of total area")

g1 +
  geom_point(aes(y = area_km2),
             position = position_dodge2(width = 0.5, preserve = 'single')) +
  vline() +
  labs(y = "Area (Sq km)")


dev.off()
