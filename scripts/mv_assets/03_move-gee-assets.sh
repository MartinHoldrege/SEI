#!/bin/bash

# purpose
# script to move earth engine assets from gee-guest to usgs-gee-drylandecohydrology cloud project
# not b/ of some unknown issues the bash shell within rstudio isn't behaving correctly
# so this script needs be run directly from git bash

# Author: Martin Holdrege

# Script started: March 2, 2023

# set up environment -----------------------

cd
source $".bashrc" # b/ of aliases etc. for conda environment
conda activate ee # earthengine commandline environment

# earthengine set_project usgs-gee-drylandecohydrology # I don't think this line needs to run

new="projects/usgs-gee-drylandecohydrology/assets/"
old="projects/gee-guest/assets/"
 
# create folders

paths_fold="/c/Users/mholdrege/OneDrive - DOI/Documents/projects/SEI/data_processed/ee_asset_paths/folders2create.txt"

# comment out if folders have already been created
while read p; do
  earthengine create folder ${new}${p}
done <"$paths_fold"

# initially only running these for the SEI assets
paths_file="/c/Users/mholdrege/OneDrive - DOI/Documents/projects/SEI/data_processed/ee_asset_paths/files2mv.txt"
while read p; do
# using cp instead of mv for safety (can delete assets from gee-guest later)
 earthengine cp ${old}${p} ${new}${p}
 echo "$p"
done <"$paths_file"
