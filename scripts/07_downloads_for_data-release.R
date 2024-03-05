# Purpose: Download files from gdrive for data release
# note--this is only for files exported to gdrive, for files exported
# to bucket use manage_assets/download_from_bucket.sh

# Started: March 4, 2024

# Author: Martin Holdrege


# dependencies ------------------------------------------------------------

library(tidyverse)
source('src/general_functions.R')

# download files ----------------------------------------------------------
dir <- "D:/USGS/large_files/SEI_rasters/tiles" # destination

# *Q ----------------------------------------------------------------------

drive_ls_filtered(path = "SEI", file_regex = 'Q_vsw4-3-4',
                  email = 'martinholdrege@gmail.com') %>% 
  drive_download_from_df(dir)

# *Q -----------------------------------------------------------------------
# current SEI
drive_ls_filtered(path = "SEI", file_regex = 'SEI-Q',
                  email = 'martinholdrege@gmail.com') %>% 
  drive_download_from_df(dir)