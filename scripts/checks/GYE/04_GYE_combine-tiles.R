# Purpose: combine tif tiles output from GEE



# dependencies ------------------------------------------------------------

library(terra)
source('src/paths.R')

# read in data ------------------------------------------------------------

name_base <- "SEI_v30_2018_2021_30_GYE_ecoStateMask_20241127"

# just for examining
c3 <- rast(file.path(path_large, "SEI_GYE/data_processed",
                     paste0(name_base, "_c3.tif")))
plot(c3)
names(c3)

cover <- rast(file.path(path_large, "SEI_GYE/data_processed",
                        paste0(name_base, "_cover.tif")))
plot(cover[[1]])
names(cover)

# read tiles to combine
pattern_q <- paste0(name_base, "_Q")
paths <- list.files(path = file.path(path_large, "SEI_GYE/data_processed/tiles"),
                    pattern = pattern_q,
                    full.names = TRUE)


Qs <- vrt(paths)
names(Qs) <- names(rast(paths[[1]])) # for some reason band names aren't retained when using vrt


# write files -------------------------------------------------------------

writeRaster(Qs, file.path(path_large, "SEI_GYE/data_processed",
                                    paste0(pattern_q, '.tif')),
            overwrite = TRUE)

r <- rast(file.path(path_large, "SEI_GYE/data_processed",
               paste0(pattern_q, '.tif')))
