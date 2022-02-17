# Martin Holdrege

# script started 2/16/2022

# Purpose is to upload files (stepwat change rasters) to google earth engine
# so that they are available as assets.

# Step1 was to manually (i.e. drag and drop) the files into a google cloud platform
# cloud storage bucket (folder) I called stepwat_change_rasters.
# step 2 executed in this script is to upload these files gee using the
# earthengine command line tool 
# (https://developers.google.com/earth-engine/guides/command_line).
# I'm just calling that tool from R. It
# was installed when I installed the rgee package. 


# dependencies ------------------------------------------------------------

library(stringr)

# get file paths --------------------------------------------------------

# note that the names of these files needs to already have been updated
# (in rename_rasters.R), so that they can be ingested into gee.
# files w/ these names need to already be uploaed to google cloud platform
fp <- list.files("data_raw/stepwat_change_rasters/")


# asset_id ----------------------------------------------------------------
# path to files in gee

# removing .tif ending of file
asset_id <- paste0("users/MartinHoldrege/SEI/stepwat_change_rasters/",
                   str_replace(fp, ".tif$", ""))

# google cloud platform paths ----------------------------------------------

# locations on gcp
gcp_path <- paste0("gs://stepwat_change_rasters/", fp)


# transfer files ----------------------------------------------------------

# command line earthengine commands
commands <- paste0("earthengine upload image --asset_id=", 
                  asset_id, " ", gcp_path)

# after some initial problems i installed conda 
# (https://developers.google.com/earth-engine/guides/python_install-conda#install_api)
# and the earth engine API, and connected that to git bash. as a result the
# earthengine command line tool works. 

system("conda activate") # this code isn't working at the moment. 
system('earthengine') # test that working
system("ls")
for (com in commands) {
  system(com)
}
# system(command)
