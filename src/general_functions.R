# Martin Holdrege

# Purpose--general functions to be used in other scripts



# factor functions --------------------------------------------------------
# functions that create factors out of character vectors etc. 

epoch2factor <- function(x) {
  factor(x, levels = c('2030-2060', '2070-2100'))
}

RCP2factor <- function(x) {
  factor(x, levels = c("RCP45", "RCP85"))
}


