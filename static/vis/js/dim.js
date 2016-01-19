/*
 * a simple framework to draw dimension info
 * @author: Maoyuan Sun
 */

var dimGraph = {
    VERSION: 1.0,

    canvas: {
        width: 220,
        height: 220
    },
    node: {
        rmin: 5,
        rmax: 15,
        rPosMax: 80
    }
}


dimGraph.dimCanvas = vis.addSvg("dimContainer", "dimCanvas",
    dimGraph.canvas.width, dimGraph.canvas.height);

dimGraph.draw = function(nodes, edges) {
    console.log(nodes);
    var c10 = d3.scale.category10();

    var minEntCounts = objArrayExtremeVal(nodes, "entCounts", "min"),
        maxEntCounts = objArrayExtremeVal(nodes, "entCounts", "max"),
        nodesNum = nodes.length;

    nodeRscale = vis.linearScale(minEntCounts, maxEntCounts, dimGraph.node.rmin, dimGraph.node.rmax);

    var nodes = dimGraph.dimCanvas.selectAll("node")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("transform", "translate(" + dimGraph.canvas.width / 2 + "," + dimGraph.canvas.height / 2 + ")")
        .attr("cx", function(d, i) {
            return Math.sin(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax;
        })
        .attr("cy", function(d, i) {
            return Math.cos(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax;
        })
        .attr("r", function(d, i) {
            return nodeRscale(d.entCounts);
        })
        .attr("fill", function(d, i) {
            return c10(i);
        })

}
