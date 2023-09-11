
source("src/Functions__DisplayItems.R")

# crs -----------------------------------------------------------------------

# the crs to be used for the sagebrush conservation design (this is the same
# one as used by NLCD)
crs_scd <- terra::crs("PROJCRS[\"Albers_Conical_Equal_Area\",\n    BASEGEOGCRS[\"WGS 84\",\n        DATUM[\"World Geodetic System 1984\",\n            ELLIPSOID[\"WGS 84\",6378137,298.257223563,\n                LENGTHUNIT[\"metre\",1]]],\n        PRIMEM[\"Greenwich\",0,\n            ANGLEUNIT[\"degree\",0.0174532925199433]],\n        ID[\"EPSG\",4326]],\n    CONVERSION[\"Albers Equal Area\",\n        METHOD[\"Albers Equal Area\",\n            ID[\"EPSG\",9822]],\n        PARAMETER[\"Latitude of false origin\",23,\n            ANGLEUNIT[\"degree\",0.0174532925199433],\n            ID[\"EPSG\",8821]],\n        PARAMETER[\"Longitude of false origin\",-96,\n            ANGLEUNIT[\"degree\",0.0174532925199433],\n            ID[\"EPSG\",8822]],\n        PARAMETER[\"Latitude of 1st standard parallel\",29.5,\n            ANGLEUNIT[\"degree\",0.0174532925199433],\n            ID[\"EPSG\",8823]],\n        PARAMETER[\"Latitude of 2nd standard parallel\",45.5,\n            ANGLEUNIT[\"degree\",0.0174532925199433],\n            ID[\"EPSG\",8824]],\n        PARAMETER[\"Easting at false origin\",0,\n            LENGTHUNIT[\"metre\",1],\n            ID[\"EPSG\",8826]],\n        PARAMETER[\"Northing at false origin\",0,\n            LENGTHUNIT[\"metre\",1],\n            ID[\"EPSG\",8827]]],\n    CS[Cartesian,2],\n        AXIS[\"easting\",east,\n            ORDER[1],\n            LENGTHUNIT[\"metre\",1,\n                ID[\"EPSG\",9001]]],\n        AXIS[\"northing\",north,\n            ORDER[2],\n            LENGTHUNIT[\"metre\",1,\n                ID[\"EPSG\",9001]]]]")



# bounding boxes ----------------------------------------------------------

bbox1 <- sf::st_bbox(c(xmin = -2240000, 
           xmax = -454000,
           ymin = 1257000, ymax = 3162000))



# polygons for basemaps ---------------------------------------------------

states <- sf::st_as_sf(spData::us_states) %>% 
  sf::st_transform(crs = crs_scd)


# label functions ---------------------------------------------------------

rcp_label <- function(rcp, years) {
  if (rcp == "Current") {
    "(Historical)"
  } else {
    paste0("(",rcp,", ",years, ")")
  }
}

# ggplot basemap objects --------------------------------------------------

# basemap for ggplot maps
basemap1 <- function(bbox = NULL) {
  
  if (is.null(bbox)) {
    bbox <- bbox1
  }
  # bounding box
  xlim = c(bbox[c('xmin', 'xmax')])
  ylim = c(bbox[c('ymin', 'ymax')])
  

  
  list(
    geom_sf(data = states, fill = NA, color = 'black'),
    coord_sf(xlim = xlim,
             ylim = ylim,
             expand = FALSE),
    theme_void()
  )
}

# ggplot() +
#   basemap1()



inset_element2 <- function(x) {
  patchwork::inset_element(
    x,
    0.005, 0.005, 360 / 1133, 230 / 1236, # left, bottom, right, top in npc units
    align_to = "panel",
    clip = TRUE,
    ignore_tag = TRUE
  )
}

# this function relies on 
# source("src/Functions__DisplayItems.R") (Daniels functions)
plot_map_inset <- function(r,
                           colors = colors,
                           tag_label = "",
                           scale_name = NULL,
                           limits = NULL,
                           add_vertical0 = FALSE
)  {
  
  
  limits_inset <- if(is.null(limits))  {
    c(NA, NA)
  }  else 
    limits
  
  inset <- inset_densitycountplot(as.numeric(values(r)),
                                  limits = limits_inset,
                                  add_vertical0 = add_vertical0)
  
  s <- stars::st_as_stars(r)
  
  map <- plot_map(s, 
                  st_geom_state = states,
                  add_coords = TRUE) +
    ggplot2_map_theme() +
    scale_fill_gradientn(na.value = 'transparent',
                         limits = limits,
                         name = scale_name,
                         colors = colors) +
  add_tag_as_label(tag_label) 
  
  map + inset_element2(inset)
  
}
