# Purpose: create an RGB triangle to be put on other figures 

# Started December 4, 2023

# Author: Martin Holdrege


library(tidyverse)

# creating all combinations of three values that sum to 255,
# to fill the triangle
df4ggtern <- tidyr::expand_grid(x = 0:255,
            y = 0:255) %>% 
  rowwise() %>% 
  mutate(sum = sum(c(x, y))) %>% 
  filter(sum <= 255) %>% 
  mutate(z = 255 - sum,
         color = rgb(x, y, z, maxColorValue = 255)) %>% 
  select(-sum)

# returns a ggplot object
rgb_triangle <-  function(){
  library(ggtern)
  ggtern::ggtern(data = df4ggtern, aes(x, y, z)) + 
    geom_point(aes(color = I(color))) +  
    theme(tern.axis.ticks= element_line(color = 'transparent'),
          tern.axis.text.show = FALSE,
          plot.subtitle = element_text(hjust = 0.5),
          tern.axis.title.L = element_text(hjust = -0.2, vjust = 0.6),
          tern.axis.title.R= element_text(hjust = 1.1, vjust = 0.6),) +
    labs(x = 'Sagebrush',
         y = 'Perennials',
         z = 'Annuals',
         subtitle = 'Driver of change')
}


png('figures/color_triangle.png',
    height = 2.5,
    width = 2.5,
    units = 'in',
    res = 600)
rgb_triangle()
dev.off()
