# Purpose: For data from the 200 stepwat sites compare response (e.g.,
# proportional change in cover) to climate variables 

# Author: Martin Holdrege

# Script started Oct 2, 2023


# params ------------------------------------------------------------------


# dependencies ------------------------------------------------------------

library(tidyverse)

# for scaled_change function
source('../grazing_effects/src/general_functions.R')
source("../grazing_effects/src/fig_params.R") # for axis labels etc
source("src/figure_functions.R")
theme_set(theme_custom1())
# read in data ------------------------------------------------------------

# biomass & cover by climate scenario, site etc. 
# file created in 01_ca_compile-sw-site-data.R
bio1 <- read_csv("data_processed/sw_sites/cover_mean_by_site-PFT_v1.csv")


# current climate ---------------------------------------------------------

clim_cur1 <- bio1 %>% 
  filter(RCP == 'Current') %>% 
  select(site, MAT, MAP) %>% 
  distinct()

stopifnot(nrow(clim_cur1) == 200)

# calculate change --------------------------------------------------------
clim_vars <- c("MAT", "MAP")


# * cover -----------------------------------------------------------------

bio1 <- bio1 %>% 
  filter(graze == "Light") %>% 
  mutate(id = str_replace(id, '_Light', ''))

# for each GCM, time period etc. the % change in cover relative to 
# current contitions
diff0 <- scaled_change(bio1, 
                          var = 'cover',
                          by = c("PFT", 'run', 'graze'), 
                          percent = TRUE, 
                          divide_by_max = FALSE,
                          within_GCM = FALSE) %>% 
  rename(cover_prop = cover_diff) %>% 
  select(-all_of(clim_vars)) %>% 
  left_join(clim_cur1)

# percentage point change cover
diff_abs0 <- scaled_change(bio1, 
                           var = 'cover',
                           by = c("PFT", 'run', 'graze'), 
                           percent = FALSE, 
                           divide_by_max = FALSE,
                           within_GCM = FALSE) 

diff1 <- diff_abs0 %>% 
  select(run, id, PFT, GCM, site, cover_diff) %>% 
  right_join(diff0)

# median across GCMs
diff_med1 <- diff1 %>% 
  group_by(run, site, id, graze, RCP, years, PFT) %>% 
  summarise(cover_prop = median(cover_prop),
            cover_diff = median(cover_diff),
            .groups = 'drop') %>% 
  left_join(clim_cur1)

# cover current vs future 
cur_fut1 <- bio1 %>% 
  filter(RCP == 'Current') %>% 
  select(-RCP, -GCM, -years, -id) %>% 
  right_join(filter(bio1, RCP != 'Current'),
             by = c('run', 'graze', 'PFT', 'site'),
             # current and future
             suffix = c('_cur', '_fut')) 

vars_tmp1 <- c('run', 'graze', 'PFT', 'site', 'id', 'RCP', 'years', 'GCM')

# historical values (1 provided for each GCM etc)
tmp1 <- cur_fut1 %>% 
  select(all_of(vars_tmp1), matches('_cur$')) %>% 
  mutate(GCM = 'Historical') %>% 
  rename_with(.fn = \(x) str_replace(x, "_cur$", ""))

# future values
tmp2 <- cur_fut1 %>% 
  select(all_of(vars_tmp1), matches('_fut$')) %>% 
  rename_with(.fn = \(x) str_replace(x, "_fut$", ""))

# for each RCP/time period there is a 'historical' GCM which represents 
# the historical values 
cur_fut_long1 <- bind_rows(tmp1, tmp2) %>% 
  left_join(clim_cur1, by = 'site',
            suffix = c("", "_cur"))

cur_fut_med1 <- cur_fut1 %>% 
  group_by(run, graze, PFT, site, years, RCP, id) %>% 
  summarise(across(matches('_(cur)|(fut)$'), .fns = median))

# * climate ---------------------------------------------------------------

diff_clim1 <- bio1 %>% 
  select(RCP, years, GCM, site, graze,  all_of(clim_vars)) %>% 
  distinct() %>% 
  scaled_change_2var(vars = clim_vars[1:2],
                     # only have 1 grazing level so it isn't needed here
                     # except for the function to work
                    by = c("graze"),
                    percent = FALSE) %>% 
  select(-graze) %>% 
  distinct()

clim_vars_diff <- paste0(clim_vars, "_diff")

# median delta clim across sites for each GCM
diff_clim_med1 <- diff_clim1 %>% 
  group_by(RCP, years, GCM) %>% 
  summarize(across(.cols = c(all_of(clim_vars), all_of(clim_vars_diff)),
                   .fns = median))

diff2 <- diff_clim_med1 %>% 
  select(RCP, years, GCM, all_of(clim_vars_diff)) %>% 
  right_join(diff1)

