#!/bin/bash

# Purpose: upload rasters matching particular regex to google cloud bucket,
# and then as a second step ingest those files into google earth engine
# can run this script by running:
# ~/OneDrive\ -\ DOI/Documents/projects/SEI/scripts/manage_assets/01_ingest_cp2bucket.sh 

# Author: Martin Holdrege
# Date Started: March 7, 2023

# b/ of aliases etc. for conda environment isn't necessary if bash setup better:
cd
source $".bashrc" 

# where rasters are located
dir=/c/Users/mholdrege/OneDrive\ -\ DOI/Documents/projects/grazing_effects/data_processed/interpolated_rasters/biomass/

# Where rasters will first be uploaded to
# (a google cloud service bucket)
gs_folder="gs://usgs-gee-drylandecohydrology/SEI/"

# where assets will be ingested to
asset_folder="projects/usgs-gee-drylandecohydrology/assets/SEI/stepwat_biomass/"

# setup environment
conda activate ee

# some things to try and run when initially setting up gcloud
# gcloud init
# gcloud auth login
# gcloud auth application-default login
# gcloud config set project usgs-gee-drylandecohydrology 
# earthengine authenticate
# earthengine set_project "usgs-gee-drylandecohydrology"

cd "$dir"

# copy files matching this regular expression to cloud bucket:
# (Note this code will fail if breaks in file names exists)
files=$(find . | grep -P "c4on_(Aforb|Sagebrush|Pherb|Cheatgrass).*2030-2060_Light_.*.tif$")

gsutil cp "$files" ${gs_folder} # upload to bucket

# ingest image to earth engine (from the bucket)
for file in $files;
do 
    file=${file:2} # removing leading ./
    file2=${file::-4} # removing the trailing 4 characters (.tif)  in file name
    file2=${file2//./} # removing periods (e.g. RCP 8.5), which can't be in asset name
    earthengine upload image --asset_id=${asset_folder}${file2} ${gs_folder}${file}; 
    #echo ${file2}
    #echo ${gs_folder}${file}
done



