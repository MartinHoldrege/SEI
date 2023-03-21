# looking at the cover vs biomass relationship for sagebrush

library(tidyverse)

sage1 <- read_csv("data_raw/sage_cover_biomass/Sagebrush_Biomass_and_Predictors_Data.csv",
                  show_col_types = FALSE)

sage2 <- sage1 %>% 
  janitor::clean_names() %>% 
  # plot level averages
  group_by(plot_id) %>% 
  summarise(crown_area_cm2 = mean(crown_area_cm2),
            sample_density_number_plants_m2 = mean(sample_density_number_plants_m2),
            total_biomass_g = mean(total_biomass_g)) %>% 
  # calculate cover and biomass per plot
  # convert crown area to m2 then divide by the area
  mutate(cover = (crown_area_cm2/10000)*(1/sample_density_number_plants_m2)*100,
         biomass_gm2 = total_biomass_g/sample_density_number_plants_m2)

# visualizing the relationship
# (i'm only getting pretty low values of biomass here)
ggplot(sage2) +
  geom_point(aes(biomass_gm2, cover))

# fit model
mod <- lm(cover ~ biomass_gm2, data = sage2)
summary(mod)

# look at other models
x <- 1:2000 # 'biomass'
y1 <- 0.0086 * x  -  0.026589 # from pptx (shallower slope)
y2 <- 0.03 *x - 0.03 # older equation from pptx (steeper slope)
plot(x, y1, ylim = c(0, 70), type = 'l', col = 'blue',
     xlab = 'biomass', ylab = 'cover') 
lines(x, y2)

