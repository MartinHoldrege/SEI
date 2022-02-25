

# dependencies ------------------------------------------------------------

library(rgee)
library(terra)
library(tmap)

# setup ee' ---------------------------------------------------------------

# before changing users I needed to run ee_clean_credentials()
# I'm not sure why but I'm needing to re-authenticate most times I 
# re-open R. When it works it pops up a google chrome window to sign
# into the google account
# ee_Initialize('mholdrege')
ee_Initialize()

# read in the data --------------------------------------------------------
ee_path <- 'projects/gee-guest/assets/SEI/'

c9_path <- paste0(
  ee_path, 'v11/transitions/SEIv11_9ClassTransition_byScenario_median_20220224')

c9 <- ee$Image(c9_path)
bands <- c9$bandNames()

# region of interests -----------------------------------------------------

#  defines the study region
biome <-  ee$FeatureCollection(paste0(ee_path, 'US_Sagebrush_Biome_2019'))
region <- biome$geometry()$bounds() # creating a box around the polygon

# visualization params ----------------------------------------------------

c9Palette = c('#000000', # stable core (black)
                 '#64AC46', # core becomes grow
                 '#ABAB4B', # core becomes impacted
                 '#2159B0', # grow becomes core
                 '#757170', # stable grow
                 '#F0FA77', # grow becomes impacted
                 '#7698D8', # impacted becomes core
                 '#B1CE94', # impacted becomes grow
                 '#D9D9D9') # stable impacted

c9Names <-  c(
  'Stable core',
  'Core becomes grow',
  'Core becomes other',
  'Grow becomes core',
  'Stable grow',
  'Grow becomes other',
  'Other becomes core',
  'Other becomes grow',
  'Stable other'
)

imageVisc9 <- list(
  min = 0,
  max = 9,
  palette = c('orange', c9Palette))

image <- c9b$select(ee$String(bands$get(0)))$unmask(ee$Image(0))
isZero <- image$eq(0)
Map$centerObject(image)
Map$addLayer(
  eeObject = image,
  visParams = imageVisc9,
  name = '9 transitions'
)

reduction <- image$reduceRegion(ee$Reducer$frequencyHistogram(), 
                                geometry = region,
                                bestEffort = TRUE);
reduction$getInfo()

rast <- ee_as_thumbnail(
  image = image,  # Image to export
  region = region, # Region of interest
  dimensions = 1024, # output dimension
  raster = TRUE,
  vizparams = list(min = 0, max = 9)
)
x <- values(rast)
length(unique(x))
unique(x)
crs(rast) <- image$projection()$crs()$getInfo()

plot(rast)

table(x)
rast[] <-scales::rescale(
  values(rast), c(0, 9)
)

table(values(rast))

stopifnot(all(values(rast) %in%  0:9))

ggplot()
tmap_mode('plot')
tm_shape(shp = rast) +
  tm_raster(
    title = "LST (°C)",
    breaks = -1:9 + 0.5,
  ) 

plot(rastZero)
