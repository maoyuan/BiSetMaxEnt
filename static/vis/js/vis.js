/*
 * a simple framework to warp the basic svg operation
 * @author: Maoyuan Sun
 * @Date: Last Update, 11-17-2015
 */

var vis = {
    VERSION: 1.0
}


/*
 * add svg to a canvas
 * @param canvasID, string, the canvas to append svg
 * @param svgID, string, the id of the svg object
 * @param sHeight, int or float, the height of the svg object
 * @param sWidth, int or float, the width of the svg object
 */
vis.addSvg = function(canvasID, svgID, sHeight, sWidth) {
    return d3.select("#" + canvasID)
        .append('svg')
        .attr('id', svgID)
        .attr("width", sHeight)
        .attr('height', sWidth);
}


vis.setPathVisibilitybyClass = function(pclass, visibility) {
    return d3.selectAll(".line___" + pclass)
        .attr("visibility", visibility);
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


vis.setSvgObjOpacity = function(svgObj, preColor, opaVal) {
    return svgObj.attr("fill", preColor + opaVal + ")");
}


/*
 * toggle css class of a svg object
 * @param svgID, string, the id of the svg object
 * @param svgCssClass, string, the css class of the svg object
 * @param ToF, true or false
 */
vis.setSvgCssClass = function(svgID, svgCssClass, ToF) {
    d3.select("#" + svgID)
        .classed(svgCssClass, ToF);
}


/*
 * set font size of a text object
 * @param tID, string, the id of a text object
 * @param size, string, size of the font
 */
vis.setFontSize = function(tID, size) {
    d3.select("#" + tID)
        .style("font-size", size);
}


/*
 * set svg stroke and stroke width
 * @param svgObj, a d3 object
 * @param scolor, string, css color
 * @param swidth, int / flot, the width of the stroke 
 */
vis.setSvgStroke = function(svgObj, scolor, swidth) {
    return svgObj.attr("stroke", scolor)
        .attr("stroke-width", swidth);
}


/*
 * transform svg object
 * @param svgID, string, the id of svg object
 * @param x, float/int, x position
 * @param y, float/int, y position
 */
vis.svgTransform = function(svgID, x, y) {
    return d3.select("#" + svgID).transition()
        .attr("transform", function(d) {
            d.xPos = x;
            d.yPos = y;
            return "translate(" + d.xPos + "," + d.yPos + ")";
        });
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


/*
 * a linear scale
 * @param arrMinVal, min value in an array
 * @param arrMaxVal, max value in an arry
 * @param minVal, int or float, the min value
 * @param maxVal, int or flaot, the max value
 * @return d3.scale.linear()
 */
vis.linearScaleByVal = function(arrMinVal, arrMaxVal, mpMinVal, mpMaxVal) {
    return d3.scale.linear()
        .domain([arrMinVal, arrMaxVal])
        .range([mpMinVal, mpMaxVal]);
}

vis.powerScaleByVal = function(arrMinVal, arrMaxVal, mpMinVal, mpMaxVal) {
    return d3.scale.pow()
        .domain([arrMinVal, arrMaxVal])
        .range([mpMinVal, mpMaxVal]);
}



vis.getCircleXpos = function(circleID) {
    return d3.select("#" + circleID)
        .attr("cx");
}

vis.getCircleYpos = function(circleID) {
    return d3.select("#" + circleID)
        .attr("cy");
}



/*
 * setting checked by value
 * @param cVal, string, the value of a check box
 * @param ToF, string (true or false), set checked
 */
vis.setCheckedByVal = function(cVal, ToF) {
    $("input[type=checkbox][value=" + cVal + "]").prop("checked", ToF);
}
