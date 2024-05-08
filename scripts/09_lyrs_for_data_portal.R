# Purpose: Create versions of GeoTIFFs that can be loaded into (esri based) public
# data portal/viewer

# Started: march 21, 2024

# Author: Martin Holdrege


# dependencies ------------------------------------------------------------
source('src/fig_params.R')
library(terra)


# params ------------------------------------------------------------------

path_ext <- "D:/USGS/large_files/SEI_rasters"
path_save <- "C:/Users/mholdrege/OneDrive - DOI/scd_data_for_portal"
v <- 'vsw4-3-4'
# read in data ------------------------------------------------------------

# * c9 --------------------------------------------------------------------
# geotiff created in 07_data-release.R

c9_file_name <- 'c9_Default_RCP45_2071-2100.tif'
c9a <- rast(file.path(path_ext, 'data_publication2', c9_file_name))


# * numGCMGood ------------------------------------------------------------

# file created in 06_exports_for_maps.js with resolution set to 90m
r_numGcm1 <- rast(file.path(path_ext, 
  paste0('temp_not_cog/', v, '_numGcmGood_90_fire1_eind1_c4grass1_co20_2311.tif')))
r_numGcm1 <- r_numGcm1[['numGcmGood_RCP45_2070-2100']]
# prepare rasters ---------------------------------------------------------

# *c9 ---------------------------------------------------------------------

c9b <- c9a$c9_median # for simplicity, map will only show median results

# set colors
# same colors as used in the manuscript. 
c9cols <- data.frame(cell_value = 1:9, 
                     colors = c9Palette)
coltab(c9b, layer = 1) <- c9cols
c9labs <- data.frame(cell_value = 1:9,
                     label = c9Names)
levels(c9b) <- c9labs
names(c9b) <- 'Median projected change in SEI class under RCP4.5 (2071-2100)'


# * numGCM ----------------------------------------------------------------

# 113 means 13 GCMS agree will stay core (class 1)
# note some 215s exist (i.e. grow, 15 GCMs agree on stability/improvement
# which isn't possible, this has to do with how the pyramid is being
# defined in GEE and disappears when you 'zoom' in on GCM (i.e. isn't a problem
# at high resolution);
c3_cutoffs <- c(115:112, 111:107, 106:102, 101, 100)
replacement <- c(rep(1, 4), rep(2, 5), rep(3, 5),  4, 4)

from <- c(c3_cutoffs, # currently core
          c3_cutoffs+ 100, # currently grow
          300, # currently other areas
          0 # masked out areas
)

to <- c(replacement + 10, replacement+20, 30, 
        NA # NA values 
)

r_numGcm2 <- subst(r_numGcm1, from = from, to = to)
r_numGcm2 <- subst(r_numGcm2, from = as.numeric(names(cols_numGcm)),
                   to = 1:9)
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

levels(r_numGcm2) <- labels_ng
cols_ng <- labels_ng
cols_ng$label = cols_numGcm
coltab(r_numGcm2) <- cols_ng
names(r_numGcm2) <- "Level of agreement among GCMs for projected change in SEI class (under RCP4.5 2071-2100)"


# write files -------------------------------------------------------------
f1 <- paste0(names(c9b[1]), '.tif')
writeRaster(c9b, 
            file.path(path_save,f1),
            overwrite = TRUE,
            filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
            datatype = 'INT1U')

file_name <- stringr::str_replace(names(r_numGcm1), '_RCP', '_Default_RCP')
f2 <- paste0(names(r_numGcm2[1]), '.tif')
writeRaster(r_numGcm2, 
            file.path(path_save,f2),
            filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
            overwrite = TRUE,
            datatype = 'INT1U')

# testing -----------------------------------------------------------------

if(FALSE) {
  r1 <- rast(file.path(path_save,f1))
  plot(r1)
  r2 <- rast(file.path(path_save,f2))
  plot(r2)
}

