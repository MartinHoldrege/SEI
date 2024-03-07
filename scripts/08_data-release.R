# Purpose:
# Combine tiles output by GEE into cloud optimized geotiffs for
# the data release.

# Started: February 21, 2024

# Author: Martin Holdrege


# dependencies ------------------------------------------------------------
library(terra)
library(tidyverse)
source('src/general_functions.R')
source('src/fig_params.R')


# params ------------------------------------------------------------------

v <- 'vsw4-3-4' # version (this one is based on SEI v11)
rcps <- c('RCP45', 'RCP85')
years <- c('2030-2060', '2070-2100')
years_cur <- c('2017_2020')
runs <- c('fire0_eind1_c4grass1_co20', 'fire1_eind1_c4grass1_co20_2311',
          'fire1_eind1_c4grass0_co20_2311', 'fire1_eind1_c4grass1_co21_2311')
default <- 'fire1_eind1_c4grass1_co20_2311'
resolution <- 90

# dataframe of the possible scenarios
df_scen <- expand_grid(
  rcp = rcps,
  year = years,
  run = runs
) 


# functions ---------------------------------------------------------------

run_scenario <- function(x) {
  name <- run2name(x, for_filename = TRUE)
  # the rcp and time-period
  scenario <- str_extract(x, 'RCP\\d{2}_\\d{4}\\-\\d{4}') %>% 
    update_yr()
  
  paste0(name, '_', scenario, '.tif')
}
# read in data ------------------------------------------------------------

# path to where tiles etc. are stored
path <- "D:/USGS/large_files/SEI_rasters/"


# *SEI --------------------------------------------------------------------
# 'current' SEI and Q
p_cur <- list.files(file.path(path, 'tiles'), 
                    paste0('SEI-Q_v11_', years_cur, '_', resolution),
                    full.names = TRUE)
vrt_cur <- vrt_bandnames(p_cur) # reads in vrt but keeps original band names

# 'future' SEI
sei_regex <- paste0('SEI_', v, '_', df_scen$run, '_', df_scen$rcp, '_', 
                    df_scen$year, '_', resolution)

names(sei_regex) <- sei_regex
p_fut <- map(sei_regex, function(x) {
  list.files(file.path(path, 'tiles'), x, full.names = TRUE)
})

test <- map_dbl(p_fut, length)
stopifnot(test >= 0) # check files matching each regex were found

sei_fut_l <- map(p_fut, function(paths) {
  out <- vrt_bandnames(paths)
  names(out) <- names(out) %>% 
    str_replace('__', '_') # removing accidental double underscore
  out
})
sei_fut_l
# * c9 ----------------------------------------------------------------------

p_c9 <- list.files(file.path(path, 'tiles'), 
                   paste0('c9_', v, '.*', resolution, 'm.tif'), 
                   full.names = TRUE)
names(p_c9) <- basename(p_c9)
# checking if files contain coordinates in the names
if(any(str_detect(p_c9, "\\d{10}.tif"))) {
  stop('c9 files contain tiles, must be read in with vrt_bandnames()')
}

c9_l1 <- map(p_c9, rast)

# Qs ----------------------------------------------------------------------

q_regex <- df_scen %>% 
  #filter(run == default) %>% 
  mutate(regex = paste0('Q_', v, "_", run, '_', rcp,  '_', year)) %>% 
  pull(regex)

names(q_regex) <- q_regex

p_q <- map(q_regex, function(x) {
  list.files(file.path(path, 'tiles'), x, full.names = TRUE)
})

q_l1 <- map(p_q, vrt_bandnames)


# preparing rasters -------------------------------------------------------

# *c9 ---------------------------------------------------------------------
# define colors so that if raster is viewed the categories will show up 
# with the same colors as used in the manuscript. 
c9cols <- data.frame(cell_value = 1:9, 
                     colors = c9Palette)

# update the colors of layers of all the rasters
c9_l2 <- map(c9_l1, function(x) {
  # setting the color table didn't work 
  # error received upon writing: 'SetColorTable() not supported for multi-sample TIFF files. (GDAL error 6)'
  RGB(x) <- NULL
  x <- subst(x, from = 0, to = NA) # so output files have NAs instead of 0s
  # for(lyr in 1:nlyr(x)) {
  #   coltab(x, layer = lyr) <- c9cols
  # }

  x
})


# * Q -----------------------------------------------------------------------
q_l2 <- q_l1
# r <- spatSample(q_l2[[1]][[1]], size = 1e5, as.raster = TRUE)
# plot(r)

# writing rasters ---------------------------------------------------------


# * current ---------------------------------------------------------------

writeRaster(vrt_cur, file.path(path, 'data_publication2',
                               paste0('SEI-Q_v11_', 
                                      str_replace(years_cur, '_', '-'), 
                                      '.tif')),
            filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
            overwrite = TRUE)


# * sei future ------------------------------------------------------------

out_names <- paste0('SEI_', run_scenario(names(sei_fut_l)))

map2(sei_fut_l, out_names, function(x, name) {
  writeRaster(x, file.path(path, 'data_publication2', name),
              filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
              overwrite = TRUE)
})


# * c9 --------------------------------------------------------------------

out_names <- paste0('c9_', run_scenario(names(c9_l2)))

map2(c9_l2, out_names, function(x, name) {
  writeRaster(x, file.path(path, 'data_publication2', name),
              filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
              overwrite = TRUE,
              datatype = 'INT1U')
})


# *Q ----------------------------------------------------------------------

out_names <- paste0('Q_', run_scenario(names(q_l2)))

dir.create(file.path(path, 'temp_not_cog'))
# because of error problems, writing first to regular tif
# then reading that in and saving as a COG
map2(q_l2, out_names, function(x, name) {
  writeRaster(x, file.path(path, 'temp_not_cog', name),
              overwrite = TRUE)
})

rm(list = ls()[ls() != 'path']) # in case errors were caused by memory issues

q_files <- list.files(file.path(path, 'temp_not_cog'),
                      '.tif$')
names(q_files) <- q_files

map(q_files[16], function(name) {
  r <- rast(file.path(path, 'temp_not_cog', name))
  writeRaster(r, file.path(path, 'data_publication2', name),
              filetype = "COG", wopt = list(gdal = "COMPRESS=DEFLATE"),
              overwrite = TRUE)
})


# rename files ------------------------------------------------------------

# renaming, b/ got request for shorter names for data pub

old_names <- list.files(file.path(path, 'data_publication2'),
                        '.tif', full.names = TRUE)
new_names <- basename(old_names) %>% 
  str_replace('Fertilization', 'Fert') %>% 
  str_replace('C4GrassExp', 'C4Exp')

file.rename(from = old_names,
            to = file.path(path, 'data_publication2', new_names))