# names of GCM sorted from greatest to least median temp increases
GCM_names <- diff_clim_med1 %>% 
  ungroup() %>% 
  filter(RCP == 'RCP45', years == '2070-2100') %>% 
  arrange(MAT_diff) %>% 
  pull(GCM) %>% 
  unique()


# * convert GCM cols to factors -------------------------------------------

cur_fut_long1 <- cur_fut_long1 %>% 
  mutate(GCM = factor(GCM, levels = c("Historical", GCM_names)))

diff2 <- diff2 %>% 
  mutate(GCM = factor(GCM, levels = GCM_names))

diff_clim1 <- diff_clim1 %>% 
  mutate(GCM = factor(GCM, levels = GCM_names))

# fig params --------------------------------------------------------------

cols_GCM1 <- colorRampPalette(
  colors = rev(RColorBrewer::brewer.pal(11, 'RdYlBu'))
)(length(GCM_names))

names(cols_GCM1) <- GCM_names
cols_GCM2 <- c('Historical' = 'black', cols_GCM1)

# % change vs clim --------------------------------------------------------

runs <- unique(bio1$run) %>% 
  sort()
pfts <- unique(bio1$PFT)
iter <- expand_grid(run = runs,
                    pft = pfts
                    )

pdf('figures/climate_attribution/sw_sites/prop-change_vs_clim_v2.pdf')

for(i in 1:nrow(iter)) {
  
  r <- iter$run[i]
  p <- iter$pft[i]
  
  cap1 <- paste('simulation settings:', r, 
                '\neach point represents one STEPWAT site')
  
  diff_tmp <- diff_med1 %>% 
    filter(.data$run == r, PFT == p) 
  
  g <- ggplot(diff_tmp, aes(y = cover_prop)) +
    facet_grid(years~RCP) +
    labs(title = p,
         y = "% change in cover", 
         caption = cap1)
  
  
  g2 <- g +
    geom_point(aes(x = MAT)) +
    geom_smooth(aes(x = MAT), se = FALSE)
  print(g2)
  
  if(p == 'sagebrush') {
    print(
      g + 
        geom_point(aes(x = MAT)) +
        geom_smooth(aes(x = MAT), se = FALSE) +
        labs(caption = paste(cap1, '(ylim restricted)')) +
        ylim(c(-70, 100))
    )
  }
  
  g2 <- g +
    geom_point(aes(x = MAP)) +
    geom_smooth(aes(x = MAP), se = FALSE)
  print(g2)
  if(p == 'sagebrush') {
    print(
      g + 
        geom_point(aes(x = MAP)) +
        geom_smooth(aes(x = MAP), se = FALSE) +
        labs(caption = paste(cap1, '(ylim restricted)')) +
        ylim(c(-70, 100))
    )
  }
 

# * heatmap ---------------------------------------------------------------
  # MAT and MAP and x and y and z is change in cover
  
  df_l <- split(diff_tmp, diff_tmp$id)
  df <- df_l[[1]]
  
  # interpolating to create an even grid
  inter_cover_diff <- map_dfr(df_l, function(df) {
    grid <- akima::interp(x = df$MAT, y = df$MAP, z = df$cover_diff, nx = 30, 
                             ny = 30)
    grid <- akima::interp2xyz(grid, data.frame = TRUE) %>% 
      rename(MAT = x, MAP = y,  cover_diff = z)
    grid$RCP <-  unique(df$RCP)
    grid$years <-  unique(df$years)
    grid
  }, .id = 'id')
  
  
  g <- ggplot(inter_cover_diff, aes(x = MAT, y = MAP, z= cover_diff))  +
    geom_contour_filled() +
    facet_grid(years~RCP) +
    labs(caption = paste0('simulation settings: ', r),
         title = p,
         subtitle = "Change in cover (interpolated)
         (x and y axes show climate under historical conditions)") +
    guides(fill = guide_legend(title = lab_cov1))
  
  print(g)

# * cover vs clim ---------------------------------------------------------

   
  # figures of current and future cover vs climate by RCP
  df <- cur_fut_med1 %>% 
    filter(PFT == p)
  
  # don't want to fit the smoother to the outliers of temperature
  df_trim1 <- df %>%
    ungroup() %>% 
    filter(MAT_cur > (min(MAT_cur) + 1) & MAT_cur < (max(MAT_cur) - 1))
  
  df_trim2 <- df %>%
    ungroup() %>% 
    filter(MAP_cur > (min(MAP_cur) + 10) & MAP_cur < (max(MAP_cur) - 10))
  
  l <- map(clim_vars, function(var) {
    df2 <- if(var == 'MAT') df_trim1 else df_trim2
    xname <- paste0(var, '_cur')
    ggplot(df, aes(x = .data[[xname]])) +
      geom_point(aes(y = cover_cur, color = 'Historical'), alpha = 0.2) +
      geom_point(aes(y = cover_fut, color = 'Future'), alpha = 0.2) +
      geom_smooth(data = df2, 
                  aes(x = .data[[xname]], y = cover_cur, color = 'Historical'),
                  se = FALSE) +
      geom_smooth(data = df2, 
                  aes(x = .data[[xname]], y = cover_fut, color = 'Future'), 
                  se = FALSE) +
      facet_wrap(~id) +
      labs(x = paste(var, "(Historical)"),
           y = lab_cov0,
           caption = cap1,
           title = p) +
      scale_color_manual(values = c('Historical' = 'blue', 'Future' = 'darkred'),
                         name = 'Time Period')
  })

  print(l)

}


dev.off()


# responses by GCM -------------------------------------------------------

pdf('figures/climate_attribution/sw_sites/change_vs_clim_by_GCM_v2.pdf',
    width = 9)


# * compare GCMs ----------------------------------------------------------

g <- ggplot(diff_clim1, aes(x = GCM, fill = GCM)) +
  labs(subtitle = 'Range in climate change across STEPWAT sites')+
  facet_grid(years~RCP) +
  scale_fill_manual(values = cols_GCM1)+ 
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1))+
  theme(legend.position = 'none')

