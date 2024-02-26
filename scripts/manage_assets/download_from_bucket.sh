#!/bin/bash

# Purpose: download tifs from google cloud bucket
# ~/OneDrive\ -\ DOI/Documents/projects/SEI/scripts/manage_assets/download_from_bucket.sh 

# Author: Martin Holdrege
# Date Started: February 21, 2024


# where rasters will be downloaded to
dir=/D/USGS/large_files/SEI_rasters/tiles/

# Where files will be downloaded from
# (a google cloud service bucket)
gs_folder="gs://usgs-gee-drylandecohydrology/SEI"

# setup environment
conda activate ee

# some things to try and run when initially setting up gcloud
#gcloud init
gcloud auth login
gcloud auth application-default login # (not always necessary)
gcloud config set project usgs-gee-drylandecohydrology # at least uncomment this line

cd "$dir"

gcloud storage rsync $gs_folder $dir # sync files from cloud bucket to local directory, by default leaves unmatched files in destination alone. 
