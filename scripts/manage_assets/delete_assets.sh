#!/bin/bash

# Purpose: delete select GEE assets
# See the 01_ingest_images.sh script for some code to help authenticating
# gcloud/earthengine if needed. 

# Author: Martin Holdrege

# Script started December 11, 2023

cd
source $".bashrc" # b/ of aliases etc. for conda environment (just needed b/ idiosyncracies on my machine)
conda activate ee # earthengine commandline environment

EE_FOLDER="projects/usgs-gee-drylandecohydrology/assets/SEI/stepwat_biomass"
REGEX_PATTERN="c4on_.*"

# List assets in the specified folder
assets=$(earthengine ls ${EE_FOLDER})

# Filter assets based on the regex pattern
assets_to_delete=($(echo "${assets}" | grep -E "${REGEX_PATTERN}"))

# Check if there are assets to delete
if [ ${#assets_to_delete[@]} -eq 0 ]; then
  echo "No matching assets found for deletion."
else
  # Delete the identified assets
  for asset in "${assets_to_delete[@]}"; do
    echo "Deleting ${asset}"
    # earthengine rm -r ${asset} --dry_run # use for code testing
    earthengine rm -r ${asset} 
  done
  echo "Deletion complete."
fi