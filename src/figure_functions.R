
source("src/Functions__DisplayItems.R")
source("src/fig_params.R")
library(dplyr)
library(ggplot2)
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
  ifelse(rcp == "Current", "(Historical)", paste0("(",rcp,", ",years, ")"))
}


# ggplot themes -----------------------------------------------------------

theme_custom1 <- function() {
  theme_bw() %+replace%
  theme(panel.grid.major = element_blank(),
        panel.grid.minor = element_blank(), 
        axis.line = element_line(colour = "black"),
        strip.background = element_blank())
}

# ggplot basemap objects --------------------------------------------------

# basemap for ggplot maps
# basemap1 <- function(bbox = NULL) {
#   
#   if (is.null(bbox)) {
#     bbox <- bbox1
#   }
#   # bounding box
#   xlim = c(bbox[c('xmin', 'xmax')])
#   ylim = c(bbox[c('ymin', 'ymax')])
#   
# 
#   
#   list(
#     geom_sf(data = states, fill = NA, color = 'black'),
#     coord_sf(xlim = xlim,
#              ylim = ylim,
#              expand = FALSE),
#     theme_custom1(),
#     theme(axis.text = element_blank(),
#           axis.ticks = element_blank())
#     
#   )
# }
# 
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
                           add_vertical0 = FALSE,
                           values = NULL
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
                         colors = colors,
                         values = values) +
    add_tag_as_label(tag_label) 
  
  map + inset_element2(inset)
  
}

# this function relies on 
plot_map2 <- function(r, ...)  {
  
  
  s <- stars::st_as_stars(r)
  
  map <- plot_map(s, 
                  st_geom_state = states,
                  add_coords = TRUE,
                  ...) +
    ggplot2_map_theme()

  map
  
}


# colors ------------------------------------------------------------------

scale_fill_c9 <- function(...) {
  scale_fill_manual(values = unname(c('transparent', c9Palette)), ...)
}


# fig labels --------------------------------------------------------------


#' create legend labels
#'
#' @param x numeric vector of break points
#'
#' @return character vector, where last category is just
#' > x[n-1] instead of showing a range

#' @examples
#' label_creator(1:5)
label_creator <- function(x, convert2percent = FALSE) {
  if(convert2percent) x <- x*100
  
  n <- length(x)
  labels <- vector(mode = 'character', length = n-1)
  
  for (i in 1:(n-1)) {
    if(i < n -1) {
      labels[i] <- paste(x[i], "to", x[i+1])
    } else {
      labels[i] <- paste(">", x[i])
    }
  }
  
  labels
}

# color matrix (to add to other plots) ------------------------------------

# create 9 color matrix ---------------------------------------------------
# Creating a 3x3 colored matrix of current and future SEI classes,

c3_levels <- c('CSA', 'GOA', 'ORA')

# c9 levels, with there associated current and future SEI categories
df_c9 <- tibble(
  c9Name  = c9Names, 
  c9Value = 1:9,
  current = rep(c3_levels, each = 3), # Current SEI (3 levels)
  future = rep(c3_levels, 3) # future SEI (3 levels)
) %>% 
  mutate(
    current = factor(current, levels = rev(c3_levels)),
    future = factor(future, levels = c3_levels)
  )

# Adding label column (category of change)
df_c9$label <- NA
df_c9$label[c(1, 5, 9)] <- "Stable"
df_c9$label[c(2, 3, 6)] <- "Decline"
df_c9$label[c(4, 7, 8)] <- "Increase"

# color of text in color matrix
text_color <- rep('black', 9)
text_color[c(1, 3, 7)] <- 'white' # background is dark
names(text_color) <- c9Names

color_matrix <- function() {
  ggplot(df_c9, aes(future, current, fill = c9Name)) +
    geom_tile() +
    geom_text(aes(label = label, color = c9Name), size = 2) +
    theme_minimal() +
    scale_x_discrete(position = 'top') +
    scale_fill_manual(values = c9Palette) +
    labs(x = "Future",
         y = "Current") +
    scale_color_manual(values = text_color)+
    theme(panel.grid = element_blank(),
          legend.position = 'none',
          text = element_text(size = 8),
          plot.background = element_rect(fill = 'white', color = 'white'))
}

if(FALSE){
png("figures/c9_color_matrix.png",
    width = 3.5, height = 2.5, units = 'in',
    res = 600)
color_matrix()
dev.off()
}
inset_color_matrix <-  function() {
  patchwork::inset_element(
    color_matrix(),
    0.002, 0.002, 360 / 1133, 230 / 1236, # left, bottom, right, top in npc units
    align_to = "panel",
    clip = TRUE,
    ignore_tag = TRUE
  )
}

