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


var dimCanvas = vis.addSvg("dimContainer", "dimCanvas", dimGraph.canvas.width, dimGraph.canvas.height);

