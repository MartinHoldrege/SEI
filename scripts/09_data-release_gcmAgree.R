# Purpose: creating tif files of agreement among gcms
# (i.e. robust or not robust) for stability of cores and grow areas
# (fig 2 in Holdrege et al 2024). These tif files are to be
# added to the data release (i.e. v2 of the datarelease)

# Author: Martin Holdrege

# Date started December 19, 2024


# dependencies ------------------------------------------------------------

source('src/paths.R')
source('src/fig_params.R')
library(terra)
library(purrr)
library(stringr)

# params ------------------------------------------------------------------

test_run <- FALSE

# put NULL if want to create tifs for all scenarios, otherwise put RCPXX_YYYY-YYYY
scenario <- NULL #"RCP45_2071-2100" # 

# read in files -----------------------------------------------------------

# c9 files (created in 08_data-release.R)
# these are part of the data release
assumption <- 'Default'
paths_c9 <- list.files(
  file.path(path_large, 'SEI_rasters/data_publication2'),
  pattern = paste0('c9_', assumption, '.+.tif$'),
  full.names = TRUE
)

c9a_l <- map(paths_c9, rast)
names(c9a_l) <- basename(paths_c9)

if(test_run) {
  c9b_l <- map(c9a_l, \(x) spatSample(x, size = 1e5, method = 'regular',
               as.raster = TRUE))
} else {
  c9b_l <- c9a_l
}

if(!is.null(scenario)) {
  index <- str_which(names(c9b_l), scenario)
  stopifnot(length(index)  == 1)
  c9b_l <- c9b_l[index] # list with one element
}

# functions ---------------------------------------------------------------

c9_to_agree <- function(r) {
  stopifnot(c('c9_low', 'c9_median', 'c9_high') %in% names(r))
  
  l <- r[['c9_low']]
  m <- r[['c9_median']]
  h <- r[['c9_high']]
  
  # create empty raster
  r2 <- m
  r2[] <- NA
  
  # fill the raster with values ranging from 1-9
  r2[m == 1 & l == 1] <- 1 # stable CSA, robust
  r2[m == 1 & l > 1] <- 2 # stable CSA, non-robust
  r2[(m == 2 | m == 3) & h == 1] <- 3 # loss of CSA, non-robust
  r2[(m == 2 | m == 3) & h > 1] <- 4 # loss of CSA, robust
  r2[(m == 4 | m == 5) & (l == 4 | l == 5)] <- 5 # stable goa (robust)
  r2[(m == 4 | m == 5) & l == 6] <- 6 # stable goa (non-robust)
  r2[m == 6 & (h == 4 | h == 5)] <- 7 # loss of GOA (non-robust)
  r2[m == 6 & h == 6] <- 8 # loss of GOA (robust)
  r2[m == 7 | m == 8 | m == 9] <- 9 # ORA
  
  r2
}


# create the agreement across gcms layers ---------------------------------

agree1 <- map(c9b_l, c9_to_agree)


# add attributes ----------------------------------------------------------

perc1 <- '\n(robust agreement)'
perc2 <- '\n(non-robust agreement)'
names_numGcm <- c(paste('Stable CSA', perc1),
                  paste('Stable CSA', perc2),
                  paste('Loss of CSA', perc2), 
                  paste('Loss of CSA', perc1), 
                  paste('Stable (or improved) GOA', perc1), 
                  paste('Stable (or improved) GOA', perc2), 
                  paste('Loss of GOA', perc2), 
                  paste('Loss of GOA', perc1), 
                  'Other rangeland area')
labels_ng <- data.frame(value = 1:9,
                        label = names_numGcm)

cols_ng <- labels_ng
cols_ng$label = cols_numGcm

agree2 <- map(agree1, function(r) {
  # for science base can't actually use the associated .xml file
  # so not adding the attributes
  # levels(r) <- labels_ng
  # coltab(r) <- cols_ng
  names(r) <- 'agreement_among_gcms'
  r
})

paths_out <- map_chr(names(agree2), function(x) {
  base <- str_replace(x, 'c9_', 'gcmAgree_')
  file.path(path_large, 'SEI_rasters/data_publication2', base)
})

map2(agree2, paths_out, function(r, path) {
  writeRaster(r, path,
              filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE",
                                            datatype = "INT1U"),
              overwrite = TRUE)
})



# testing -----------------------------------------------------------------
# comparing to file based on directly output from gee