g +
  geom_boxplot(aes(y = MAT_diff)) +
  labs(y = lab_mat1)

g +
  geom_hline(yintercept = 0, linetype = 2) +
  geom_boxplot(aes(y = MAP_diff))  +
  labs(y = lab_map1) 

for(i in 1:nrow(iter)) {
  
  r <- iter$run[i]
  p <- iter$pft[i]
  
  cap1 <- paste('simulation settings:', r)
  

# * proportional/absolute change ------------------------------------------
# cover change vs climate
  
  df <- diff2 %>% 
    filter(.data$run == r, PFT == p)
  

  g <- ggplot(df, aes(y = cover_prop, color = GCM)) +
    facet_grid(years~RCP) +
    labs(title = p,
         caption = cap1) +
    geom_hline(yintercept = 0, linetype = 2) +
    scale_color_manual(values = cols_GCM1)
  
  l <- map(clim_vars, \(x) {
    g +
      geom_smooth(aes(x = .data[[x]], y = cover_prop), se = FALSE)+
      labs(y = lab_cov2,
           x = paste0(x, "(Historical)"))
  })
  print(l)
  
  l <- map(clim_vars, \(x) {
    g +
      geom_smooth(aes(x = .data[[x]], y = cover_diff), se = FALSE) +
      labs(y = lab_cov1,
           x = paste0(x, "(Historical)"))
  })
  print(l)


  # * cover -----------------------------------------------------------------
  # cover versus climate
  g <- cur_fut_long1%>% 
    filter(.data$run == r, PFT == p) %>% 
    ggplot(aes(y = cover, color = GCM)) +
    facet_grid(years~RCP) +
    labs(title = p,
         caption = cap1,
         y = lab_cov0) +
    scale_color_manual(values = cols_GCM2)
  
  # cover vs historical climate
  l <- map(clim_vars, function(var) {
    g + geom_smooth(aes(x = .data[[paste0(var, "_cur")]]), se = FALSE) +
      labs(x = paste(var, "(Historical)"))
  })
  print(l)


  # cover versus climate of each GCM
  l <- map(clim_vars, function(var) {
    g + geom_smooth(aes(x = .data[[var]]), se = FALSE) +
      labs(x = paste(var, "(of the specific GCM)"))
  })
  print(l)

} # end of loop across runs and pfts

# * boxplots by GCM -------------------------------------------------------
# Change in cover on y axis, and delta climate on x axis, with one box per GCM

outlier.size <- 0.5

for (pft in pfts) {

g <- diff2 %>% 
  filter(PFT == pft) %>% 
  ggplot(aes(color = id, fill = id)) +
  geom_hline(yintercept = 0, linetype = 2) +
  facet_wrap(~run, ncol = 1, scales = 'fixed') +
  labs(subtitle = 'Each box shows values from STEPWAT sites for a given GCM 
       (GCMs are ordered by median (across sites) delta change)',
       title = pft) 

# MAT on x axis
# delta change
print(g +
        geom_boxplot(aes(x = MAT_diff, y = cover_diff,  group = MAT_diff), 
                     outlier.size = outlier.size,
                     width = 0.05,
                     varwidth = TRUE) +
        labs(x = lab_mat1,
             y = lab_cov1)
      )
# MAP
# delta change
print(g +
        geom_boxplot(aes(x = MAP_diff, y = cover_diff,  group = MAP_diff), 
                     outlier.size = outlier.size,
                     width = 0.8,
                     varwidth = TRUE) +
        labs(x = lab_map1,
             y = lab_cov1)
)
}

dev.off()