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
        rmin: 8,
        rmax: 18,
        rPosMax: 80
    },
    edge: {
        wmin: 2,
        wmax: 6,

        transMin: 0.12,
        transMax: 0.5
    },
    cssClass: {
    	node: "dimNode",
    	edge: "dimEdge"
    }
}

// a global variable maintaining user selections
selectedDims = [];

dimGraph.dimCanvas = vis.addSvg("dimContainer", "dimCanvas",
    dimGraph.canvas.width, dimGraph.canvas.height);

dimGraph.draw = function(nodes, edges) {
    console.log(nodes);
    var c10 = d3.scale.category10();

    var minEntCounts = objArrayExtremeVal(nodes, "entCounts", "min"),
        maxEntCounts = objArrayExtremeVal(nodes, "entCounts", "max"),
        nodesNum = nodes.length,

        minEdgeFreq = objArrayExtremeVal(edges, "relFreq", "min"),
        maxEdgeFreq = objArrayExtremeVal(edges, "relFreq", "max"),

        minEdgeScore = objArrayExtremeVal(edges, "relScore", "min"),
        maxEdgeScore = objArrayExtremeVal(edges, "relScore", "max");

    var nodeRscale = vis.linearScaleByVal(minEntCounts, maxEntCounts, dimGraph.node.rmin, dimGraph.node.rmax),
        edgeWscale = vis.powerScaleByVal(minEdgeFreq, maxEdgeFreq, dimGraph.edge.wmin, dimGraph.edge.wmax),
        edgeTscale = vis.powerScaleByVal(minEdgeScore, maxEdgeScore, dimGraph.edge.transMin, dimGraph.edge.transMax);

    var graphNodes = dimGraph.dimCanvas.selectAll(dimGraph.cssClass.node)
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", dimGraph.cssClass.node)
        .attr("transform", "translate(" + dimGraph.canvas.width / 2 + "," + dimGraph.canvas.height / 2 + ")")
        .attr("cx", function(d, i) {
            return Math.sin(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax;
        })
        .attr("cy", function(d, i) {
            return Math.cos(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax * (-1);
        })
        .attr("r", function(d, i) {
            return nodeRscale(d.entCounts);
        })
        .attr("fill", function(d, i) {
            return c10(i);
        })
        .attr("id", function(d, i) {
            return "node_" + d.type;
        });

    graphNodes.on('mouseover', function(d, i) {
    	vis.setSvgStroke(d3.select(this), "black", 2);
    });

    graphNodes.on('mouseout', function(d, i) {
    	vis.setSvgStroke(d3.select(this), "black", 0);
    });

    graphNodes.on('click', function(d) {
        var selNode = d3.select(this).datum().type;
        if (selectedDims.indexOf(selNode) < 0)
            selectedDims.push(selNode);
        else {
            var selIndex = selectedDims.indexOf(selNode);
            selectedDims.splice(selIndex, 1);
        }

        console.log(selectedDims);
    });

    graphNodes.append("svg:title")
        .text(function(d) {
            return d.type;
        });

    /*var graphNodeText = dimGraph.dimCanvas.selectAll("dimNodeText")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class", "dimNodeText")
        .attr("transform", "translate(" + dimGraph.canvas.width / 2 + "," + dimGraph.canvas.height / 2 + ")")
        .attr("x", function(d, i) {
            var nodeXpos = Math.sin(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax,
                nodeYpos = Math.cos(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax * (-1),
                nodeRadius = nodeRscale(d.entCounts);

            return nodeXpos;
        })
        .attr("y", function(d, i) {
            var nodeXpos = Math.sin(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax,
                nodeYpos = Math.cos(2 * Math.PI * i / nodesNum) * dimGraph.node.rPosMax * (-1),
                nodeRadius = nodeRscale(d.entCounts);

            return nodeYpos;
        })
        .text(function(d, i) {
            console.log(d);
            return d.type;
        })
        .attr("fill", "rgba(0,0,0,0.8)")
        .attr("font-size", "0.8em");*/

    var graphEdges = dimGraph.dimCanvas.selectAll(dimGraph.cssClass.edge)
        .data(edges)
        .enter()
        .append("line")
        .attr("class", dimGraph.cssClass.edge)
        .attr("transform", "translate(" + dimGraph.canvas.width / 2 + "," + dimGraph.canvas.height / 2 + ")")
        .attr("x1", function(d, i) {
            var node1 = getStrSplited(d.relType, "__", 0),
                node2 = getStrSplited(d.relType, "__", 1),
                node1_xPos = vis.getCircleXpos("node_" + node1);
            return node1_xPos;
        })
        .attr("y1", function(d, i) {
            var node1 = getStrSplited(d.relType, "__", 0),
                node2 = getStrSplited(d.relType, "__", 1),
                node1_yPos = vis.getCircleYpos("node_" + node1);
            return node1_yPos;
        })
        .attr("x2", function(d, i) {
            var node1 = getStrSplited(d.relType, "__", 0),
                node2 = getStrSplited(d.relType, "__", 1),
                node2_xPos = vis.getCircleXpos("node_" + node2);
            return node2_xPos;
        })
        .attr("y2", function(d, i) {
            var node1 = getStrSplited(d.relType, "__", 0),
                node2 = getStrSplited(d.relType, "__", 1),
                node2_yPos = vis.getCircleYpos("node_" + node2);
            return node2_yPos;
        })
        .attr("id", function(d, i) {
            return d.relType;
        })
        .style("stroke", function(d, i) {
            return "rgba(255,0,0," + edgeTscale(d.relScore) + ")";
        })
        .style("stroke-width", function(d, i) {
            return edgeWscale(d.relFreq);
        });


}
