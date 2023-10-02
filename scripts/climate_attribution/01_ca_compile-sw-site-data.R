# Purpose: Get site level STEPWAT output, calculate cover
# and output csv's for use in downstream scripts that relate
# responses to climate (and other ecohydrological variables)
# note 'ca' in the file name stands for climate attribution

# Author: Martin Holdrege

# Started: October 2, 2023

# dependencies ------------------------------------------------------------

# reading in data to combine
dir <- getwd()
setwd('../grazing_effects') # directory for this script to run
source("../grazing_effects/scripts/02_summarize_bio.R")
setwd(dir)

source("src/general_functions.R")
bc <- readRDS("models/bio2cov_b0b1_v1.RDS")


# calculate cover ---------------------------------------------------------

names(bc) <- names(bc) %>% 
  str_extract("(afg)|(pfg)|(sage)") %>% 
  str_replace('sage', 'sagebrush')

bc_funs <- map(bc, function(b0b1) {
  b0b1_factory(b0b1[1], b0b1[2])
})

bio1 <- pft5_bio1 %>% 
  filter(PFT %in% c("Sagebrush", "Pherb", "Aforb", "Cheatgrass")) %>% 
  mutate(PFT = factor(as.character(PFT)),
         PFT = fct_collapse(.f = PFT,
                            sagebrush = "Sagebrush",
                            afg = c("Cheatgrass", "Aforb"),
                            pfg = "Pherb")) %>% 
  group_by(run, years, RCP, graze, id, PFT, site, GCM) %>% 
  summarise(biomass = sum(biomass),
            cover = sum(biomass),
            .groups = 'drop') %>% 
  split(., .$PFT) %>% 
  map2(., names(.), function(df, pft) {
    df$cover <- bc_funs[[pft]](df$biomass)
    df
  }) %>% 
  bind_rows() %>% 
  left_join(clim_all2)


# save output -------------------------------------------------------------

write_csv(bio1, "data_processed/sw_site_level/cover_mean_by_site-PFT_v1.csv")
