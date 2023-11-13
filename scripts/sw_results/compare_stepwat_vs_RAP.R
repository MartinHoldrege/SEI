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
run <- c('fire1_eind1_c4grass1_co20_2311')
date <- "20231113"
cap1 <- paste0('simulation settings: ', 
              run, "_", names(graze_level))
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
# from Dave T. that I aggregated to 1km in the 00_aggregate_cover.R script
cov3 <- rast("data_processed/cover/cover_SEIv11_2017_2020_1km_560msmooth_20211228.tif")

# historical median and 95 percentile cover (i.e. over years), smoothed over 2km, taking the neighborhood
# median and 95th percentile, respectively. created in the 01_RAP_percentiles_lyr.js

smooths <- c(707, 2000, 5000, 10000) # how big the neighborhood was

for (smooth in smooths) {
  
year_start <- 1986
year_end <- 2021
perc1 <- rast(paste0("data_processed/cover/cover_rap-rcmap_", 
                     year_start, "_", year_end, "_1000m_",
                     smooth, "msmooth_20230905.tif"))


# climate data ------------------------------------------------------------

cellnums1 <- rast("../grazing_effects/data_processed/interpolation_data/cellnumbers.tif")
clim_df1 <- read_csv("../grazing_effects/data_processed/interpolation_data/clim_for_interpolation.csv",
                     show_col_types = FALSE)

# prepare rasters ---------------------------------------------------------

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
PFTabbr <- c("sagebrush", "pfg", "afg")
names(PFTabbr) <- PFTabbr
names_sw <- paste0('sw_', PFTabbr)
names(names_sw) <- PFTabbr

names(sw5) <- names_sw

sw6 <- mask(sw5, cov3[[1]]) # so rasters have the same masks


# * percentile cover ------------------------------------------------------

names(perc1) <- names(perc1) %>% 
  str_to_lower %>% 
  paste0('cov_', .)

perc2 <- project(perc1, sw6[[1]], threads = TRUE)

perc3 <- mask(perc2, sw6[[1]])
sw6 <- mask(sw6, perc3[[1]])
cov4 <- mask(cov3, sw6[[1]])

# check cells in both  rasters are identical
stopifnot(cells(sw6[[1]]) == cells(cov4[[1]]) &  
                                     cells(sw6[[1]])== cells(perc3[[1]]))

# combine dataframes ------------------------------------------------------

comb_r1 <- c(sw6, cov4, perc3)
comb_df1 <- as.data.frame(comb_r1)


# percentiles -------------------------------------------------------------

perc_comb1 <- rast2percentile(comb_r1)
perc_df1 <- as.data.frame(perc_comb1)
perc_diff1 <- perc_comb1[[names_sw]] - perc_comb1[[paste0('cov_', PFTabbr)]]
names(perc_diff1) <- PFTabbr
perc_diff_df1 <- as.data.frame(perc_diff1)


# same rasters but percentile based cover
pcents <- c(95, 95, 50) # percentiles calculated through space
pcent_time <- 50 # percentile calculated over years
names_perc <- paste0('cov_', PFTabbr, "_p", pcent_time, "_p", c(95, 95, 50))

names(names_perc) <- PFTabbr

# for figure captions
perc_descript <- paste0('Cover summarized by calculating the ', pcent_time, 
                     'th percentile through time \n(', year_start, "-", year_end,
                     ') and ', pcents, 'th percentile through space (', smooth/1000, ' km radius)')
names(perc_descript) <- PFTabbr

perc_diffp1 <- perc_comb1[[names_sw]] - perc_comb1[[names_perc]]
names(perc_diffp1) <- PFTabbr
perc_diff_dfp1 <- as.data.frame(perc_diffp1)


# Maps percentiles -------------------------------------------------

# side by side maps of stewpat biomass and RAP/RCMAP cover percentiles,
# percentile difference and a scatterplot

PFTnames <- c('sagebrush' = 'sagebrush',  'pfg' = 'perennial grasses and forbs',
             'afg' = 'annual grasses and forbs')


# lists of rasters needed in the next steps (and also in the next section)
perc_l1 <- map(PFTabbr, function(pft) {
  out <- list()
  out$sw <- perc_comb1[[paste0('sw_', pft)]]
  out$cov <- perc_comb1[[paste0('cov_', pft)]]
  out$covp <- perc_comb1[[names_perc[pft]]]
  out$diff <- perc_diff1[[pft]]
  out$diffp <- perc_diffp1[[pft]]
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

# * historic cover-------------------------------------------------
set.seed(123)
perc_df2 <- perc_df1 %>% 
  slice_sample(n = 100000)

# RAP/RCMAP cover calculated
# by taking a the percentile through time and through space (e.g. 95th percentile)

# scatter plots of percentiles
perc_scatterp1 <- map(PFTabbr, function(pft) {
  
  x <- names_perc[pft]
  y <- paste0('sw_', pft)
  
  ggplot(perc_df2, aes(.data[[x]], .data[[y]])) +
    geom_point(alpha = 0.01, size = 0.7) +
    geom_smooth() +
    labs(x = "RAP/RCMAP percentile",
         y = "STEPWAT percentile") +
    theme_classic()
})


for (i in seq_along(perc_maps1)) {
  
  x <- perc_maps1[[i]] # maps
  pft <- names(perc_maps1)[[i]]
  insets <- perc_inset[[i]] # insets for map
  xy <- perc_scatterp1[[i]] # scatterplots
  print(pft)
  # adding labels/colors to the main maps
  
  x$sw <- x$sw +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Percentile",
                         limits = c(0, 100),
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("STEPWAT biomass percentile")
  
  x$covp <- x$covp +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Percentile",
                         limits = c(0, 100),
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("RAP/RCMAP cover percentile")
  
  x$diffp <- x$diffp +
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
  top <-  patchwork::wrap_plots(out[c('sw', 'covp')], nrow = 1,
                                guides = 'collect') &
    theme(legend.position = 'right')
  
  bottom <- xy + (out$diffp & theme(legend.position = "right")) 
  comb <- top / bottom +
    patchwork::plot_annotation(PFTnames[pft], 
                               caption = paste(perc_descript[[pft]], 
                                                "\n", cap1))
  
  jpeg(paste0("figures/stepwat/percentiles/percentiles_sw_vs_historic-RAP_", pft, "_", run, 
              "_", date, "_", smooth, "msmooth.jpeg"),
       width = 11, height = 7, units = 'in', res = 600)
  
  print(comb)
  
  dev.off()
}
} # end looping over smooths

# SW & RAP biomass maps ---------------------------------------------------
# side by side maps SW biomass and RAP (historic) biomass

pdf(paste0("figures/stepwat/sw_and_rap_bio-maps_", run, 
            "_", date, ".pdf"),
     width = 11, height = 7)

for (pft in PFTabbr) {

  rsw <- comb_r1[[names_sw[pft]]]
  rp <- comb_r1[[names_perc[pft]]]
  
  msw <-  plot_map(xstars = stars::st_as_stars(rsw), 
                   st_geom_state = states, add_coords = TRUE) +
    ggplot2_map_theme() +
    scale_fill_gradientn(na.value = 'transparent',
                         name = lab_bio0,
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("STEPWAT biomass") +
    inset_element2(inset_densitycountplot(as.numeric(values(rsw)), 
                                          add_vertical0 = FALSE))
    
  mp <- plot_map(xstars = stars::st_as_stars(rp), 
                 st_geom_state = states, add_coords = TRUE) +
    ggplot2_map_theme() +
    scale_fill_gradientn(na.value = 'transparent',
                         name = "Cover",
                         colors = cols_map_bio(10)) + 
    add_tag_as_label("RAP/RCMAP cover") +
    inset_element2(inset_densitycountplot(as.numeric(values(rp)), 
                                          add_vertical0 = FALSE))
    
    
  tmp <- (msw + mp) +
    patchwork::plot_annotation(PFTnames[pft], 
                               caption = paste(perc_descript[[pft]], 
                                               "\n", cap1))
  print(tmp)
}
dev.off()

# prepare climate data ----------------------------------------------------


cell_df <- values(cellnums1) %>% 
  as.data.frame()
names(cell_df) <- "cellnumber"

clim_df2 <- cell_df %>% 
  left_join(clim_df1, by = "cellnumber") %>% 
  select(-site_id)

clim1 <- rast(cellnums1, nlyrs = ncol(clim_df2))

values(clim1) <- as.matrix(clim_df2)
names(clim1) <- names(clim_df2)

clim2 <- crop(clim1, sw6) %>% 
  mask(sw6[[1]])

compareGeom(clim1, sw6)
clim_df3 <- as.data.frame(clim2) %>% 
  select(bio1, bio12, bio15, bio18) %>% 
  rename("MAT" = "bio1",
         "MAP" = "bio12",
         "ppt_cv_intra" = "bio15",
         "ppt_warm_quart" = "bio18")

# compare climate data to percentile difference ---------------------------

stopifnot(row.names(clim_df3) == row.names(perc_diff_df1))

clim_df4 <- bind_cols(clim_df3, perc_diff_dfp1) 

clim_df5 <- clim_df4 %>% 
  pivot_longer(cols = all_of(names(clim_df3)),
               names_to = "climate_var")

clim_df_samp <- clim_df5 %>% 
  slice_sample(n = 1e5)

clim_figs1 <- map(PFTabbr, function(pft) {
  ggplot(data = clim_df_samp, 
         aes(x  = .data[['value']], y = .data[[pft]], )) +
    geom_point(alpha = 0.05, size = 0.7) +
    geom_smooth() +
    facet_wrap(~climate_var, scales = "free_x") +
    labs(x = "Climate variable",
         y = "Percentile difference (STEPWAT - RAP/RCMAP)",
         subtitle = "Percentile difference by climate variable",
         title = PFTnames[pft],
         caption = paste(perc_descript[[pft]], 
                         "\n", cap1)) +
    theme_classic()
})


pdf(paste0("figures/stepwat/percentile_diffs_vs_climate_", run, 
            "_", date, ".pdf"),
     width = 8, height = 7)

for (fig in clim_figs1) {
  print(fig)
}

dev.off()
