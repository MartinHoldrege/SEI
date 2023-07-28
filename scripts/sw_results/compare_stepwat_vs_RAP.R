# Purpose: compare RAP/RCMAP cover with STEPWAT simulated biomass

# Martin Holdrege

# Started: 7/27/2023



# dependencies ------------------------------------------------------------

library(tidyverse)
library(terra)
library(patchwork)
source("src/general_functions.R")
source("../grazing_effects/src/general_functions.R")
source("../grazing_effects/src/fig_params.R")
source("src/paths.R")
source("src/figure_functions.R")
source("src/Functions__DisplayItems.R")
# read in data ------------------------------------------------------------

# params ------------------------------------------------------------------

graze_level <- c("grazL" = "Light")
# PFTs for which to keep data when reading in
PFTs <- c("Sagebrush", "Pherb", "Cheatgrass", "Aforb")
run <- c('fire1_eind1_c4grass1_co20')
date <- "20230727"

# Read in data ------------------------------------------------------------

# selecting which rasters to load
# interpolated rasters of stepwat data
path_r <- "../grazing_effects/data_processed/interpolated_rasters"

# * stewpwat median biomass  --------------------------------------------
# getting historical biomass

paths <- list.files(path_r, full.names = TRUE,
                    pattern = 'bio_future_median_across_GCMs.tif') %>% 
  str_subset(pattern = run) 

sw1 <- rast(paths)

into <- c("PFT", "type", "RCP", "years", 
          "graze")

info1 <- create_rast_info(sw1, into = into)

info1 <- info1 %>% 
  filter(graze %in% graze_level,
         PFT %in% PFTs,
         RCP == "Current")

sw2 <- sw1[[info1$id]]


# *RAP/RCMAP --------------------------------------------------------------

# smoothed cover for the 2017-2020 time period. These are the layers
# from which 
files_cov <- list.files(
  path = file.path(path_large, "SEI_rasters/WAFWA30mdata"),
  pattern = "2017_2020.*560m",
  full.names = TRUE
)

rap_aherb1 <- files_cov %>% 
  str_subset("annual") %>% 
  vrt()

cov_pft <- c("sagebrush" = "sage", "pfg" = "perennial", "afg" = "annual")

# list of rasters
cov_l1 <- map2(cov_pft, names(cov_pft), function(pft, pft_name) {
  out <- files_cov %>% 
    str_subset(pft) %>% 
    vrt()
  names(out) <- pft_name
  out
})

cov1 <- rast(cov_l1)



# *SEI classification -----------------------------------------------------
# also using this as a mask
files_sc3 <- list.files(
  path = file.path(path_large, "SEI_rasters/WAFWA30mdata"),
  pattern = "2017_2020.*Q5sc3",
  full.names = TRUE
)

sc3a <- vrt(files_sc3)
names(sc3a) <- "sc3"


# prepare rasters ---------------------------------------------------------


# * cover -----------------------------------------------------------------

# masking before projecting to a coarser resolution, so that only rangeland
# 30m pixels are aggregated into 1km grid-cells. 
cov2 <- terra::mask(cov1, sc3a, maskvalues = c(NA, 0))
cov3 <- project(cov2, sw2[[1]], method = 'average', threads = TRUE)
names(cov3) <- paste0(c("cov_", "cov_", "cov_"), names(cov2))
# *stepwat ----------------------------------------------------------------

# calculate annual herbaceous
into <- c("PFT", "type", "RCP", "years", 
          "graze")
sw3 <- calc_aherb(sw2, into = into) 
stopifnot(compareGeom(sw3, cov3, res = TRUE))
sw4 <- sw3
names(sw4) <- names(sw3) %>% 
  # extracting name of PFT
  str_extract('[[:alpha:]]+(?=_biomass)')  

sw5 <- sw4[[c('Sagebrush', 'Pherb', 'Aherb')]]
names(sw5) <- paste0("sw_", c("sagebrush", "pfg", "afg"))

sw6 <- mask(sw5, cov3[[1]]) # so rasters have the same masks
cov4 <- mask(cov3, sw6[[1]])

# check cells in both  rasters are identical
stopifnot(cells(sw6[[1]]) == cells(cov4[[1]]))

