# Martin Holdrege

# script started 2/14/2022

# Purpose--rename rasters that have '.' in them (e.g RCP8.5), so that,
# they can be ingested into google earth engine. GEE does not allow periods
# names.


# dependencies ------------------------------------------------------------

library(stringr)

# file paths --------------------------------------------------------------

# Rasters John sent me, the same ones Dave T. has been using.
# these are the ratio change from current to future
# fp stands for 'file paths'
fp <- list.files("data_raw/stepwat_change_rasters/",
                 full.names = TRUE)

# rename ------------------------------------------------------------------

# removing the '.' in RCP8.5 and RCP4.5
fp_renamed <- fp %>% 
  str_replace("(?<=RCP\\d)\\.(?=\\d_)", "")

file.rename(from = fp, to = fp_renamed)
