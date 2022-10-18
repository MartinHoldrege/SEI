# martin holdrege

# Script started March 

# Purpose:
# Summarize the area in each of the 9 SEI (sagebrush 
# ecosystem integrity) transition categories, and plot it.
# Also how the area of each category (c3 and c9) varies between GCMs



# dependencies ------------------------------------------------------------

library(tidyverse)
source("src/fig_params.R")
source("src/general_functions.R")
theme_set(theme_classic())
# load data -----------------------------------------------------------

c9_area1 <- read_csv("data_processed/area/SEIv11_9ClassTransition_90_area_by-GCM-modelRun_20221017.csv")


# process columns ---------------------------------------------------------

stopifnot(c9_area1$c9 %in% 1:9)
c9_area2 <- c9_area1 %>% 
  select(-`system:index`, -.geo) %>% 
  mutate(root = str_extract(modelRun, "^[[:alpha:]]+"),
         RCP = str_extract(modelRun, "RCP\\d{2}"), 
         epoch = str_extract(modelRun, "\\d{4}-\\d{4}"),
         # the 3 level classification in the future
         c3_future = case_when(
           c9 %in% c(1, 4, 7) ~ 1,
           c9 %in% c(2, 5, 8) ~ 2,
           c9 %in% c(3, 6, 9) ~ 3
         ),
         c3_future = factor(c3_future)
         ) %>% 
  group_by(GCM, modelRun, root, RCP, epoch) %>% 
  mutate(total_area_m2 = sum(area_m2))

# checking that the total area is the same in all groups
range_area <- max(c9_area2$total_area_m2) - max(c9_area2$total_area_m2)

stopifnot(range_area < 0.1)

# percent of total area ---------------------------------------------------

c3_area1 <- c9_area2 %>% 
  group_by(c3_future, .add = TRUE) %>% 
  summarize(area_m2 = sum(area_m2), .groups = 'drop_last') %>% 
  mutate(area_perc = area_m2/sum(area_m2)*100,
         c3_name = c3_named_factor(c3_future))
  

# c3 area bar charts ------------------------------------------------------


# * by GCM ----------------------------------------------------------------

# stacked bar charts showing the amount of area in each of of the 3 
# SEI classes, for each GCM for a given climate scenario

ref_modelRun <- "ClimateOnly_RCP85_2030-2060"

# spliting by modelRun then turning GCM into a factor
# ordered by the most area that is core
c3_area_l1 <- split(c3_area1, c3_area1$modelRun)

c3_area_l2 <- map(c3_area_l1, function(df) {
  # names of GCMs, ones where core is highest listed first
  gcm_names <- df %>% 
    filter(c3_future == 1) %>% 
    arrange(desc(area_perc)) %>% 
    pull(GCM)
  
  df$GCM <- factor(df$GCM, levels = gcm_names)
  df
})

pdf("figures/area/c3_area_by-GCM_barchart_v1.pdf")  
map2(c3_area_l2, names(c3_area_l2), function(df, name) {
  ggplot(df, aes(x = GCM, y = area_perc, 
                              fill = forcats::fct_rev(c3_name))) +
    geom_bar(position = "stack", stat = "identity") +
    scale_fill_manual(values = c3Palette) +
    theme(legend.title = element_blank()) +
    theme(axis.text.x = element_text(angle = 90)) +
    labs(y = "Percent of total area",
         subtitle = name) 
})
dev.off()
  
