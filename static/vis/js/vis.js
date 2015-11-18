/*
 * a simple framework to warp the basic svg operation
 * @author: Maoyuan Sun
 * @Date: Last Update, 11-17-2015
 */

var vis = {
    VERSION: 1.0
}


/*
 * set border of a svg object
 * @param svgID, string, the id of svg object
 * @param bColor, string, the css color of stroke
 * @param bWidth, float, the width of stroke
 */
vis.setSvgBorderByID = function(svgID, bColor, bWidth) {
    d3.select("#" + svgID)
        .style("stroke", bColor)
        .style("stroke-width", bWidth);
}


/*
 * set opacity of a svg object
 * @param svgID, string, the id of svg object
 * @param preColor, string, the css string of rgba color
 * @param opaVal, float, the value of opacity
 */
vis.setSvgOpacityByID = function(svgID, preColor, opaVal) {
    d3.select("#" + svgID)
        .attr("fill", preColor + opaVal + ")");
}


/***********************************************************/
/*********************scale functions***********************/
/*
 * linear map a list of number to [0, 0.9]
 * @param lst, array, the array to be mapped
 * @param rmin, float, the lower bound
 * @param rmax, float, the upper bound
 */
vis.linearScale = function(lst, rmin, rmax) {
    var max = Math.max.apply(Math, lst),
        min = Math.min.apply(Math, lst);

    return lscale = d3.scale.linear()
        .domain([min, max])
        .range([rmin, rmax]);
}
