# Purpose: recreate the 9 class raster of changes in sagebrush designations under
# climate change (which is Fig 13 in Doherty et al. 2022)

# Author: Martin Holdrege

# Date started June 23, 2023


# dependencies ------------------------------------------------------------

library(terra)
source("src/fig_params.R")

# read in data ------------------------------------------------------------

current <- rast("data_publication/rasters/SEIv11_2017_2020_30_Current_20220717.tif")
future <- rast("data_publication/rasters/SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20220215.tif")


# create 9 class raster ---------------------------------------------------

current10 <- current*10

c9a <- current10 + future
names(c9a) <- 'c9'
# reclassifcation matrix
rcl <- cbind(c(11, 12, 13, 21, 22, 23, 31, 32, 33),
             1:9)

# reclassifying and saving to disk
c9b <- classify(c9a, rcl, 
                filename = "data_publication/rasters/c9_SEIv11_2017_2020_30_ClimateOnly_RCP85_2030-2060_median_20220717.tif",
                overwrite = TRUE)

# examine map
plot(c9b, col = c('white', c9Palette), breaks = -1:9 + 0.5)

