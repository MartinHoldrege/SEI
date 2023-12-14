# create figures of areas (bar charts primarily) of various classes/categories

# Author: Martin Holdrege

# dependencies ------------------------------------------------------------

source("scripts/climate_attribution/07_ca_transition-class_area.R")


# fig params --------------------------------------------------------------

cap1 <- paste0('Details:', rcp, ' (', yr, '), ', resolution, 'm, ', version)
cap2 <- paste0(cap1, '\n Bars are median, and range is 2nd lowest to 2nd highest across GCMs')

# c9 area -----------------------------------------------------------------

# * figures (pub qual) ----------------------------------------------------

# note--consider whether want to include only c9 categories with >0 area

# 1 panel figure 
tmp <- area_med_c9 %>% 
  filter(run == target_run) %>% 
  # if any c9 categories have 0 area, then drop them
  filter(c9 %in% unique(c9[area_km2_hi > 0])) %>% 
  mutate(c9_name = droplevels(c9_name)) 


g <- ggplot(tmp, aes(c9_name, y = area_km2_med),fill = c9_name) +
  base_c9_area() +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi, group = rcp_years),
                stat = 'identity',
                width=.3,
                position=position_dodge(0.9)) +
  guides(pattern = guide_legend(ncol = 1,
                                override.aes = list(fill = "white", color = 'black',
                                                    size = 0.1))) + 
  labs(y = lab_areakm0,
       x = NULL,
       subtitle = fig_letters['b'])

g

box_l <- list('fig' = g,
              run = target_run,
              version = version)

# saving so that can be combined with a map in a downstream script
saveRDS(box_l, paste0("figures/area/c9_area_barplot_by-scenario_",
                      version, "_", target_run, ".RDS"))

# 9 panel figure, shoing area by c9, model run, and RCP/time period

g <- area_med_c9 %>% 
  mutate(run_name = run2name(run)) %>% 
  ggplot(aes(rcp_years, y = area_km2_med), fill = c9_name)  +
  base_c9_area(include_bar_pattern = FALSE) +
  geom_bar_pattern(aes(pattern = run_name,
                       pattern_density = run_name,
                       pattern_angle = run_name,
                       fill = c9_name),
                   stat = 'identity',
                   position = position_dodge(),
                   pattern_fill = 'darkgrey',
                   pattern_spacing = 0.05,
                   color = 'white',
                   pattern_key_scale_factor = 0.5 # relative density in the legend
  ) +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi, group = run_name),
                stat = 'identity',
                width=.3,
                position=position_dodge(0.9)) +
  guides(pattern = guide_legend(ncol = 2,
                                override.aes = list(fill = "white", color = 'black'))) +
  facet_wrap(~c9_name, scales = 'free_y') +
  labs(y = lab_areakm0,
       x = 'Scenario')

filename <- paste0("c9_area_barplot_by-scenario-run", "_", version, "_v2")
jpeg(paste0("figures/area/", filename, ".jpg"),     
     units = 'in', height = 6, width = 6, res = 600)
g
dev.off() 

saveRDS(g, paste0("figures/area/", filename, ".RDS"))


# * figures (exploratory) ---------------------------------------------------

pdf(paste0("figures/area/c9_area_barplots_", version, "_v1.pdf"), height = 8, width = 8)
# panels for each ecoregion
g <- area_med_c9_eco %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(c9_name, fill = c9_name)) +
  facet_grid(run ~ ecoregion) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = NULL, caption = cap1)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)


g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)

# biome-wide values
g <- area_med_c9 %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(x = c9_name, fill = c9_name)) +
  facet_wrap(~run) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = NULL,
       caption = cap1)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)


g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)

dev.off()


# area by driver --------------------------------------------------------

# * biome-wide figures ----------------------------------------------------

# ** pub qual --------------------------------------------------------------

