# Martin Holdrege

# Script started Oct 18, 2022
# Purpose: download rasters and csv have been exported to google drive
# in .js scripts

# dependencies ------------------------------------------------------------

library(googledrive)
library(stringr)
library(tidyverse)
source("src/general_functions.R")

# get file paths drive --------------------------------------------------------

# sagebrush biome masked data
files1 <- drive_ls(path = "SEI")
files1


# select most recent date -------------------------------------------------
# sometimes multiple files are loaded to gdrive over time,
# and the date is appended to the file names, I only want the
# one with the most recent date

files2 <- files1 %>% 
  mutate(name_no_date = str_replace(name, "20\\d{6}\\.", ""),
         date = str_extract(name, "20\\d{6}\\."),
         date = lubridate::ymd(date),
         modifiedTime = map_chr(drive_resource, function(x) x$modifiedTime)) %>% 
  # if multiple files with the same
  # name only download the newer one
  group_by(name) %>% 
  filter(modifiedTime == max(modifiedTime)) %>% 
  # if multiple files create with different date strings
  # only keep the recent one 
  group_by(name_no_date) %>% 
  filter(date == max(date))
files2


# area ---------------------------------------------------------------------

files_area <- files2 %>% 
  filter(str_detect(name, "area.*\\.csv$"))


drive_download_from_df(files_area, folder_path = "data_processed/area")


