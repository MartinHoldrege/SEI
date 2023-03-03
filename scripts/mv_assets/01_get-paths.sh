#!/bin/bash

# purpose: list all earthengine files in gee-guest, and output them to
# a text file (downstream code will then move these files, after creating the necessary folders)

# note b/ of some unknown issues the bash shell within rstudio isn't behaving correctly
# so this script needs be run directly from git bash

# to run this script:
# ./01_old_asset_paths.sh

# Author: Martin Holdrege

# Script started: March 2, 2023

# change file path as needed
file="/c/Users/mholdrege/OneDrive - DOI/Documents/projects/SEI/data_processed/ee_asset_paths/old_asset_paths.txt"
cd
source $".bashrc" # b/ of aliases etc. for conda environment
conda activate ee # earthengine commandline environment

# earthengine authenticate 
# earthengine set_project usgs-gee-drylandecohydrology # I don't think this line needs to always be run

dir_o="projects/gee-guest/assets/" #old directory

earthengine ls -rl ${dir_o}SEI > "$file" # create file
earthengine ls -rl ${dir_o}cheatgrass_fire >> "$file" #append to file
earthengine ls -rl ${dir_o}newRR_metrics >> "$file"