/*
 * a simple framework to draw dimension info
 * @author: Maoyuan Sun
 */

var dimGraph = {
    VERSION: 1.0,

    canvas: {
        width: 100,
        height: 100
    }
}


dimGraph.dimCanvas = vis.addSvg("dimContainer", "dimCanvas",
    dimGraph.canvas.width, dimGraph.canvas.height);

console.log("update front end");

dimGraph.draw = function(nodes, edges) {
	console.log(nodes);
    var c10 = d3.scale.category10();

    var nodes = dimGraph.dimCanvas.selectAll("node")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("cx", function(d, i) {
            return i * 15
        })
        .attr("cy", function(d, i) {
            return i * 15
        })
        .attr("r", 5)
        .attr("fill", function(d, i) {
            return c10(i);
        })

}
