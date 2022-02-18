#!/bin/bash

# Martin Holdrege
# Script started 2/18/2022

# Purpose: transfer stepwat change rasters from google cloud bucket
# into google earth engine for ingestion, using the earth engine commandline
# tool.

# to run this script from the command line (if working directory
# is the project directory) use:
# ./scripts/upload_rasters2gee.sh

conda activate ee # so earthengine commandline program will work

# Where the assets should go
asset_folder="projects/gee-guest/assets/SEI/stepwat_change_rasters/"

# where assets are located (needs to be a google cloud storage bucket)
gs_folder="gs://mholdrege/"

# example name of file for code testing
file="CheatgrassFire_Cheatgrass_ChangePropHistoricalMax_RCP45_2030-2060_CanESM2.tif"

# this prints what the command will look like
# double check that this is correct
echo earthengine upload image --asset_id=${asset_folder}${file::-4} ${gs_folder}${file}

# note: {file::-4}, removes the last 4 characters (i.e. .tif), b/ "." can't be in asset names

# cd to folder with the names of the files that have been put on the cloud
cd ./data_raw/stepwat_change_rasters;

# echo *.tif # printing all files in the folder of interest (check this looks right)

# loop through each file name, to upload the images
for file in echo *.tif;
do 
    earthengine upload image --asset_id=${asset_folder}${file::-4} ${gs_folder}${file}; 
done
cd ../..; # reset wd (not sure if necessary)

# just some non-functioning code I was testing
# assets=$(earthengine ls ${asset_folder} | tr ''
# echo "${assets}"
# basename -a "${assets}"
# for asset in assets;
# do 
#   basename $asset;
# done
# echo "${assets##*/}"
# echo "${assets##*/}"
# vars="$(*.tif)"
