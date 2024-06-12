# functions for manipulating, etc. spatial data

#' extract values from rasters
#'
#' @param r raster
#' @param name name to put in the lyr column of the  output
#' @param lyr name of the layer for which you want to extract values
#'
#' @return dataframe containing value, cell_num and lyr columns,
#' NA rows removed
get_values <- function(r, name = NULL, lyr = NULL) {
  
  if(is.null(lyr)) {
    n <- terra::nlyr(r)
    
    if(n == 1) {
      lyr <- 1
    } else if (isTRUE(name %in% names(r))) {
      lyr <- name
    } else {
      stop('provide value to the lyr argument that defines the raster layer to use')
    }

  }
  
  x <- values(r[[lyr]]) %>% 
    as.numeric()
  
  out <- tibble(
    value = x,
    cell_num = 1:length(x)
  ) %>% 
    filter(!is.na(value)) 
  
  if(!is.null(name)) {
    out$lyr <- name
  }
  
  out 
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
  stopifnot(is.data.frame(df),
            'cell_num' %in% names(df) | 'cellnumber' %in% names(df))
  if('cellnumber' %in% names(df)) {
    df <- rename(df, cell_num = cellnumber)
  }
  full_df <- tibble(cell_num = 1:terra::ncell(template[[1]]))
  
  full_df2 <- full_join(full_df, df, by = 'cell_num') %>% 
    select(-cell_num)
  
  stopifnot(nrow(full_df) == nrow(full_df2))
  
  r_out <- terra::rast(template[[1]], nlyrs = ncol(full_df2))
  names(r_out) <- names(full_df2)
  
  terra::values(r_out) <- as.matrix(full_df2)
  r_out
}