# g <- area_med %>% 
#   filter(RCP == rcp, years == yr) %>% 
#   mutate(run_name = run2name(run),
#          driver_name = driver2factor(driver)) %>% 
#   ggplot(aes(x = run_name, fill = driver_name)) +
#   facet_wrap(~c9_name, nrow = 2) +
#   theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
#         legend.position = 'bottom') +
#   scale_fill_manual(values = c('red', 'green', 'blue', 'grey'),
#                     name = "Primary driver of change")  +
#   labs(x = "Model assumptions",
#        subtitle = fig_letters['b']) +
#   geom_bar(aes(y = area_km2_med), stat = 'identity',
#            position = position_dodge()) +
#   geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
#                 width = 0.3,
#                 position=position_dodge(0.9)) +
#   labs(y = lab_areakm0) +
#   guides(fill = guide_legend(nrow = 2))
# g
# 
# list2save <- list('fig' = g,
#                   RCP = rcp,
#                   years = yr,
#                   version = version)
# 
# # saving so that can be combined with a map in a downstream script
# saveRDS(list2save, "figures/area/c9_driver_barplot_by-run.RDS")


# ** pub qual c12 ---------------------------------------------------------

# 12 panel map
g <- area_med_dir %>% 
  filter(RCP == rcp, years == yr) %>% 
  mutate(run_name = run2name(run),
         driver_name = driver2factor(driver)) %>% 
  ggplot(aes(x = run_name, fill = driver_name)) +
  facet_wrap(~c12_name, nrow = 3) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'bottom') +
  scale_fill_manual(values = c('red', 'green', 'blue', 'grey'),
                    name = "Primary driver of change")  +
  labs(x = "Model assumptions",
       subtitle = fig_letters['b']) +
  geom_bar(aes(y = area_perc_med), stat = 'identity',
           position = position_dodge()) +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3,
                position=position_dodge(0.9)) +
  labs(y = lab_areaperc0) +
  guides(fill = guide_legend(nrow = 2))

jpeg(paste0("figures/area/c12_driver", "_", version, "_", rcp, "_", yr, ".jpg"),     
     units = 'in', height = 7, width = 7, res = 600)
g
dev.off()

saveRDS(g, paste0("figures/area/c12_driver", "_", version, "_", rcp, "_", yr, ".RDS"))


# ** regular ---------------------------------------------------------------

pdf(paste0("figures/climate_attribution/area/area-by-driver_", version, "_v1.pdf"),
    width = 10, height = 10)

g <- area_med %>% 
  filter(RCP == rcp, years == yr) %>% 
  ggplot(aes(x = driver, fill = c9_name)) +
  facet_grid(run~c9_name) +
  theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
        legend.position = 'none') +
  scale_fill_manual(values = c9Palette)  +
  labs(x = "Primary driver of change",
       caption = cap2)

g + 
  geom_bar(aes(y = area_km2_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                width = 0.3) +
  labs(y = lab_areakm0)

g + 
  geom_bar(aes(y = area_perc_med), stat = 'identity') +
  geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                width = 0.3) +
  labs(y = lab_areaperc0)

# * ecoregion figures ----------------------------------------------------

r <- runs[2]

for (r in runs) {
  tmp_eco <- area_med_eco %>% 
    filter(run == r, RCP == rcp, years == yr)
  
  g <- ggplot(tmp_eco, aes(x = driver, fill = c9_name)) +
    facet_grid(ecoregion~c9_name, scales = 'free_y') +
    theme(axis.text.x = element_text(angle = 90, vjust = 0.5, hjust=1),
          legend.position = 'none') +
    scale_fill_manual(values = c9Palette)  +
    labs(x = "Primary driver of change",
         caption = paste('simulation settings:', r, '\n', cap2))
  
  print(
    g + 
      geom_bar(aes(y = area_km2_med), stat = 'identity') +
      geom_errorbar(aes(ymin = area_km2_lo, ymax = area_km2_hi),
                    width = 0.3) +
      labs(y = lab_areakm0)
  )
  
  print(
    g + 
      geom_bar(aes(y = area_perc_med), stat = 'identity') +
      geom_errorbar(aes(ymin = area_perc_lo, ymax = area_perc_hi),
                    width = 0.3) +
      labs(y = lab_areaperc0)
  )
  
}
dev.off()


