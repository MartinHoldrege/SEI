# Purpose: clip the raster that will be used as for the mask, and save
# as a tif to ingest into GEE

library(terra)
library(magrittr)

folder <- 'D:/USGS/large_files/SEI_GYE'
r <- rast(file.path(folder, 'data_raw', 'ThreatBasedEcostates_SageBiome.gdb'))

gye <- sf::st_read(file.path(folder, 'data_raw', 
                             "GRYN_GYA_Boundary_Custom/GRYN_GYA_Boundary_AOA_Area.shp"))

gye_buf <- sf::st_buffer(gye, dist = 10000) # make larger to leave extra room

gye_buf2 <- gye_buf %>% 
  sf::st_transform(crs(r)) %>% 
  vect()
r2 <- crop(r, gye_buf2) %>% 
  terra::project('EPSG:4326')
r3 <- as.numeric(r2)
terra::writeRaster(r3, file.path(folder, 'data_processed', 
                                 'ThreatBasedEcostates_GYE.tif'),
                   overwrite = TRUE, datatype = "INT2U")

r4 <- rast( file.path(folder, 'data_processed', 
                      'ThreatBasedEcostates_GYE.tif'))
r4
plot(r4)
