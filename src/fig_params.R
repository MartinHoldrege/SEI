# Martin Holdrege

# Various parameters used for figure making


# Names of the 9 transition categories
c9Names <-  c(
  'Stable core',
  'Core becomes grow',
  'Core becomes other',
  'Grow becomes core',
  'Stable grow',
  'Grow becomes other',
  'Other becomes core',
  'Other becomes grow',
  'Stable other'
)

c3Names <- c("Core", "Grow", "Other")


# axis labels -------------------------------------------------------------

# biomass
lab_bio0 <- expression("Biomass ("*gm^-2*")")

# colors ------------------------------------------------------------------

cols_rcp <- c(#"Current" = "cornflower blue",
              "RCP45" = "darkgreen",
              "RCP85" = "green3")

# color palette based on colorbrewer2 8-class RdBu palette
c9Palette = c('#000000', # stable core (black)
             '#f4a582', # core becomes grow
             '#b2182b', # core becomes impacted
             '#92c5de', # grow becomes core
             '#757170', # stable grow
             '#d6604d', # grow becomes impacted
             '#2166ac', # impacted becomes core
             '#4393c3', # impacted becomes grow
             '#D9D9D9') # stable impacted



names(c9Palette) <- c9Names

c3Palette <- c9Palette[c(1, 5, 9)]
names(c3Palette) <- c3Names
c3Palette2 <- c("#142b65", "#99d4e7", "#eee1ba")
names(c3Palette2) <- c3Names
# colors matching those used in doherty et al 2022
cols_region <- c("great_plains" = "#DB9E27",
                 "intermountain" = "#0E9A72",
                 "great_basin" = "#0E72AD")

