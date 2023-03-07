# Martin Holdrege

# started March 2, 2023

# purpose: creating the necessary asset paths and folder paths
# for migrating assests (and creating new folders) in the new
# google earth engine cloud project

# steps:
# 1) create list of all folders and sub-folders (which will need to be)
# created in the new project

# 2) creat list of all file paths (with base of file path that is specific
# to the project removed)

# 3) save thes as text files


# dependencies ------------------------------------------------------------

library(tidyverse)

# read in data ------------------------------------------------------------

# this file contains the paths of all assets in the old gee-guest
# project, but also the folder names
l1 <- read_lines("data_processed/ee_asset_paths/old_asset_paths.txt")

# functions ---------------------------------------------------------------

# recursive function that returns all the directories
# and their directories--doing this b/ earthengine command line 
# tool cannot create folders inside of folders that alread exist
all_folder_names <- function(x) {
  out <- unique(dirname(x))
  out <- out[out!= "."]
  if(length(out) == 0)
    return(x)
  else {
    return(sort(unique(c(x, out, all_folder_names(out)))))
  }
}


# 1: determine folder names --------------------------------------------------
# need to try and seperate file from 

folders1 <- str_subset(l1, "\\[Folder\\]") %>% 
  str_extract("(?<=gee-guest/assets/).*") %>% 
  sort()

folders2 <- all_folder_names(folders1)

# 2: file names -------------------------------------------------------------

files1 <- str_extract(l1, "(?<=gee-guest/assets/).*") 

# removing files that are actually folders
files2 <- files1[!files1%in% folders2]

# files2 <- str_subset(files2, "SEI") # for now just want to move the SEI assets

# 3: write files -------------------------------------------------------------

write_lines(folders2, "data_processed/ee_asset_paths/folders2create.txt")
write_lines(files2, "data_processed/ee_asset_paths/files2mv.txt")
