# Martin Holdrege

# Purpose--general functions to be used in other scripts


# downloading functions ---------------------------------------------------

# download files from gdrive
drive_download_from_df <- function(df, folder_path = "./") {
  
  stopifnot(nrow(df) > 0)
  for (i in 1:nrow(df)) {
    drive_download(file = df$id[i], 
                   path = file.path(folder_path, df$name[i]),
                   overwrite = TRUE)
  }
  
}

# factor functions --------------------------------------------------------
# functions that create factors out of character vectors etc. 

epoch2factor <- function(x) {
  factor(x, levels = c('2030-2060', '2070-2100'))
}

RCP2factor <- function(x) {
  factor(x, levels = c("RCP45", "RCP85"))
}


c3_named_factor <- function(x) {
  labels <- c("Core", "Grow", "Other")
  
  stopifnot(x %in% 1:3)
  out <- factor(x, levels = 1:3,
                labels = labels)
  out
}
