#!/bin/bash

# Purpose: make all assets in the SEI folder have public read access
# See the 01_ingest_images.sh script for some code to help authenticating
# gcloud/earthengine if needed. 

# Author: Martin Holdrege

# Script started April 4, 2023

cd
source $".bashrc" # b/ of aliases etc. for conda environment (just needed b/ idiosyncracies on my machine)
conda activate ee # earthengine commandline environment

# Set the Earth Engine asset folder
# FOLDER="projects/usgs-gee-drylandecohydrology/assets/SEI/stepwat_biomass" #earth engine directory
FOLDER="projects/usgs-gee-drylandecohydrology/assets/SEI/vsw4-3" #earth engine directory

earthengine authenticate
earthengine set_project "usgs-gee-drylandecohydrology"
# recursively list all assets in the folder and save their paths in a file
earthengine ls -r $FOLDER > temp_assets.txt

# Loop through the assets and change their permissions
while read -r ASSET; do
  echo "$ASSET"
    # I'm not quite sure why eval echo was needed here but didn't work without
  #$(eval echo earthengine acl set public $ASSET) # provide public read access (not working)
  COMMAND="earthengine acl set public $ASSET"
  eval $COMMAND # not sure why the straight 'eval' didn't work but this is working now
  # $(eval echo earthengine acl ch -u martinholdrege@gmail.com:W $ASSET) # granting write permissions
done < temp_assets.txt


# Remove the temporary file
rm temp_assets.txt


