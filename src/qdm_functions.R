# Purpose:

# functions for quantile delta mapping, quantile mapping and others.
# see https://doi.org/10.5194/ascmo-9-29-2023 .

#' Title
#'
#' @param cdfo emperical cdf of observed data
#' @param cdfm imperical cdf of modelled data (from same time
#' period as observed data)
#'
#' @return a function that can create the correction vector
cv_factory <- function(cdfo, cdfm, additive) {
 F100 <-seq(0.5, 99.5, by = 1)/100 # quantiles
 
 # inverse observed cdf at 100 quantiles
 inv_cdfo_f100 <- quantile(cdfo, F100) 
 
 # inverse  cdf of modelled data at 100 quantiles
 inv_cdfm_f100 <- quantile(cdfm, F100)
 
 # eq 4 in Lehner et al 2023
 # 
 if(additive) {
   cv <- inv_cdfo_f100 - inv_cdfm_f100
 } else {
   cv <- inv_cdfo_f100/inv_cdfm_f100 # multiplicative version
 }
 
 
 # creates function that returns the CV for a given quantile
 cvi <- approxfun(x = F100, y = cv, rule = 2)
 cvi
}

#' quantile delta mapping correction
#'
#' @param x_mf modelled future data
#' @param cdfo the cdf for observed data 
#' @param cdfm the cdf for modelled data (under current conditions)
#' @param additive logical, whether additive or multiplicative qdm is
#' employed
#' 
#' @return vector, with same length as x
#' @export
#'
#' @examples
#' n <- 1000
#' x <- seq(0, 25, by = 0.1)
#' o <- abs(rnorm(n, 8, 4)) # 'observed' data
#' mc <- abs(rnorm(n, 7, 2)) # 'modeled' curren data
#' mf <- abs(rnorm(n, 10, 2)) # modeled future data
#' cdfo <- ecdf(o)
#' cdfm <- ecdf(mc)
#' xcorr <- qdm_xcorr(x_mf = mf, cdfo = cdfo, cdfm = cdfm, additive = FALSE)
#' plot(x, cdfo(x), col = 'black', type = 'l')
#' lines(x, cdfm(x), col = 'gold', type = 'l')
#' lines(x, ecdf(mf)(x), col = 'red', type = 'l')
#' lines(x, ecdf(xcorr)(x), col = 'blue', type = 'l')
#' hist(xcorr, xlim = c(0, 25))
#' hist(mf, xlim = c(0, 25))
qdm_xcorr <- function(x_mf, cdfo, cdfm, additive = TRUE) {
  # quantiles of each value of x 
  q <- ecdf(x_mf)(x_mf)
  cv_fun <- cv_factory(cdfo = cdfo, cdfm = cdfm, additive = additive)
  cvi <- cv_fun(q)

  if(additive) {
    xcorr <- x_mf + cvi # correct x values
  } else {
    xcorr <- x_mf*cvi # correct x values, multiplicative version
  }
  
  xcorr
}

#' quantile mapping bias correction
#'
#' @param x_mf vector, modelled future data
#' @param cdfo, ecdf object, based on current (historical) observed data
#' @param cdfm ecdf objectct of current (historical) modeled data
#'
#' @return vecvtor with same length as x_mf
#' @export
#'
#' @examples
#' n <- 1000
#' x <- seq(0, 25, by = 0.1)
#' o <- abs(rnorm(n, 8, 4)) # 'observed' data
#' mc <- abs(rnorm(n, 7, 2)) # 'modeled' curren data
#' mf <- abs(rnorm(n, 10, 2)) # modeled future data
#' cdfo <- ecdf(o)
#' cdfm <- ecdf(mc)
#' xcorr <- qm_xcorr(x_mf = mf, cdfo = cdfo, cdfm = cdfm)
#' # 'correcting' current model values
#' xcorr_c <- qm_xcorr(x_mf = mc, cdfo = cdfo, cdfm = cdfm)
#' plot(x, cdfo(x), col = 'black', type = 'l')
#' lines(x, cdfm(x), col = 'gold', type = 'l')
#' lines(x, ecdf(mf)(x), col = 'red', type = 'l')
#' lines(x, ecdf(xcorr)(x), col = 'blue', type = 'l')
#' lines(x, ecdf(xcorr_c)(x), col = 'orange', type = 'l')
qm_xcorr <- function(x_mf, cdfo, cdfm) {
  xcorr1 <- quantile(cdfo, cdfm(x_mf)) # first time in eq. 12 of Lehner et al
  xcorr2 <- xcorr1 + x_mf - quantile(cdfm, cdfm(x_mf)) # extrapolation term in eq 12
  xcorr2 # result of eq 12
}

