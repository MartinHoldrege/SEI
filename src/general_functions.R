# Martin Holdrege

# Purpose--general functions to be used in other scripts


# downloading functions ---------------------------------------------------

#' get drive file names, and filter out older duplicates
#'
#' @param path file path to look for files on drive
#' @param email string, email for googledrive authentication
#'
#' @return dataframe
#' @examples
#' drive_ls_filtered()
drive_ls_filtered <- function(path = NULL, file_regex = NULL,
                              email = "mholdrege@gcp.usgs.gov") {
  googledrive::drive_auth(email = email)
  files1 <- googledrive::drive_ls(path = path)
  files2 <- files1 %>% 
    filter(!str_detect(name, "testRun")) %>% 
    # name no date removes the date and everything after the 
    # date (b/ multi tile tifs have coordinates after that
    # and they belong to the same original image)
    mutate(name_no_date = str_replace(name, "202\\d{5}.+", ""),
           date = str_extract(name, "202\\d{5}"),
           date = lubridate::ymd(date),
           modifiedTime = map_chr(drive_resource, function(x) x$modifiedTime)) %>% 
    # if multiple files with the same
    # name only download the newer one
    group_by(name_no_date) %>% 
    filter(modifiedTime == max(modifiedTime)) 
  
  if (!is.null(file_regex)) {
    files2 <- filter(files2, str_detect(name, file_regex))
  }
  
  files2
}

#' Get path of newest file that matches a regex
#'
#' @param path path to folder where to look
#' @param file_regex string (regex) to match
#'
#' @return path the the newest file that matches the given regex
newest_file_path <- function(path, file_regex) {
  stopifnot(
    is.character(path),
    is.character(file_regex)
  )
  paths <- list.files(
    path = path,
    pattern = file_regex, 
    full.names = TRUE)
  
  
  if (length(paths) == 0) {
    stop("no files match that regex")
  }
  
  # time modified
  time_modified <- file.info(paths)$mtime
  
  out <- paths[time_modified == max(time_modified)]
  
  if(length(out) > 1) {
    stop('more than one file match this regex and have the same modified time',
         '\ntry a more restrictive file_regex')
  }
  
  out
}


# download files from gdrive
drive_download_from_df <- function(df, folder_path = "./", overwrite = TRUE) {
  
  stopifnot(nrow(df) > 0)
  for (i in 1:nrow(df)) {
    googledrive::drive_download(file = df$id[i], 
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


# q curve functions -------------------------------------------------------


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



#' generate string that is valid js code defining a q-curve
#'
#' @param df dataframe with 4 columns
#' @param name name that the js object should take
#'
#' @return multiline string that is a nested list, which can 
#' be sourced in earth engine 
#' @examples
#' df <- tibble(
#' x = 1:5,
#' great_basin = rnorm(5),
#' intermountain = runif(5),
#' great_plains = runif(5)
#' )
#' out <- create_js_q_curve_code(df, name = "myobject")
#' cat(out)
create_js_q_curve_code <- function(df, name) {
  stopifnot(ncol(df) == 4,
            names(df)[-1] == c("great_basin", "intermountain", "great_plains"))
  
  rows1 <- map(1:nrow(df), function(i) {
    as.numeric(df[i, ]) %>% 
      unlist()
  })
  rows2 <- map(rows1, function(x) {
    paste0("\t[", 
           paste(x, collapse = ", "), 
           "]")
  })
  
  out <- paste0("\nexports.", name, " = [\n", 
                   paste(unlist(rows2), collapse = ",\n"),
                   "\n];\n")
  out           
}

#' generate string that is valid js code defining function parameters
#'
#' @param b0 intercept
#' @param b1 slope
#' @param name name to give js list
#'
#' @return string that is valid js code, two part list with b0 and b1
create_js_b0b1_code <- function(b0, b1, name) {
  paste0("\nexports.b0b1", name, " = [", b0, ",", b1, "]\n")
}

# raster manipulation -----------------------------------------------------

# calculate total annual herbaceous biomass
calc_aherb <- function(r, into) {
  info <- create_rast_info(r, into = into)
  
  info_cheat <- info %>% 
    filter(PFT == 'Cheatgrass') %>% 
    arrange(id)
  
  info_aforb <- info %>% 
    filter(PFT == 'Aforb') %>% 
    arrange(id)
  
  stopifnot( # confirm adding the matching layers together
    all.equal(info_aforb[, c("run2", "type", "RCP", "years")], 
              info_cheat[, c("run2", "type", "RCP", "years")])
  )
  
  aherb <- r[[info_cheat$id]] + r[[info_aforb$id]]
  names(aherb) <- names(aherb) %>% 
    str_replace("(Cheatgrass)|(Aforb)", "Aherb")
  
  out <- c(r, aherb)
  out
}

#' calculate the percentile for each cell, based on the other values
#' in the layer
#'
#' @param x spatraster
#'
#' @return spatraster with cells replaced by their percentile
rast2percentile <- function(x) {
  df <- values(x) %>% 
    # first calling values keeps the NAs in place
    as.data.frame()
  
  cdfs <- purrr::map(df, ecdf)
  percentiles <- map2_dfc(cdfs, df, function(f, x) {
    f(x)
  }) %>% 
    as.matrix()
  
  out <- x
  values(out) <- percentiles*100
  out
}


#' create functions the predict cover from biomass
#' given slope and intercept
#'
#' @param b0 intercept
#' @param b1 slope
#'
#' @return a function, that takes biomass as input (biomass can be 
#' a spatraster or a vector)
b0b1_factory <- function(b0, b1) {
  function(biomass) {
    cover <- b0 + b1*biomass
    
    # if linear function predicts cover below or above
    # the possible range they are replaced by 0 and 100, respectively
    terra::clamp(cover, lower = 0, upper = 100, values = TRUE)
  }
}


#' fill a template with values
#' 
#' @description
#' Filling a spatraster instead of just using values() because
#' data (df) doesn't include rows for missing values. 
#' 
#'
#' @param template template raster (terra spatraster)
#' @param df dataframe with 1 or more data columns and 1 cellnum column
#' where the cellnums correspond to the cellnumbers of the template raster
#' 
#' @return spatraster
fill_raster <- function(df, template) {
  full_df <- tibble(cellnum = as.character(1:ncell(template[[1]])))
  
  full_df2 <- full_join(full_df, df, by = 'cellnum') %>% 
    select(-cellnum)
  
  stopifnot(nrow(full_df) == nrow(full_df2))
  
  r_out <- rast(template[[1]], nlyrs = ncol(full_df2))
  names(r_out) <- names(full_df2)
  
  values(r_out) <- as.matrix(full_df2)
  r_out
}



# misc --------------------------------------------------------------------

#' Linear interpolation of weights within a given range 
#'
#' @param x numeric vector (that data want weights for)
#' @param w_window weight window, ie the winow over which to linearly
#' interpolate weights from 1 to 0
#'
#' @return vector same length as x containing weights
#' @examples
#' x <- rnorm(100)
#' w <- assign_weight(x, w_window = c(-1, 1))
#' plot(x, w)
assign_weight <- function(x, w_window) {
  stopifnot(
    length(w_window) == 2,
    w_window[1] < w_window[2],
    is.numeric(x)
  )
  
  window_width <- w_window[2] - w_window[1]
  
  dplyr::case_when(
    x <= w_window[1] ~ 1,
    x >= w_window[2] ~ 0,
    x > w_window[1] & x < w_window[2] ~ 1 - (x - w_window[1])/window_width,
    TRUE ~ NA
  )
}
