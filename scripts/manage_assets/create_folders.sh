#!/bin/bash

# Script to create folder structure for a given version of stepwat SEI output
# ./create_folders.sh

# the version
v="vsw4-3" 

# seteup earthengine command line
cd
source $".bashrc" # b/ of aliases etc. for conda environment (just needed b/ idiosyncracies on my machine)
conda activate ee # earthengine commandline environment
earthengine set_project "usgs-gee-drylandecohydrology" 

# where version folders will be located
asset_folder="projects/usgs-gee-drylandecohydrology/assets/SEI/"

earthengine create folder ${asset_folder}${v}
earthengine create folder ${asset_folder}${v}"/forecasts" 
earthengine create folder ${asset_folder}${v}"/products"
# earthengine create folder ${asset_folder}${v}"/sw_SEI" # this only necessary for minor version 4 

