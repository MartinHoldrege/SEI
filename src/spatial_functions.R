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
