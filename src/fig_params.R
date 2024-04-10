# Martin Holdrege

# Various parameters used for figure making


# Names of the 9 transition categories
# c9Names <-  c(
#   'Stable core',
#   'Core becomes grow',
#   'Core becomes other',
#   'Grow becomes core',
#   'Stable grow',
#   'Grow becomes other',
#   'Other becomes core',
#   'Other becomes grow',
#   'Stable other'
# )

c9Names <-  c(
  'Stable CSA',
  'CSA becomes GOA',
  'CSA becomes ORA',
  'GOA becomes CSA',
  'Stable GOA',
  'GOA becomes ORA',
  'ORA becomes CSA',
  'ORA becomes GOA',
  'Stable ORA'
)

c3Names <- c("CSA", "GOA", "ORA")


# axis labels -------------------------------------------------------------

# biomass
lab_bio0 <- expression("Biomass ("*gm^-2*")")

# climate
lab_mathist0 <- expression("MAT (" * degree * C * "; Historical)")
lab_maphist0 <-'MAP (mm; Historical)'

# panel labels ------------------------------------------------------------

pft_labels <- c('afg' = 'Annuals',
                'pfg' = 'Perennials',
                'sagebrush' = 'Sagebrush')


# panel letters -----------------------------------------------------------

# so consistent letter theme is used throughout (for multiple
# panel pub quality figs)
fig_letters <- paste(letters, ")", sep = "")
names(fig_letters) <- letters

# colors ------------------------------------------------------------------

cols_rcp <- c(#"Current" = "cornflower blue",
              "RCP45" = "darkgreen",
              "RCP85" = "green3")

cols_rcp_years <- c(
  '#a6dba0',# RCP45 2030-2060
  '#1b7837',# RCP45 2070-2100
  '#c2a5cf',# RCP85 2030-2060
  '#762a83'# RCP85 2070-2100
)

c9Palette = c('#142b65', # stable core (black)
              '#b30000', #'#d7301f', # core becomes grow # reds from 9-class OrRd
             '#67001f',  # core becomes impacted
             '#757170', # grow becomes core
             '#99d4e7', # stable grow
             '#fc8d59', # grow becomes impacted
             '#000000', # impacted becomes core
             '#D9D9D9', # impacted becomes grow
             '#eee1ba') # stable impacted



names(c9Palette) <- c9Names

c3Palette <- c9Palette[c(1, 5, 9)]
names(c3Palette) <- c3Names
c3Palette2 <- c("#142b65", "#99d4e7", "#eee1ba")
names(c3Palette2) <- c3Names
# colors matching those used in doherty et al 2022
cols_region <- c("great_plains" = "#DB9E27",
                 "intermountain" = "#0E9A72",
                 "great_basin" = "#0E72AD")

# colors for figure 2 in the REM manuscript (old version of colors)
# cols_numGcm <- c("11" = '#0571b0',
#                  "12" = '#92c5de',
#                  "13" = '#f4a582',
#                  "14" = '#b2182b',
#                  "21" = '#762a83',
#                  "22" = '#c2a5cf',
#                  "23" = '#a6dba0',
#                  "24" = '#008837',
#                  "30" = unname(c9Palette[9]))
# # # colors for figure 2 in the REM manuscript (onew version of colors)
# cols_numGcm <- c("11" = '#0571b0',
#                  "12" = '#92c5de',
#                  "13" = "#fed976",
#                  "14" = "#fd8d3c",
#                  "21" = '#008837',
#                  "22" = '#a6dba0',
#                  "23" = '#c2a5cf',
#                  "24" = '#762a83',
#                  "30" = unname(c9Palette[9]))
# 'v6' colors (from 11-clas RdYlBl)
cols_numGcm <- c("11" = '#313695',
                 "12" = '#4575b4',
                 "13" = '#d73027',
                 "14" = '#a50026',
                 "21" = '#74add1',
                 "22" = '#abd9e9',
                 "23" = '#fdae61',
                 "24" = '#f46d43',
                 "30" = unname(c9Palette[9]))



"#eee1ba"

