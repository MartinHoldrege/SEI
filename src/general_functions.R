# Martin Holdrege

# Purpose--general functions to be used in other scripts


# downloading functions ---------------------------------------------------

# download files from gdrive
drive_download_from_df <- function(df, folder_path = "./", overwrite = TRUE) {
  
  stopifnot(nrow(df) > 0)
  for (i in 1:nrow(df)) {
    drive_download(file = df$id[i], 
                   path = file.path(folder_path, df$name[i]),
                   overwrite = overwrite)
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


#' parsq q curves (parsed from .js script)
#'
#' @return list of 5 dataframes, each one gives the data for the 
#' q curve for a given component of HSI
#' 
#' @examples
#' parse_q_curves()
parse_q_curves <- function() {
  
  l1 <- readr::read_lines("src/SEIModule.js") # module contains q-curves, but
  # written as nested javascript lists (here trying to parse)
  

  regex_ids <- c(sage = "exports.lstSage2Q", pfg = "exports.lstPerennialG2Q", 
                 afg = "exports.lstAnnualG2Q", H = "exports.lstH2Q",
                 tree = 'exports.lstTree2Q')
  
  # extract rows that correspond to the the data matrix
  l2 <- purrr::map(regex_ids, function(regex) {
    start <- stringr::str_which(l1, regex) + 1
    end <- start + 10
    out <- l1[start:end]
    out
  })
  
  # converting to dataframes
  out <- map(l2, function(x) {
    stringr::str_replace_all(x, "[\\[\\] ]", "") %>% 
      stringr::str_replace(",$", "") %>% 
      paste(collapse = "\n") %>% 
      readr::read_csv(
        col_names = c("cover", "great_basin","intermountain", "great_plains"), 
        col_types = "dddd")
  })
  
  map(out, function(df) {
    stopifnot(min(df$cover) == 0,
              max(df$cover) == 1)
  })
  out
}