# combine dataframes ------------------------------------------------------

sw_df1 <- as.data.frame(sw6)
cov_df1 <- as.data.frame(cov4)
nrow(cov_df1); nrow(sw_df1)
stopifnot(row.names(sw_df1) == row.names(cov_df1))

comb_df1 <- bind_cols(sw_df1, cov_df1)


# percentiles -------------------------------------------------------------

perc_cov1 <- rast2percentile(cov4)
perc_sw1 <- rast2percentile(sw6)
perc_comb1 <- c(perc_cov1, perc_sw1)
perc_df1 <- as.data.frame(perc_comb1)
perc_diff1 <- perc_sw1 - perc_cov1


# Maps percentiles --------------------------------------------------------

# side by side maps of stewpat biomass and RAP/RCMAP cover
PFTnames <- c('sagebrush' = 'sagebrush',  'pfg' = 'perennial grasses and forbs',
             'afg' = 'annual grasses and forbs')
PFTabbr <- names(PFTnames)
names(PFTabbr) <- PFTabbr
# lists of rasters needed in the next steps
perc_l1 <- map(PFTabbr, function(pft) {
  out <- list()
  out$sw <- perc_comb1[[paste0('sw_', pft)]]
  out$cov <- perc_comb1[[paste0('cov_', pft)]]
  out$diff <- perc_diff1[[paste0('sw_', pft)]]
  out
})


perc_inset <- modify_depth(perc_l1, .depth = 2, 
                            .f = function(x) {
                              y <- as.numeric(values(x))
                              inset_densitycountplot(y, add_vertical0 = min(y)<0)
                            })

perc_maps1 <- modify_depth(perc_l1, .depth = 2, .f = function(r) {
  s <- stars::st_as_stars(r)
  plot_map(xstars = s, st_geom_state = states, add_coords = TRUE) +
    ggplot2_map_theme() 
}) 

set.seed(123)
perc_df2 <- perc_df1 %>% 
  slice_sample(n = 100000)

# scatter plots of percentiles
perc_scatter1 <- map(names(PFTnames), function(pft) {

    x <- paste0('cov_', pft)
    y <- paste0('sw_', pft)
    
    ggplot(perc_df2, aes_string(x, y)) +
      geom_point(alpha = 0.01, size = 0.7) +
      geom_smooth() +
      labs(x = "RAP/RCMAP percentile",
           y = "STEPWAT percentile") +
      theme_classic()
      
})

# perc_maps2 <- pmap(perc_maps1, names(perc_maps1), perc_inset,
#                    perc_scatter1, .f = function(x, pft, insets, xy)



for (i in seq_along(perc_maps1)) {
  
  x <- perc_maps1[[i]] # maps
  pft <- names(perc_maps1)[[i]]
  insets <- perc_inset[[i]] # insets for map
  xy <- perc_scatter1[[i]] # scatterplots
  print(pft)
  # adding labels/colors to the main maps

  x$sw <- x$sw +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Percentile",
                         limits = c(0, 100),
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("STEPWAT biomass percentile")
  
  x$cov <- x$cov +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Percentile",
                         limits = c(0, 100),
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("RAP/RCMAP cover percentile")
  
  x$diff <- x$diff +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Percentile difference",
                         limits = c(-100, 100),
                         colors = cols_map_bio_d) + 
    add_tag_as_label("STEPWAT - RAP/RCMAP percentile")
  
  # adding the insets in
  out <- map2(insets, x, function(inset, main_map) {
    main_map +
      inset_element2(inset)
  })
  
  # top row of maps
  top <-  patchwork::wrap_plots(out[c('sw', 'cov')], nrow = 1,
                                guides = 'collect') &
    theme(legend.position = 'right')
  
  bottom <- xy + (out$diff & theme(legend.position = "right")) 
  comb <- top / bottom +
    patchwork::plot_annotation(PFTnames[pft], 
                               caption = paste('simulation settings:', 
                                               run))

  jpeg(paste0("figures/stepwat_maps/percentiles_sw_vs_RAP_", pft, "_", run, 
              "_", date, ".jpeg"),
       width = 11, height = 7, units = 'in', res = 600)
  
  print(comb)
  
  dev.off()
}




