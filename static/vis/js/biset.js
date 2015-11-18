/*
 * BiSet
 * A small framework for visual analytics with biclusters
 * Author & Copyright: Maoyuan Sun
 * contact: smaoyuan@vt.edu
 * 
 *
 * This relies on:
 * D3.js
 */

var biset = {
    VERSION: '1.00',

    // global settings
    // the vis canvas
    visCanvas: {
        width: 3800,
        height: 3550,
        inUse: 0
    },
    // an individual entity in a list
    entity: {
        width: 260,
        height: 29,
        rdCorner: 5,
        freqWidth: 30,
        nBorder: 0,
        moBorder: 1.8,
        selBorder: 2.5
    },
    // a list
    entList: {
        width: 260,
        height: 2650,
        gap: 80,
        topGap: 10,
        startPos: 0,
        count: 0
    },
    // a bicluster in-between two lists
    bic: {
        frameWidth: 90,
        frameHStrokeWidth: 3,
        frameNStrokeWidth: 0,
        frameHeight: 30,
        frameBorderWidth: 1.2,
        frameRdCorner: 2,
        innerRdCorner: 2,
        count: 0
    },
    // a bicluster list
    bicList: {
        width: 90,
        height: 2650
    },
    // a connection link between two elements
    conlink: {
        nwidth: 1.2,
        hwidth: 1.5
    }, // 0.8, paper pic: 1.1

    colors: colorSet
}

// an array to store all links
var connections = [],
    entLists = [],
    selectedEnts = [];

// indicate dragging 
var draged = 0;

// a hash table to maintain the displayed bics
var bicDisplayed = [];

// a diction to record all relations for a mouseovered entity
var relations = [], // new Set(),
    relationsLink = [],

    entPathCaled = new Set(),
    entPathLinkedEnts = [],
    entPathLinkedLinks = [],

    // node needs to be highlighted
    highlightEntSet = new Set(),
    // a map of value for coloring each highlight node
    highlightEntList = [],

    // bic to be highlighted
    highlightBicSet = new Set(),
    // a map of value for enlarge the border of highlight bic
    highlightBicList = [],

    // links to be highlight
    highlightLinkSet = new Set(),
    // a map of value for highlight links
    highlightLinkList = [],

    // a set of all selected entities
    selEntSet = new Set();
// a set of all selected bics
selBicSet = new Set();

// a global list for all entities (key: entID, val: ent object)
var allEnts = {},
    // a global list for all bics (key: bicID, val: bic object), initialized in visctrl.js
    allBics = {},
    // a global list for all lists connected with bics
    allLinks = {},
    // a global list for all original links
    allOriLinks = {},
    // a global list of all docs
    allDocs = {},
    // number of list
    selectedLists = [];

// canvas for visualizations
var canvas = d3.select("#biset_canvas")
    .append('svg')
    .attr('id', 'vis_canvas')
    .attr("width", biset.visCanvas.width)
    .attr('height', biset.visCanvas.height);

// for debug
// $("svg").css({"border-color": "#C1E0FF", 
//          "border":"0px", 
//          "border-style":"solid"});

var svgPos = canvas[0][0].getBoundingClientRect(),
    svgCanvasOffset = {
        left: svgPos.left,
        top: svgPos.top
    };


$('.selectpicker').selectpicker({
    style: 'btn-default',
    size: 10
});

// get dataset name
var selData = $('#selDataSet').val();
// to do get column names from the database about the dataset

$("#dataDimensionList").append(
    "<input type='checkbox' name='dimensions' value='person' id='d_person'> Person<br />" +
    "<input type='checkbox' name='dimensions' value='location' id='d_location'> Location<br />" +
    "<input type='checkbox' name='dimensions' value='phone' id='d_phone'> Phone<br />" +
    "<input type='checkbox' name='dimensions' value='date' id='d_date'> Date<br />" +
    "<input type='checkbox' name='dimensions' value='org' id='d_org'> Organization<br />" +
    "<input type='checkbox' name='dimensions' value='misc' id='d_misc'> Misc<br />"
);


/*
 * Add a list in a canvas and return this list
 * @param canvas, the canvas for adding a list
 * @param listData, data to generate the list
 * @param bicList, the list of all bics
 * @param startPos, position to draw bar
 * @param networkData, all connections between bics and ents
 */
biset.addList = function(canvas, listData, bicList, startPos, networkData) {

    console.log(listData);

    // type of the list
    var type = listData.listType,
        // the list id
        listNum = listData.listID,
        // entities in this list
        entSet = listData.entities;

    // tmpSet = listData.entities;

    // for (var i = 0; i < 12; i++)
    // 	tmpSet.concat(entSet); 

    // entSet = tmpSet;

    // all entities
    for (var i = 0; i < entSet.length; i++)
        allEnts[entSet[i].entityIDCmp] = entSet[i];

    // values of each entity
    var dataValues = [],
        dataFrequency = [],
        dataIndex = [];

    for (var i = 0; i < entSet.length; i++) {
        dataValues.push(entSet[i].entValue);
        dataFrequency.push(entSet[i].entFreq);
        dataIndex.push(entSet[i].index);
    }

    dataValues.sort();

    // position for each entity in y-axis
    var y = d3.scale.ordinal()
        .domain(dataValues)
        .rangePoints([biset.entList.topGap, entSet.length * biset.entity.height + biset.entList.topGap], 0);

    var freIndicatorWidth = d3.scale.linear()
        .domain([0, d3.max(dataFrequency)])
        .range([3, biset.entity.freqWidth - 1]);

    // add control group of a list
    $("#biset_control").append("<div class='listControlGroup'>" +
        "<div class='listTileContainer'><h5 class='listTitle' id='listTitle_" + listNum + "'>" + type + "</h5></div> " +
        "<span class='orderCtrlLabel glyphicon glyphicon-sort-by-alphabet' id='list_" + listNum + "_ctrl_label'></span>" +
        "<select class='orderCtrl' id='list_" + listNum + "_sortCtrl'>" +
        "<option value='alph'>Alphabeic</option>" +
        "<option value='freq'>Frequency</option>" +
        "</select>" +
        "</div>");

    // add controller for link list (e.g., bics and links)
    if (listNum < selectedLists.length) {
        var bListRGroupName = "bListCtrl_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            bicMode = "bic_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            linkMode = "link_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            HybridMode = "hybrid_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum];
        ClusterMode = "cluster_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum];
        ClusterModeLeft = "clusterLeft_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum];
        ClusterModeRight = "clusterRight_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum];

        $("#biset_control").append("<div class='BiclistControlGroup'>" +
            "<select class='bListCtrl' id='" + bListRGroupName + "'>" +
            "<option value='" + bicMode + "'>Bic Only Mode</option>" +
            "<option value='" + linkMode + "'>Link Only Mode</option>" +
            "<option value='" + HybridMode + "'>Hybrid Mode</option>" +
            // "<option value='" + ClusterMode + "'>Cluster Mode</option>" +
            // "<option value='" + ClusterModeLeft + "'>Sort Left List</option>" +
            // "<option value='" + ClusterModeRight + "'>Sort Right List</option>" +
            "</select>" +

            // "<span class='btn btn-xs btn-default bListCtrlSortList' style='margin-left: 15px;'>Organize List</span>" + 

            "<select class='bListCtrlSortBic' id='" + bListRGroupName + "_sort_bic' style='margin-left: 45px'>" +
            "<option value='ClusterSize'>Order Bic by Size</option>" +
            "<option value='" + ClusterMode + "'>Order Bic by two list</option>" +
            "<option value='" + ClusterModeLeft + "'>Order Bic by Left List</option>" +
            "<option value='" + ClusterModeRight + "'>Order Bic by Right List</option>" +
            "</select>" +
            "</div>");

        // $("#biset_control").append("<div class='BiclistControlGroup'>" +
        // 	"<label class='radio-inline'><input type='radio' name='" + bListRGroupName + "'>Bic</label>" +
        // 	"<label class='radio-inline'><input type='radio' name='" + bListRGroupName + "'>Hybrid</label>" +
        // 	"<label class='radio-inline'><input type='radio' name='" + bListRGroupName + "'>Links</label>" +
    }

    // add group to the svg
    var bar = canvas.selectAll("." + type)
        .data(entSet)
        .enter().append("g")
        .attr('class', type)
        .attr("id", function(d, i) {
            return type + "_" + d.entityID;
        })
        .attr("transform", function(d, i) {

            // the initial pos for each node
            d.xPos = 2;
            d.yPos = y(d.entValue);

            return "translate(" + 2 + "," + y(d.entValue) + ")";
        });

    // add texts for each entity
    var viewText = bar.append("text")
        .attr("id", function(d) {
            return d.entityIDCmp + "_text"
        })
        .attr("x", biset.entity.width / 8)
        .attr("y", biset.entity.height / 2)
        .attr("dy", ".36em")
        .style("font-size", "0.83em")
        .text(function(d) {
            return d.entValue;
        });

    // add bar for each entity
    var entityFreIndicator = bar.append("rect")
        .attr("width", function(d, i) {
            return freIndicatorWidth(d.entFreq);
        })
        .attr("height", biset.entity.height - 2)
        .attr("rx", biset.entity.rdCorner)
        .attr("ry", biset.entity.rdCorner)
        .attr("id", function(d, i) {
            return type + "_" + d.entityID + "_freq";
        })
        .attr("fill", biset.colors.entFreColor);

    // add bar for each entity
    var entityFrame = bar.append("rect")
        .datum(function(d) {
            return d;
        })
        .attr("width", biset.entity.width)
        .attr("height", biset.entity.height - 2)
        .attr("rx", biset.entity.rdCorner)
        .attr("ry", biset.entity.rdCorner)
        .attr("id", function(d, i) {
            return type + "_" + d.entityID + "_frame";
        })
        .attr("class", "entNormal")
        .attr("fill", biset.colors.entNormal);


    // add contextmenu to bics
    $("." + type).contextmenu({
        target: '#ent-context-menu',
        onItem: function(context, e) {
            // console.log(context.attr("id"));
            var thisID = context.attr("id"),
                thisFrameID = thisID + "_frame";

            // consider nodes with biclusters
            if (networkData[thisID] !== undefined) {

                // releated info for current node
                var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                    nodes = relInfo.ents,
                    links = relInfo.paths;

                nodes.forEach(function(n) {
                    if (n.indexOf("bic") < 0)
                        console.log(allEnts[n].numCoSelected);
                    else
                        console.log(allBics[n].bicNumCoSelected);
                });
            }
        }
    });

    // mouseover event
    bar.on("mouseover", function(d, i) {
        // when dragging stops
        if (draged == 0) {
            if (d.mouseovered == false && d.selected == false) {
                var thisEntType = d.entType,
                    thisID = d.entityIDCmp,
                    thisFrameID = thisID + "_frame";

                // consider all connected nodes
                if (networkData[thisID] !== undefined) {
                    // all releated info (nodes + links) of current node
                    var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                        nodes = relInfo.ents,
                        links = relInfo.paths;

                    nodes.forEach(function(node) {
                        if (node.indexOf("_bic_") > 0) {
                            // record the bic that need highlight
                            highlightBicSet.add(node);
                            allBics[node].bicNumCoSelected += 1;
                            highlightBicList[node] = allBics[node].bicNumCoSelected;
                        } else {
                            // record the node that need highlight
                            highlightEntSet.add(node);
                            // how much each node need highlight
                            allEnts[node].numCoSelected += 1;
                            highlightEntList[node] = allEnts[node].numCoSelected;
                        }
                    });

                    links.forEach(function(lk) {
                        highlightLinkSet.add(lk);
                        allLinks[lk].linkNumCoSelected += 1;
                        highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
                    });

                    // highlight related bics
                    biset.entsUpdate(highlightBicSet, highlightBicList, "bic"); // , "bicBorder"
                    // update the color of ents in highlight set
                    biset.entsUpdate(highlightEntSet, highlightEntList, "ent"); // , "entColor"
                    // update links
                    biset.linksUpdate(highlightLinkSet, highlightLinkList);
                }

                // add border to current ent
                biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);
                // change the status to be mouseovered
                d.mouseovered = true;
            }

            // for selected nodes
            else if (d.mouseovered == true && d.selected == true) {

                var thisEntType = d.entType,
                    thisID = d.entityIDCmp,
                    thisFrameID = thisID + "_frame";

                if (networkData[thisID] !== undefined) {
                    // all releated info (nodes + links) of current node
                    var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                        nodes = relInfo.ents,
                        links = relInfo.paths;

                    nodes.forEach(function(e) {
                        if (e.indexOf("_bic_") < 0)
                            d3.select("#" + e + "_text")
                            .classed("text-large", true)
                            .style("font-size", "1.1em");
                    });
                }
            }
        }
    });

    // mouseout event handler
    bar.on("mouseout", function(d, i) {
        // when dragging stops
        if (draged == 0) {
            if (d.mouseovered == true && d.selected == false) {
                var thisEntType = d.entType,
                    thisID = d.entityIDCmp,
                    thisFrameID = thisID + "_frame";

                // consider nodes with biclusters
                if (networkData[thisID] !== undefined) {

                    // releated info for current node
                    var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                        nodes = relInfo.ents,
                        links = relInfo.paths;

                    // unhighlight all relevent entities
                    nodes.forEach(function(node) {
                        if (node.indexOf("_bic_") > 0) {
                            allBics[node].bicNumCoSelected -= 1;

                            if (allBics[node].bicNumCoSelected == 0)
                                highlightBicSet.delete(node);
                            else
                                highlightBicList[node] = allBics[node].bicNumCoSelected;
                        } else {
                            // if (!selEntSet.has(node))
                            allEnts[node].numCoSelected -= 1;

                            if (allEnts[node].numCoSelected == 0)
                                highlightEntSet.delete(node);
                            else
                                highlightEntList[node] = allEnts[node].numCoSelected;
                        }
                    });

                    links.forEach(function(lk) {
                        allLinks[lk].linkNumCoSelected -= 1;
                        if (allLinks[lk].linkNumCoSelected == 0)
                            highlightLinkSet.delete(lk);
                        else
                            highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
                    });

                    // highlight related bics
                    biset.entsUpdate(highlightBicSet, highlightBicList, "bic"); //bicBorder
                    // unhighlight all unrelated bics
                    biset.entsBackToNormal(allBics, "bic");

                    // highlight ents those need to be highlighted
                    biset.entsUpdate(highlightEntSet, highlightEntList, "ent"); // entColor
                    // unhighlight the rest nodes
                    biset.entsBackToNormal(allEnts, "ent");

                    // update links
                    biset.linksUpdate(highlightLinkSet, highlightLinkList);
                    // unhighlight the rest links
                    biset.linksBackToNormal(allLinks);
                }
                // update the border of current node
                biset.barUpdate("#" + thisFrameID, "", biset.colors.entNormalBorder, biset.entity.nBorder);
                // switch mouseover to off
                d.mouseovered = false;
            }

            // for clicked node
            else if (d.mouseovered == true && d.selected == true) {
                var thisEntType = d.entType,
                    thisID = d.entityIDCmp,
                    thisFrameID = thisID + "_frame";

                if (networkData[thisID] !== undefined) {
                    // all releated info (nodes + links) of current node
                    var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                        nodes = relInfo.ents,
                        links = relInfo.paths;

                    nodes.forEach(function(e) {
                        if (e.indexOf("_bic_") < 0)
                            d3.select("#" + e + "_text")
                            .classed("text-large", false)
                            .style("font-size", "0.75em");
                    });
                }
            }
        }
    });

    // click event handler for entities
    bar.on("click", function(d, i) {

        var thisEntType = d.entType,
            thisID = d.entityIDCmp,
            thisEntValue = d.entValue;
        thisFrameID = thisID + "_frame";

        var requestVal = thisEntValue,
            requestJSON = {
                "query": thisEntValue
            };

        // search entity from wiki and retrieve results
        // visCtrlRequest(requestJSON, "wikisummary");

        var csrftoken = $('#csrf_token').val();

        // retrieve information from Wiki
        $.ajax({
            url: window.SERVER_PATH + 'wiki/wikisummary/',
            type: "POST",
            data: JSON.stringify(requestJSON),
            contentType: "application/json",
            success: function(data) {
                var sumtxt = data.sumtxt,
                    optiontxt = data.option,
                    empTxt = data.empty;

                $("#vis_wiki_title").html(requestVal);

                if (sumtxt.length != 0)
                    $("#vis_wiki_text").html(sumtxt);
                else {
                    if (optiontxt.length != 0) {
                        var text = "Do you mean: " + optiontxt[0] + ", or " + optiontxt[1] + "?";
                        $("#vis_wiki_text").html(text);
                    } else
                        $("#vis_wiki_text").html(empTxt);
                }
            },
            beforeSend: function(xhr, settings) {
                if (!csrfSafeMethod(settings.type) && !this.crossDomain)
                    xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        });

        // case for selecting nodes
        if (d.selected == false) {

            if (networkData[thisID] !== undefined) {
                // record the clicked node
                selEntSet.add(thisID);
            }
            biset.barUpdate("#" + thisFrameID, "", biset.colors.entSelBorder, biset.entity.selBorder);
            d.selected = true;


            // version 1: click as intersect
            // ===================================
            /*
			// considering node with bics
			if (networkData[thisID] !== undefined) {				

				if (selEntSet.size == 0) {
					// change the bar status to "select"
					biset.barUpdate("#" + thisFrameID, "", biset.colors.entSelBorder, biset.entity.selBorder); 
				}
				else {
					// releated info for current node
					var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
						nodes = relInfo.ents,
						links = relInfo.paths;

	    			// highlight all relevent entities
					nodes.forEach(function(node) {
						if (node.indexOf("_bic_") > 0) {
							if (highlightBicList[node] == 1) {
								allBics[node].bicNumCoSelected = 0;
								highlightBicList[node] = allBics[node].bicNumCoSelected;
								highlightBicSet.delete(node);
							}
						}
						else {
							if (node != thisID) {
								if (highlightEntList[node] == 1) {
									allEnts[node].numCoSelected = 0;
									highlightEntList[node] = allEnts[node].numCoSelected;
									highlightEntSet.delete(node);
								}
							}
						}
					});

					links.forEach(function(lk) {
						if (highlightLinkList[lk] == 1) {
							allLinks[lk].linkNumCoSelected = 0;
							highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
							highlightLinkSet.delete(lk);
						}
					});
					
					//delete the frequency 1 items in highlightEntList;
					for (ent in highlightEntList) {
						if (highlightEntList[ent] == 1 
							// except for previous selected nodes
							&& allEnts[ent].selected == false
							// except for the current node
							&& ent != thisID) {
								allEnts[ent].numCoSelected = 0;
								highlightEntList[ent] = allEnts[ent].numCoSelected;
								highlightEntSet.delete(ent);
						}
					}

					// delete bic with frequency 1 in highligth bic list
					for (bic in highlightBicList) {
						if (highlightBicList[bic] == 1) {
							allBics[bic].bicNumCoSelected = 0;
							highlightBicList[bic] = allBics[bic].bicNumCoSelected;
							highlightBicSet.delete(bic);
						}
					}

					// delete link with frequency 1 in highlight link list
					for (lk in highlightLinkList) {
						if (highlightLinkList[lk] == 1) {
							allLinks[lk].linkNumCoSelected = 0;
							highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
							highlightLinkSet.delete(lk);
						}
					}

					// highlight ents those need to be highlighted
					biset.entsUpdate(highlightEntSet, highlightEntList, "entColor");
					// unhighlight the rest nodes
					biset.entsBackToNormal(allEnts, "entColor");
					// change the border of current node
					biset.barUpdate("#" + thisFrameID, "", biset.colors.entSelBorder, biset.entity.selBorder); 

					// highlight related bics
					biset.entsUpdate(highlightBicSet, highlightBicList, "bicBorder");
					// unhighlight all unrelated bics
					biset.entsBackToNormal(allBics, "bicBorder");

					// update links
					biset.linksUpdate(highlightLinkSet, highlightLinkList);
					// unhighlight the rest links
					biset.linksBackToNormal(allLinks);
				}
				// record the clicked node
				selEntSet.add(thisID);
			}

			// for node withouth any connections
			else {
				// change the border of current node
				biset.barUpdate("#" + thisFrameID, "", biset.colors.entSelBorder, biset.entity.selBorder); 					
			}

			d.selected = true;
			*/
            // ===================================
        }

        // case for deselecting nodes
        else {
            if (networkData[thisID] !== undefined) {
                selEntSet.delete(thisID);

                // releated info for current node
                var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                    nodes = relInfo.ents,
                    links = relInfo.paths;
                // change the font size back to normal
                nodes.forEach(function(e) {
                    if (e.indexOf("_bic_") < 0) {
                        if (biset.getClass("#" + e + "_text", "text-large") == true) {
                            d3.select("#" + e + "_text")
                                .style("font-size", "0.75em");
                        }
                    }
                });
            }
            biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);
            d.selected = false;

            // version 1: click as intersect
            // ===================================
            /*
			// considering node with bics
			if (networkData[thisID] !== undefined) {
				if (selEntSet.size == 1) {
					// just change the ent border
					biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);	
				}
				else {
					// clear current ent highlight set
					highlightEntSet.forEach(function(e) {
						allEnts[e].numCoSelected = 0;
						highlightEntList[e] = allEnts[e].numCoSelected;
					});
					highlightEntSet.clear();

					// clear curret bic highlight set
					highlightBicSet.forEach(function(e) {
						allBics[e].bicNumCoSelected = 0;
						highlightBicList[e] = allBics[e].bicNumCoSelected;
					});
					highlightBicSet.clear();

					var selEnts = [];
					selEntSet.forEach(function(e) {
						if (e != thisID)
							selEnts.push(e); 
					});

					var tmpHSet = entPathLinkedEnts[selEnts[0]];

					for (var j = 1; j < selEnts.length; j++) {
						tmpHSet = biset.setIntersect(tmpHSet, entPathLinkedEnts[selEnts[j]]);
					}

					// case: when all clicked nodes have no common node
					if (tmpHSet.size == 0) {
						selEntSet.forEach(function(e) {
							if (e != thisID) {
								highlightEntSet.add(e);
								allEnts[e].numCoSelected += 1;
								highlightEntList[e] = allEnts[e].numCoSelected;
							}
						});			
					}
					else {
						tmpHSet.forEach(function(e) {
							if (e.indexOf("_bic_") < 0) {
								highlightEntSet.add(e);
								allEnts[e].numCoSelected += selEnts.length;
								highlightEntList[e] = allEnts[e].numCoSelected;
							}
							else {
								highlightBicSet.add(e);
								allBics[e].bicNumCoSelected += selEnts.length;
								highlightBicList[e] = allBics[e].bicNumCoSelected;
							}
						});

						// add selected node that are not in highlight set
						selEntSet.forEach(function(e) {
							if (e != thisID && !highlightEntSet.has(e)) {
								highlightEntSet.add(e);
								allEnts[e].numCoSelected += 1;
								highlightEntList[e] = allEnts[e].numCoSelected;
							}
						});
					}

					var curNodeSet = entPathLinkedEnts[thisID];
					curNodeSet.forEach(function(e) {
						if (e.indexOf("_bic_") < 0) {
							allEnts[e].numCoSelected += 1;
							highlightEntList[e] = allEnts[e].numCoSelected;

							if (!highlightEntSet.has(e))
								highlightEntSet.add(e);
						}
						else {
							allBics[e].bicNumCoSelected += 1;
							highlightBicList[e] = allBics[e].bicNumCoSelected;

							if (!highlightBicSet.has(e))
								highlightBicSet.add(e);
						}
					});

					biset.entsUpdate(highlightEntSet, highlightEntList, "entColor");
					// change current ent border to normal
					biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);

					biset.entsUpdate(highlightBicSet, highlightBicList, "bicBorder");
				}

				// update the set of clicked nodes
				selEntSet.delete(thisID);
			}
			else {
				// change current ent border to normal
				biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);				
			}

			d.selected = false;
	    	*/
            // =================================== 
        }
    });

    // for an object for this list
    var listView = {
        "id": "list_" + listNum,
        "dataType": type,
        "relatedDataSet": listData,
        "startPos": startPos,
        "yAxis": y,
        "entGroups": bar,
        "entities": entityFrame,
        "texts": viewText
    }
    return listView;
}


/*
 * union two sets
 * @param set1, the 1st set
 * @param set2, the 2nd set
 * @return rset, a set with all elements in set1 and set 2
 */
biset.setUnion = function(set1, set2) {
    if (set1.size == 0)
        return set2;
    else if (set2.size == 0)
        return set1;
    else {
        var rset = new Set();
        set1.forEach(function(e) {
            rest.add(e);
        });

        set2.forEach(function(e) {
            if (reset.has(e) == false)
                reset.add(e);
        });
        return rset;
    }
}


/*
 * intersect two sets
 * @param set1, the 1st set
 * @param set2, the 2nd set
 * @return rset, a set with all elements in set1 and set 2
 */
biset.setIntersect = function(set1, set2) {
    if (set1.size == 0 || set2.size == 0) {
        var nullSet = new Set();
        return nullSet;
    } else {
        var rset = new Set();
        set1.forEach(function(e) {
            if (set2.has(e) == true)
                rset.add(e);
        });
        return rset;
    }
}


/*
 * Given an entity, find its all related nodes and links
 * @param entID, the id of an entity
 * @param consDict, a dictionary of all relations
 * @param entPathCaled, a set of ents that have been calculated their paths 
 * @return {obj}, a object contains related nodes and links
 */
biset.findAllCons = function(entID, consDict, entPathCaled) {
    if (entPathCaled.has(entID) == false) {
        // a group of nodes related with each other
        var nodes = new Set(),
            // keyword of the node (e.g., people, location) 
            kwdSet = new Set(),
            // a set of nodes to be expanded 	
            expEntSet = new Set(),
            // a set of links between these related nodes	
            allLinks = new Set();

        expEntSet.add(entID);
        biset.findAllConsHelper(expEntSet, consDict, nodes, kwdSet, allLinks);

        entPathCaled.add(entID);

        // add all related nodes and links 
        entPathLinkedEnts[entID] = nodes;
        entPathLinkedLinks[entID] = allLinks;
    } else {
        var nodes = entPathLinkedEnts[entID],
            allLinks = entPathLinkedLinks[entID];
    }

    var obj = {};
    obj.ents = nodes;
    obj.paths = allLinks;

    return obj;
}


/*
 * Get key value based on node type
 * @param node, the id of a node
 * @return {string}, the type of this node
 */
biset.getKeyfromNode = function(node) {
    var ret;
    var nodeType = node.split("_")[0],
        idSize = node.split("_").length;
    if (idSize == 2)
        ret = nodeType;
    else {
        var type2 = node.split("_")[1];
        ret = nodeType + "_" + type2;
    }
    return ret;
}


/*
 * Given an entity, find its all related nodes and links
 * @param expandSet, a set of entity to be expanded for exam
 * @param consDict, a dictionary of relations for all entities
 * @param key, a set of keywords of entity types
 * @param paths, a set of paths from the given entity to all connected nodes
 */
biset.findAllConsHelper = function(expandSet, consDict, nodeSet, key, paths) {

    var toBeExpanded = new Set();
    var found = false;

    if (expandSet.size == 0)
        return;

    expandSet.forEach(function(value) {
        if (!nodeSet.has(value))
            nodeSet.add(value);

        if (consDict[value] !== undefined) {

            if (!key.has(biset.getKeyfromNode(value))) {
                var tmpArray = consDict[value];
                for (var i = 0; i < tmpArray.length; i++) {
                    found = false;
                    key.forEach(function(kval) {
                        var typewd = tmpArray[i].split("_");
                        if (typewd.length == 2) {
                            if (kval == typewd[0])
                                found = true;
                        } else {
                            var tmpKey = typewd[0] + "_" + typewd[1];
                            if (tmpKey == kval)
                                found = true;
                        }
                    });
                    if (found == false) {
                        toBeExpanded.add(tmpArray[i]);

                        var a = value,
                            b = tmpArray[i];
                        if (a.localeCompare(b) < 0) {
                            var tmp = b,
                                b = a,
                                a = tmp;
                        }

                        var curPath = a + "__" + b;
                        paths.add(curPath);
                    }
                }
            }
        }
    });

    if (nodeSet.size != 1)
        nodeSet.forEach(function(node) {
            key.add(biset.getKeyfromNode(node));
        });

    if (toBeExpanded.size == 0)
        return;

    biset.findAllConsHelper(toBeExpanded, consDict, nodeSet, key, paths);
}


/*
 * change entity status back to normal
 * @param entSet, a set of entities
 * @param eType, the type of entities
 */
biset.entsBackToNormal = function(entSet, eType) {
    if (eType == "ent") {
        for (e in entSet) {
            if (entSet[e].numCoSelected == 0)
                biset.barUpdate("#" + e + "_frame", biset.colors.entNormal, "", "");
        }
    } else if (eType == "bic") {
        for (e in entSet) {
            if (entSet[e].bicNumCoSelected == 0)
                biset.barUpdate("#" + e + "_frame", biset.colors.bicFrameColor, "", "");
            // biset.barUpdate("#" + e + "_frame", "", biset.colors.bicFrameHColor, 0); 
        }
    }
}

/*
 * update visual attributes of a set of ents
 * @param entSet, a set of entity names
 * @param entValList, a list of values for each ent in the ent set
 * @param updateType, color or border
 */
biset.entsUpdate = function(entSet, entValList, updateType) {

    if (updateType == "ent") {
        entSet.forEach(function(e) {
            if (entValList[e] > 0) {
                var alfaVal = 0.15 + 0.08 * (entValList[e] - 1),
                    colEntNewColor = "rgba(228, 122, 30, " + alfaVal + ")";
                biset.barUpdate("#" + e + "_frame", colEntNewColor, "", "");
            } else
            // change back to normal color
                biset.barUpdate("#" + e + "_frame", biset.colors.entNormal, "", "");
        });
    } else if (updateType == "bic") {
        entSet.forEach(function(e) {
            var alfaVal = 0.15 + 0.08 * (entValList[e] - 1),
                colEntNewColor = "rgba(228, 122, 30, " + alfaVal + ")";
            biset.barUpdate("#" + e + "_frame", colEntNewColor, "", "");
        });
    }

    // if (updateType == "entColor") {
    // 	entSet.forEach(function(e) {
    // 		var alfaVal = 0.15 + 0.05 * (entValList[e] - 1),
    // 			colEntNewColor = "rgba(228, 122, 30, " + alfaVal + ")";
    // 		biset.barUpdate("#" + e + "_frame", colEntNewColor, "", ""); 
    // 	});
    // }
    // else if (updateType == "bicBorder") {
    // 	entSet.forEach(function(e){
    // 		var increasedWidth = 2 * (entValList[e] - 1),
    // 			bicFrameNewBorder = biset.bic.frameHStrokeWidth + increasedWidth;
    // 		biset.barUpdate("#" + e + "_frame", "", biset.colors.bicFrameHColor, bicFrameNewBorder); 
    // 	});		
    // }
}

/*
 * function to update the color of correlated entities
 * @param entID, the ID of correlated entities
 * @param barColor, the new color of the bar
 * @param barClass, the new class of the bar
 * @param bdColor, the color for border
 * @param bdStrokeWidth, border width of the bar
 */
biset.barUpdate = function(entID, barColor, bdColor, bdStrokeWidth) { //barClass, 
    // only update the color of the bar
    if (bdColor == "" && bdStrokeWidth == "") {
        d3.select(entID)
            .attr("fill", barColor)
            // .attr("class", barClass)
    } else {
        // update both color and border of the bar
        if (barColor != "") {
            d3.select(entID)
                .attr("fill", barColor)
                // .attr("class", barClass)
                .style("stroke", bdColor)
                .style("stroke-width", bdStrokeWidth);
        }
        // update the border of the bar
        else {
            d3.select(entID)
                // .attr("class", barClass)
                .style("stroke", bdColor)
                .style("stroke-width", bdStrokeWidth);
        }
    }
}


/*
 * change link status back to normal
 * @param linkSet, a list of links
 */
biset.linksBackToNormal = function(linkList) {
    for (l in linkList) {
        if (linkList[l].linkNumCoSelected == 0)
            biset.linksUpdateHelper("#" + l, biset.colors.lineNColor, biset.conlink.nwidth);
    }
}

/*
 * update all links
 * @param linkSet, a set of links needs update
 * @param linkList, a list of vlaue to determine width of each link
 */
biset.linksUpdate = function(linkSet, linkList) {
    linkSet.forEach(function(l) {
        var lkWidth = biset.conlink.nwidth + linkList[l] * 0.8;
        biset.linksUpdateHelper("#" + l, biset.colors.linePreHColor, lkWidth);
    });
}

/*
 * function to update the color of links
 * @param linkID, the ID of the link
 * @param newColor, the new color of the link
 * @param newWidth, the new width of the link
 * @param newClass, the new class of the link
 */
biset.linksUpdateHelper = function(linkID, newColor, newWidth) { // newClass
    d3.select(linkID)
        .style("stroke", newColor)
        .style("stroke-width", newWidth)
        // .attr("class", newClass);
}


//place the bic based on their entities positiones


biset.addBics = function(preListCanvas, bicListCanvas, listData, bicList, bicStartPos, row, col, networkData) {
    // total entities in bics
    var bicTotalEnts = [],
        // # of left ents in a bic
        bicLeftEnts = [],
        // all biclusters between two given lists
        biclusters = [];

    for (key in bicList) {
        var entNumInRow = bicList[key].row.length,
            entNumInCol = bicList[key].col.length,
            // tmpRatio = entNumInRow / (entNumInRow + entNumInCol),
            tmpSum = entNumInRow + entNumInCol;

        bicTotalEnts.push(tmpSum);
        // tmpTotalEnts.push(tmpSum);
        bicLeftEnts.push(entNumInRow);

        if (bicList[key].rowField == row && bicList[key].colField == col)
        // get all biclusters
            biclusters.push(bicList[key]);
    }

    var bicEntsMin = Array.min(bicTotalEnts),
        bicEntsMax = Array.max(bicTotalEnts);

    // visual percentage based on the count
    var bicEntsCount = d3.scale.linear()
        .domain([0, bicEntsMax])
        .range([0, biset.bic.frameWidth]);

    biclusters.sort(function(a, b) {
        return a.index - b.index;
    });

    // add all bics
    var bics = bicListCanvas.selectAll(".bics")
        .data(biclusters)
        .enter().append("g")
        .attr("id", function(d) {
            return d.bicIDCmp;
        })
        .attr("class", "bics")
        .attr("transform", function(d, i) {

            // 		var cfield = d.colField,
            // 			rfield = d.rowField,
            // 			cols = d.col,
            // 			rows = d.row,
            // 			yPos = 0,
            // 			xPos = 0;

            // // y pos of the row ents
            // for (var j = 0; j < rows.length; j++){
            // 	var rid = rfield + "_" + rows[j],
            // 		rY = d3.select("#" + rid)[0][0].getBoundingClientRect().top;
            // 	yPos += rY;
            // }

            // // y pos of the col ents
            // for (var k = 0; k < cols.length; k++) {
            // 	var cid = cfield + "_" + cols[k],
            // 		cY = d3.select("#" + cid)[0][0].getBoundingClientRect().top;
            // 	yPos += cY;
            // }

            // // xPos = (biset.entList.gap * 4) * cols.length / (rows.length + cols.length) - biset.entList.gap * 2;
            // yPos = yPos / (rows.length + cols.length);
            // d.yPos = yPos;
            // 		return "translate(" + xPos + "," + yPos + ")";
            // original position
            return "translate(" + 0 + "," + (i + 1) * biset.bic.frameHeight + ")";
        });

    // proportion of row
    bics.append("rect")
        .attr("id", function(d, i) {
            var rfield = d.rowField,
                cfield = d.colField;
            return rfield + "_" + cfield + "_bic_" + d.bicID + "_left";
        })
        .attr("width", function(d, i) {
            return bicEntsCount(d.rowEntNum);
        }) // bicLeftEnts[i]
        .attr("height", biset.entity.height - 1)
        .attr("rx", biset.bic.innerRdCorner)
        .attr("ry", biset.bic.innerRdCorner)
        .attr("fill", biset.colors.bicFreColor); //entFreColor

    // set the length of a bicluster based on its component
    bics.append("rect")
        .attr("id", function(d, i) {
            var rfield = d.rowField,
                cfield = d.colField;
            return rfield + "_" + cfield + "_bic_" + d.bicID + "_frame";
        })
        .attr("class", "bicFrame")
        .attr("width", function(d, i) {
            return bicEntsCount(d.totalEntNum);
        }) //bicTotalEnts[i]
        .attr("height", biset.entity.height - 1)
        .attr("rx", biset.bic.frameRdCorner)
        .attr("ry", biset.bic.frameRdCorner)
        .attr("fill", biset.colors.bicFrameColor);

    $("[name='bicSelectSwitch']").bootstrapSwitch();

    // event handler when showing the menu
    bicMenuMark("bic-context-menu", "bicSelectSwitch");

    // add contextmenu to bics
    addMenuToBic("bics");

    // mouseover event for bic
    bics.on("mouseover", function(d) {

        if (d.bicMouseOvered == false && d.bicSelected == false) {

            var thisID = d.bicIDCmp;

            // releated info for current node
            var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                nodes = relInfo.ents,
                links = relInfo.paths;

            /**************** only for this bic ******************************/
            // var entsInfo = biset.findEntIDsInBic(thisID, allBics),
            // 	entIDs = entsInfo.allEnts;

            // for (var i = 0; i < entIDs.length; i++) {
            // 	highlightEntSet.add(entIDs[i]);
            // 	allEnts[entIDs[i]].numCoSelected += 1;
            // 	highlightEntList[entIDs[i]] = allEnts[entIDs[i]].numCoSelected;
            // }

            // links.forEach(function(lk){
            // 	if (lk.indexOf(thisID) >= 0) {
            // 		highlightLinkSet.add(lk);
            // 		allLinks[lk].linkNumCoSelected += 1;
            // 		highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
            // 	}
            // });
            /***************************************************************/

            nodes.forEach(function(node) {
                if (node.indexOf("_bic_") > 0) {
                    // record the bic that need highlight
                    highlightBicSet.add(node);
                    allBics[node].bicNumCoSelected += 1;
                    highlightBicList[node] = allBics[node].bicNumCoSelected;
                } else {
                    // record the node that need highlight
                    highlightEntSet.add(node);
                    // how much each node need highlight
                    allEnts[node].numCoSelected += 1;
                    highlightEntList[node] = allEnts[node].numCoSelected;
                }
            });
            // update the color of ents in highlight set
            biset.entsUpdate(highlightEntSet, highlightEntList, "ent");
            // highlight related bics
            biset.entsUpdate(highlightBicSet, highlightBicList, "bic");


            links.forEach(function(lk) {
                highlightLinkSet.add(lk);
                allLinks[lk].linkNumCoSelected += 1;
                highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
            });
            // update links
            biset.linksUpdate(highlightLinkSet, highlightLinkList);

            biset.barUpdate("#" + thisID + "_frame", "", biset.colors.bicFrameHColor, 2);

            d.bicMouseOvered = true;
        }
        // for selected nodes
        else if (d.bicMouseOvered == true && d.bicSelected == true) {

            var thisID = d.bicIDCmp,
                thisFrameID = thisID + "_frame";

            if (networkData[thisID] !== undefined) {
                // all releated info (nodes + links) of current node
                var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                    nodes = relInfo.ents,
                    links = relInfo.paths;

                nodes.forEach(function(e) {
                    if (e.indexOf("_bic_") < 0)
                        d3.select("#" + e + "_text")
                        .classed("text-large", true)
                        .style("font-size", "1.1em");
                });
            }
        }

    });

    // mouseout event for bic
    bics.on("mouseout", function(d) {

        if (d.bicMouseOvered == true && d.bicSelected == false) {

            var thisID = d.bicIDCmp;

            // releated info for current node
            var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                nodes = relInfo.ents,
                links = relInfo.paths;

            /**************** only for this bic ******************************/
            // var entsInfo = biset.findEntIDsInBic(thisID, allBics),
            // 	entIDs = entsInfo.allEnts;

            // for (var i = 0; i < entIDs.length; i++) {
            // 	highlightEntSet.add(entIDs[i]);
            // 	allEnts[entIDs[i]].numCoSelected -= 1;
            // 	highlightEntList[entIDs[i]] = allEnts[entIDs[i]].numCoSelected;
            // }

            // // update the color of ents in highlight set
            // biset.entsUpdate(highlightEntSet, highlightEntList, "ent");

            // links.forEach(function(lk) {
            // 	if (lk.indexOf(thisID) >= 0) {
            // 		allLinks[lk].linkNumCoSelected -= 1;
            // 		if (allLinks[lk].linkNumCoSelected == 0)
            // 			highlightLinkSet.delete(lk);
            // 		else
            // 			highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
            // 	}
            // });
            // // update links
            // biset.linksUpdate(highlightLinkSet, highlightLinkList);
            // // unhighlight the rest links
            // biset.linksBackToNormal(allLinks);
            /***************************************************************/

            // unhighlight all relevent entities
            nodes.forEach(function(node) {
                if (node.indexOf("_bic_") > 0) {
                    allBics[node].bicNumCoSelected -= 1;

                    if (allBics[node].bicNumCoSelected == 0)
                        highlightBicSet.delete(node);
                    else
                        highlightBicList[node] = allBics[node].bicNumCoSelected;
                } else {
                    // if (!selEntSet.has(node))
                    allEnts[node].numCoSelected -= 1;

                    if (allEnts[node].numCoSelected == 0)
                        highlightEntSet.delete(node);
                    else
                        highlightEntList[node] = allEnts[node].numCoSelected;
                }
            });

            links.forEach(function(lk) {
                allLinks[lk].linkNumCoSelected -= 1;
                if (allLinks[lk].linkNumCoSelected == 0)
                    highlightLinkSet.delete(lk);
                else
                    highlightLinkList[lk] = allLinks[lk].linkNumCoSelected;
            });

            // highlight related bics
            biset.entsUpdate(highlightBicSet, highlightBicList, "bic");
            // unhighlight all unrelated bics
            biset.entsBackToNormal(allBics, "bic");

            // highlight ents those need to be highlighted
            biset.entsUpdate(highlightEntSet, highlightEntList, "ent");
            // unhighlight the rest nodes
            biset.entsBackToNormal(allEnts, "ent");

            // update links
            biset.linksUpdate(highlightLinkSet, highlightLinkList);
            // unhighlight the rest links
            biset.linksBackToNormal(allLinks);


            biset.barUpdate("#" + thisID + "_frame", "", biset.colors.bicFrameColor, 0);

            d.bicMouseOvered = false;
        }
        // for clicked node
        else if (d.bicMouseOvered == true && d.bicSelected == true) {
            var thisID = d.bicIDCmp,
                thisFrameID = thisID + "_frame";

            if (networkData[thisID] !== undefined) {
                // all releated info (nodes + links) of current node
                var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                    nodes = relInfo.ents,
                    links = relInfo.paths;

                nodes.forEach(function(e) {
                    if (e.indexOf("_bic_") < 0)
                        d3.select("#" + e + "_text")
                        .classed("text-large", false)
                        .style("font-size", "0.75em");
                });
            }
        }
    });

    // click event for bic
    bics.on("click", function(d) {

        // check the mark flag is turned on or off
        console.log(d.bicSelectOn);

        if (d.bicSelectOn == true) {

            var thisID = d.bicIDCmp,
                thisFrameID = thisID + "_frame";

            // case for selecting bic
            if (d.bicSelected == false) {
                if (networkData[thisID] !== undefined) {
                    // record the clicked node
                    selEntSet.add(thisID);
                }
                biset.barUpdate("#" + thisFrameID, "", biset.colors.entSelBorder, biset.entity.selBorder);
                d.bicSelected = true;
            }
            // case for unselecting bics
            else {
                if (networkData[thisID] !== undefined) {
                    selEntSet.delete(thisID);

                    // releated info for current node
                    var relInfo = biset.findAllCons(thisID, networkData, entPathCaled),
                        nodes = relInfo.ents,
                        links = relInfo.paths;
                    // change the font size back to normal
                    nodes.forEach(function(e) {
                        if (e.indexOf("_bic_") < 0) {
                            if (biset.getClass("#" + e + "_text", "text-large") == true) {
                                d3.select("#" + e + "_text")
                                    .style("font-size", "0.75em");
                            }
                        }
                    });
                }
                biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);
                d.bicSelected = false;
            }
        }


        var bicVisID = d.bicIDCmp,
            lListType = d.rowField,
            rListType = d.colField;

        var leftList = [], //only need update the visualOrder
            rightList = [], //only need update the visualOrder
            idx = 0,
            leftItemList = [],
            rightItemList = [];

        //prepare the left part data
        d3.selectAll("." + lListType).each(function(d) {
            var index = d3.select(this).attr("id");
            leftList.push(d);
            var item = {};
            item['yPos'] = d.yPos;
            item['id'] = d.entityID;
            item['index'] = idx;
            leftItemList.push(item);
            idx++;
        });

        //prepare the right part data
        idx = 0;
        d3.selectAll("." + rListType).each(function(d) {
            var index = d3.select(this).attr("id");
            rightList.push(d);
            var item = {};
            item['yPos'] = d.yPos;
            item['id'] = d.entityID;
            item['index'] = idx;
            rightItemList.push(item);
            idx++;
        });

        //sort based on the y value;
        leftItemList.sort(function(a, b) {
            return a.yPos - b.yPos;
        });
        rightItemList.sort(function(a, b) {
            return a.yPos - b.yPos;
        });

        var item_set_left = new Set(d.row),
            item_set_right = new Set(d.col),
            pos = -1,
            newListLeft = [],
            newListRight = [];

        //prepare the data
        for (var i = 0; i < leftItemList.length; i++) {
            var item = {};
            item['id'] = 0;
            item['index'] = 0;
            item['yPos'] = 0;
            item['visualIndex'] = 0;
            newListLeft.push(item);
        }

        for (var i = 0; i < rightItemList.length; i++) {
            var item = {};
            item['id'] = 0;
            item['index'] = 0;
            item['yPos'] = 0;
            item['visualIndex'] = 0;
            newListRight.push(item);
        }

        var avgPos = 0;
        avgPos = biset.entList.topGap + item_set_left.size / 2 * biset.entity.height;
        var inc_num = 0;
        while (avgPos < d.yPos) {
            if (avgPos + biset.entity.height > d.yPos)
                break;
            else {
                inc_num++;
                avgPos += biset.entity.height;
            }
        }
        if (avgPos + biset.entity.height - d.yPos < d.yPos - avgPos) {
            inc_num++;
            avgPos += biset.entity.height;
        }

        if (inc_num + item_set_left.size >= leftItemList.length)
            inc_num = leftItemList.length - item_set_left.size;
        //shuffling the left part
        //var pos_2 = item_set_left.size;
        var pos_2 = 0;
        pos = inc_num - 1;
        for (var i = 0; i < leftItemList.length; i++) {
            if (item_set_left.has(leftItemList[i].id)) {
                pos++;
                newListLeft[pos]['visualIndex'] = pos;
                newListLeft[pos]['id'] = leftItemList[i]['id'];
                newListLeft[pos]['index'] = leftItemList[i]['index'];
            } else {
                if (pos_2 == inc_num)
                    pos_2 += item_set_left.size;
                newListLeft[pos_2]['visualIndex'] = pos_2;
                newListLeft[pos_2]['id'] = leftItemList[i]['id'];
                newListLeft[pos_2]['index'] = leftItemList[i]['index'];
                pos_2++;
            }
        }

        // shuffling the right part
        pos = -1;
        pos_2 = item_set_right.size;
        avgPos = biset.entList.topGap + item_set_right.size / 2 * biset.entity.height;
        inc_num = 0;
        while (avgPos < d.yPos) {
            if (avgPos + biset.entity.height > d.yPos)
                break;
            else {
                inc_num++;
                avgPos += biset.entity.height;
            }
        }
        if (avgPos + biset.entity.height - d.yPos < d.yPos - avgPos) {
            inc_num++;
            avgPos += biset.entity.height;
        }

        if (inc_num + item_set_right.size >= rightItemList.length)
            inc_num = rightItemList.length - item_set_right.size;
        pos_2 = 0;
        pos = inc_num - 1;
        for (var i = 0; i < rightItemList.length; i++) {
            if (item_set_right.has(rightItemList[i].id)) {
                pos++;
                newListRight[pos]['visualIndex'] = pos;
                newListRight[pos]['id'] = rightItemList[i]['id'];
                newListRight[pos]['index'] = rightItemList[i]['index'];
            } else {
                if (pos_2 == inc_num)
                    pos_2 += item_set_right.size;
                newListRight[pos_2]['visualIndex'] = pos_2;
                newListRight[pos_2]['id'] = rightItemList[i]['id'];
                newListRight[pos_2]['index'] = rightItemList[i]['index'];
                pos_2++;
            }
        }

        //reverse back to the original order;
        newListLeft.sort(function(a, b) {
            return a.index - b.index;
        });
        newListRight.sort(function(a, b) {
            return a.index - b.index;
        });

        var yAxisOrderLeft = [];
        for (var i = 0; i < leftItemList.length; i++)
            yAxisOrderLeft.push(i);
        for (var i = 0; i < leftItemList.length; i++)
            leftList[newListLeft[i].index].entVisualOrder = newListLeft[i].visualIndex;

        var yAxisOrderRight = [];
        for (var i = 0; i < rightItemList.length; i++)
            yAxisOrderRight.push(i);
        for (var i = 0; i < rightItemList.length; i++)
            rightList[newListRight[i].index].entVisualOrder = newListRight[i].visualIndex;

        var yAxis = d3.scale.ordinal()
            .domain(yAxisOrderLeft)
            .rangePoints([biset.entList.topGap, leftItemList.length * biset.entity.height + biset.entList.topGap], 0);

        d3.selectAll("." + lListType).transition()
            .attr("transform", function(d, i) {
                d.xPos = 2;
                d.yPos = yAxis(d.entVisualOrder);
                return "translate(2," + yAxis(d.entVisualOrder) + ")";
            })
            .call(endall, function() {
                biset.updateLink(connections);
            });

        yAxis = d3.scale.ordinal()
            .domain(yAxisOrderRight)
            .rangePoints([biset.entList.topGap, rightItemList.length * biset.entity.height + biset.entList.topGap], 0);

        d3.selectAll("." + rListType).transition()
            .attr("transform", function(d, i) {
                d.xPos = 2;
                d.yPos = yAxis(d.entVisualOrder);
                return "translate(2," + yAxis(d.entVisualOrder) + ")";
            })
            .call(endall, function() {
                biset.updateLink(connections);
            });
    });

    // add links between bic and ent
    for (var i = 0; i < biclusters.length; i++) {
        var rowType = biclusters[i].rowField,
            colType = biclusters[i].colField,
            rowIDs = biclusters[i].row,
            colIDs = biclusters[i].col,
            bicID = biclusters[i].bicID;

        for (var j = 0; j < rowIDs.length; j++) {
            var obj1 = d3.select("#" + rowType + "_" + rowIDs[j]);
            obj2 = d3.select("#" + rowType + "_" + colType + "_bic_" + bicID),
                lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas);

            connections[lineObj.lineID] = lineObj;
            obj2.call(biset.objDrag);
        }

        for (var k = 0; k < colIDs.length; k++) {
            var obj1 = d3.select("#" + rowType + "_" + colType + "_bic_" + bicID),
                obj2 = d3.select("#" + colType + "_" + colIDs[k]),
                lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas);

            connections[lineObj.lineID] = lineObj;
            obj1.call(biset.objDrag);
        }
    }
}


/*
 * stepwise evaluate user selected bic using max ent model
 * @param bicID, the id of user selected bic
 */
biset.bicStepModelEvaluate = function(bicID) {
    var requestVal = bicID,
        requestJSON = {
            "query": requestVal
        };

    var csrftoken = $('#csrf_token').val();

    // retrieve information from MaxEnt Model
    $.ajax({
        url: window.SERVER_PATH + 'vis/loadMaxEntModelStep/',
        type: "POST",
        data: JSON.stringify(requestJSON),
        contentType: "application/json",
        success: function(data) {
            var msg = data.msg;

            if (msg == "success") {
                var bicScore = data.bicScore,
                    curBicID = data.curBicID,
                    tmpScores = [];

                for (var b in bicScore)
                    tmpScores.push(bicScore[b]);

                var opcScale = vis.linearScale(tmpScores, 0, 0.8);

                for (var b in bicScore) {
                    // do not change the color of the one being evaluated
                    if (opcScale(bicScore[b]) != 0) {
                        vis.setSvgOpacityByID(b + "_frame", "rgba(51, 204, 51, ", opcScale(bicScore[b]));
                    } else if (b == curBicID) {
                        vis.setSvgBorderByID(b + "_frame", "rgba(0, 0, 0, 0.9)", "4");
                    }
                }
            }
        },
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain)
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    });
}



/*
 * full path evaluation for user selected bic using max ent model
 * @param bicID, the id of user selected bic
 */
biset.bicFullPathModelEvaluate = function(bicID) {
    var requestVal = bicID,
        requestJSON = {
            "query": requestVal
        };

    var csrftoken = $('#csrf_token').val();

    console.log(requestJSON);

    // retrieve information from MaxEnt Model
    $.ajax({
        url: window.SERVER_PATH + 'vis/maxEntModelFullPath/',
        type: "POST",
        data: JSON.stringify(requestJSON),
        contentType: "application/json",
        success: function(data) {
            var msg = data.msg;

            console.log(msg);

            // if (msg == "success") {
            //     var bicScore = data.bicScore,
            //         tmpScores = [];

            //     for (var b in bicScore)
            //         tmpScores.push(bicScore[b]);

            //     var opcScale = vis.linearScale(tmpScores, 0, 0.8);

            //     for (var b in bicScore)
            //     // do not change the color of the one being evaluated
            //         if (opcScale(bicScore[b]) != 0)
            //         vis.setSvgOpacitybyID(b + "_frame", "rgba(51, 204, 51, ", opcScale(bicScore[b]));
            // }
        },
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && !this.crossDomain)
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    });
}



/*
 * update the document view by selecting a docID in the list
 * @param docListItem {string}, the css class of a doc list item
 */
biset.docViewUpdateByClick = function(docListItem) {
    $(docListItem).click(function(e) {
        var thisDocID = $(this).attr("data-index"),
            thisDocContent = allDocs[thisDocID].docContent,
            thisDocTitle = allDocs[thisDocID].docName;

        biset.docViewReFresh(thisDocTitle, thisDocContent);
    });
}

/*
 * refreshe the content of the document view
 * @param title {string}, the title of a doc
 * @param content {string}, content of a doc
 */
biset.docViewReFresh = function(title, content) {
    $("#biset_doc_title").html("<h3 class='panel-title'>" + title + "</h3>");
    $("#biset_doc_body").html(content);
}


// when all d3 transition finish, and then do the callback
function endall(transition, callback) {
    var n = 0;
    transition
        .each(function() {
            ++n;
        })
        .each("end", function() {
            if (!--n) callback.apply(this, arguments);
        });
}


/*
 * order bics based on entity
 * @param aList {object}, info of a list
 */
biset.BicOrderBasedOnEntity = function(aList) {
    var relatedBic = [],
        clickedList = aList.dataType;

    for (e in allBics) {
        if (allBics[e].bicIDCmp.indexOf(clickedList) >= 0)
            relatedBic.push(allBics[e]);
    }

    for (e in relatedBic) {
        var yPos = 0,
            lType = relatedBic[e].colField,
            rType = relatedBic[e].rowField,
            bic_name = rType + "_" + lType + "_bic_" + relatedBic[e].bicID.toString();

        for (e2 in relatedBic[e].col) {
            var enty_id = lType + "_" + relatedBic[e].col[e2];
            yPos += allEnts[enty_id].yPos;
        }

        for (e2 in relatedBic[e].row) {
            var enty_id = rType + "_" + relatedBic[e].row[e2];
            yPos += allEnts[enty_id].yPos;
        }

        yPos = yPos / (relatedBic[e].col.length + relatedBic[e].row.length);
        d3.select("#" + bic_name).transition()
            .attr("transform", function(d) {
                d.xPos = 2;
                d.yPos = yPos;
                return "translate(2," + d.yPos + ")";
            });
    }
}


/*
 * find all related ent id for a bic
 * @param bicID {string}, a bic id
 * @param allBics {map}, a dictionary of all bic data
 * @retrun {array}, an array of ent ids
 */
biset.findEntIDsInBic = function(bicID, bicDict) {
    var thisBic = bicDict[bicID],
        lType = thisBic.rowField,
        rType = thisBic.colField,
        rows = thisBic.row,
        cols = thisBic.col,
        lEntIDs = [],
        rEntIDs = [],
        allEntIDs = [],
        entIDsInThisBic = {};

    for (var i = 0; i < rows.length; i++) {
        lEntIDs.push(lType + "_" + rows[i]);
        allEntIDs.push(lType + "_" + rows[i]);
    }

    for (var j = 0; j < cols.length; j++) {
        rEntIDs.push(rType + "_" + cols[j]);
        allEntIDs.push(rType + "_" + cols[j]);
    }

    entIDsInThisBic.leftEnts = lEntIDs;
    entIDsInThisBic.rightEnts = rEntIDs;
    entIDsInThisBic.allEnts = allEntIDs;

    return entIDsInThisBic;
}



/*
 * sort a list visually
 * @param aList, svg objects in a list selected by d3 with associated data
 * @param sortType, sorting orders
 */
function sortList(aList, sortType) {

    console.log(aList);

    // get all entities
    var entSet = aList.relatedDataSet.entities,
        listType = aList.dataType;

    // values of each entity
    var dataValues = [],
        // dataFrequency = [],
        dataIndex = [];
    for (var i = 0; i < entSet.length; i++) {
        dataValues.push(entSet[i].entValue);
        dataIndex.push(entSet[i].index);
        entSet[i].VisualOrder = entSet[i].index;
    }

    var ValueOrder = [],
        orderTmp = [];
    orderTmp = dataValues.slice().sort(function(a, b) {
        return a.localeCompare(b);
    })
    ValueOrder = dataValues.slice().map(function(v) {
        return orderTmp.indexOf(v)
    });

    // sort by frequency
    if (sortType == "freq") {
        dataIndex.sort(function(a, b) {
            return a - b;
        });

        aList.yAxis.domain(dataIndex);
        // dataFrequency.sort(function(a, b) { return b - a; });
        // new positions for each entity
        // aList.yAxis.domain(dataFrequency);

        // move entities to their new position
        aList.entGroups.transition()
            .attr("transform", function(d, i) {
                d.xPos = 2;
                d.yPos = aList.yAxis(d.index);
                return "translate(2," + aList.yAxis(d.index) + ")";
            })
            .call(endall, function() {
                biset.updateLink(connections);
            });
        biset.BicOrderBasedOnEntity(aList);
    }

    // sort by alphabeic order
    if (sortType == "alph") {
        dataValues.sort();

        for (var i = 0; i < entSet.length; i++)
            entSet[i].VisualOrder = ValueOrder[i];

        // new positions for each entity
        aList.yAxis.domain(dataValues);

        // move entities to their new position
        aList.entGroups.transition()
            .attr("transform", function(d, i) {
                d.xPos = 2;
                d.yPos = aList.yAxis(d.entValue);
                return "translate(2," + aList.yAxis(d.entValue) + ")";
            })
            .call(endall, function() {
                biset.updateLink(connections);
            });

        biset.BicOrderBasedOnEntity(aList);
    }
}


/*
 * Add sorting event handler to the dropdown
 * @param listView, new added list
 */
function addSortCtrl(listView) {
    // sort a list by selected value
    $("#" + listView.id + "_sortCtrl").change(function() {
        var orderBy = $(this).val();
        if (orderBy == 'freq') {
            $("#" + listView.id + "_ctrl_label")
                .removeClass('glyphicon-sort-by-alphabet')
                .addClass('glyphicon-sort-by-attributes-alt');
        }
        if (orderBy == 'alph') {
            $("#" + listView.id + "_ctrl_label")
                .removeClass('class glyphicon-sort-by-attributes-alt')
                .addClass('glyphicon-sort-by-alphabet');
        }
        sortList(listView, orderBy);
    });
}

/*
 * add mode control for each bic list
 * @param lsts, a list of selected domains (e.g., people, location)
 */
biset.addBicListCtrl = function(lsts) {
    var sel = []
    for (var i = 0; i < lsts.length - 1; i++) {

        $("#bListCtrl_" + lsts[i] + "_" + lsts[i + 1] + "_sort_bic")
            .on('click', function() {
                var preSelValue = this.value.split("_");
                preMode = preSelValue[0];
            })
            .change(function() {
                var selValue = $(this).val().split("_"),
                    // get the domain on the left
                    field1 = selValue[1],
                    // get the domain on the right
                    field2 = selValue[2],
                    // get the selected mode
                    selMode = selValue[0];

                var cluster_type = 0;
                if (selMode == "clusterLeft")
                    cluster_type = 1;
                else if (selMode == "clusterRight")
                    cluster_type = 2;
                //step one
                //obtain the correspoing colom of bic
                var cur_bic = [],
                    idx_left = 0,
                    idx_right = 0;
                for (e in allBics) {
                    if (e.indexOf(field1) >= 0 && e.indexOf(field2) >= 0) {
                        cur_bic.push(allBics[e]);
                    }
                }

                //sort based on the left item values from large to small
                cur_bic.sort(function(a, b) {
                    return b.totalEntNum - a.totalEntNum;
                });
                //console.log(cur_bic);
                var lListType,
                    rListType;

                //generate map, to shuffle the left entities based on bic order
                var leftHashTable = {},
                    rightHashTable = {};
                for (e in cur_bic) {
                    for (e2 in cur_bic[e].row) {
                        lListType = cur_bic[e].rowField;
                        if (leftHashTable[cur_bic[e].row[e2]] == undefined)
                            leftHashTable[parseInt(cur_bic[e].row[e2])] = idx_left++;
                    }
                    for (e2 in cur_bic[e].col) {
                        rListType = cur_bic[e].colField;
                        if (rightHashTable[cur_bic[e].col[e2]] == undefined)
                            rightHashTable[parseInt(cur_bic[e].col[e2])] = idx_right++;
                    }
                }

                var arr_left = [],
                    leftList = [],
                    rightList = [],
                    arr_right = [],
                    idx_index = -1;
                //other isolated entities of the left part
                d3.selectAll("." + lListType).each(function(d) {
                    var index = d3.select(this).attr("id");
                    leftList.push(d);
                    var item = {};
                    idx_index++;
                    item['yPos'] = d.yPos;
                    item['id'] = d.entityID;
                    item['index'] = idx_index;
                    item['order'] = -1;
                    item['visualOrder'] = -1;
                    if (leftHashTable[d.entityID] == undefined)
                        item['order'] = idx_left++;
                    else
                        item['order'] = leftHashTable[d.entityID];
                    arr_left.push(item);
                });

                idx_index = -1;
                d3.selectAll("." + rListType).each(function(d) {
                    var index = d3.select(this).attr("id");
                    rightList.push(d);
                    var item = {};
                    idx_index++;
                    item['yPos'] = d.yPos;
                    item['id'] = d.entityID;
                    item['index'] = idx_index;
                    item['order'] = -1;
                    item['visualOrder'] = -1;
                    if (rightHashTable[d.entityID] == undefined)
                        item['order'] = idx_right++;
                    else
                        item['order'] = rightHashTable[d.entityID];
                    arr_right.push(item);
                });


                //for each cluster do the calculaton to shuffle in the cluster
                var process_item = new Set();
                var bic_prefix;
                //if(lListType > rListType)
                bic_prefix = lListType + "_" + rListType + "_bic_";
                //else bic_prefix = rListType + "_" + lListType + "_bic_";


                for (e in cur_bic) {
                    var cur_range = [],
                        cur_bic_id = cur_bic[e].bicID;
                    for (e2 in cur_bic[e].row) {
                        var ent_val = cur_bic[e].row[e2];
                        lListType = cur_bic[e].rowField;
                        var ent_id = cur_bic[e].rowField + "_" + ent_val;
                        if (!process_item.has(ent_id)) {

                            var bic_cluster = allEnts[ent_id].bicSetsRight,
                                bic_order = [];

                            for (e3 in bic_cluster) {
                                var bic_id = bic_cluster[e3];

                                if (bic_id != cur_bic_id) {
                                    var bic_name = bic_prefix + bic_id.toString();
                                    bic_order.push(allBics[bic_name].index);
                                }
                            }
                            var item = {};
                            if (bic_order.length == 0) {
                                item.value = 0;
                                item.id = ent_val;
                                cur_range.push(item);
                            } else {
                                var sum = bic_order.reduce(function(a, b) {
                                        return a + b;
                                    }),
                                    avg = sum / bic_order.length;
                                item.value = avg;
                                item.id = ent_val;
                                cur_range.push(item);
                            }

                            process_item.add(ent_id);
                        }
                    }

                    //shuffle the result based on the cur_range's 
                    cur_range.sort(function(a, b) {
                        return a.value - b.value;
                    });
                    var id_set = new Set();
                    for (var i = 0; i < cur_range.length; i++)
                        id_set.add(cur_range[i].id);
                    var cur_order = [];
                    for (var i = 0; i < arr_left.length; i++) {
                        if (id_set.has(arr_left[i].id))
                            cur_order.push(arr_left[i].order);
                    }
                    cur_order.sort(function(a, b) {
                        return a - b;
                    });
                    var id_map = {};
                    for (var i = 0; i < cur_order.length; i++) {
                        id_map[cur_range[i].id] = cur_order[i];
                    }
                    for (var i = 0; i < arr_left.length; i++) {
                        if (id_set.has(arr_left[i].id))
                            arr_left[i].order = id_map[arr_left[i].id];
                    }

                    // the right side 
                    cur_range.length = 0;
                    for (e2 in cur_bic[e].col) {
                        var ent_val = cur_bic[e].col[e2];
                        rListType = cur_bic[e].colField;
                        var ent_id = cur_bic[e].colField + "_" + ent_val;
                        if (!process_item.has(ent_id)) {

                            var bic_cluster = allEnts[ent_id].bicSetsLeft,
                                bic_order = [];

                            for (e3 in bic_cluster) {
                                var bic_id = bic_cluster[e3];

                                if (bic_id != cur_bic_id) {
                                    var bic_name = bic_prefix + bic_id.toString();
                                    bic_order.push(allBics[bic_name].index);
                                }
                            }

                            var item = {};
                            if (bic_order.length == 0) {
                                item.value = 0;
                                item.id = ent_val;
                                cur_range.push(item);
                            } else {
                                var sum = bic_order.reduce(function(a, b) {
                                        return a + b;
                                    }),
                                    avg = sum / bic_order.length;
                                item.value = avg;
                                item.id = ent_val;
                                cur_range.push(item);
                            }

                            process_item.add(ent_id);
                        }
                    }

                    //shuffle the result based on the cur_range's 
                    cur_range.sort(function(a, b) {
                        return a.value - b.value;
                    });
                    id_set.clear();
                    for (var i = 0; i < cur_range.length; i++)
                        id_set.add(cur_range[i].id);
                    cur_order.length = 0;
                    for (var i = 0; i < arr_right.length; i++) {
                        if (id_set.has(arr_right[i].id))
                            cur_order.push(arr_right[i].order);
                    }
                    cur_order.sort(function(a, b) {
                        return a - b;
                    });
                    id_map = {};
                    for (var i = 0; i < cur_order.length; i++) {
                        id_map[cur_range[i].id] = cur_order[i];
                    }
                    for (var i = 0; i < arr_right.length; i++) {
                        if (id_set.has(arr_right[i].id))
                            arr_right[i].order = id_map[arr_right[i].id];
                    }
                }


                // arr_left.sort(function(a, b) { return a.order - b.order; });
                var yAxisOrderLeft = [];
                for (var i = 0; i < arr_left.length; i++)
                    yAxisOrderLeft.push(i);

                for (var i = 0; i < arr_left.length; i++)
                    leftList[arr_left[i].index].entVisualOrder = arr_left[i].order;


                var yAxis = d3.scale.ordinal()
                    .domain(yAxisOrderLeft)
                    .rangePoints([biset.entList.topGap, leftList.length * biset.entity.height + biset.entList.topGap], 0);


                d3.selectAll("." + lListType).transition()
                    .attr("transform", function(d, i) {
                        d.xPos = 2;
                        d.yPos = yAxis(d.entVisualOrder);
                        return "translate(2," + yAxis(d.entVisualOrder) + ")";
                    })
                    .call(endall, function() {
                        biset.updateLink(connections);
                    });


                var yAxisOrderRight = [];
                for (var i = 0; i < arr_right.length; i++)
                    yAxisOrderRight.push(i);

                for (var i = 0; i < arr_right.length; i++)
                    rightList[arr_right[i].index].entVisualOrder = arr_right[i].order;


                yAxis = d3.scale.ordinal()
                    .domain(yAxisOrderRight)
                    .rangePoints([biset.entList.topGap, rightList.length * biset.entity.height + biset.entList.topGap], 0);


                d3.selectAll("." + rListType).transition()
                    .attr("transform", function(d, i) {
                        d.xPos = 2;
                        d.yPos = yAxis(d.entVisualOrder);
                        return "translate(2," + yAxis(d.entVisualOrder) + ")";
                    })
                    .call(endall, function() {
                        biset.updateLink(connections);
                    });


                //move the bic_cluster
                for (e in cur_bic) {
                    var bic_name = bic_prefix + cur_bic[e].bicID.toString(),
                        y_pos = 0,
                        num_items = 0;

                    if (cluster_type == 0 || cluster_type == 1) {
                        for (e2 in cur_bic[e].row) {
                            var ent_val = cur_bic[e].row[e2],
                                ent_id = cur_bic[e].rowField + "_" + ent_val;
                            y_pos += allEnts[ent_id].yPos;
                            num_items++;
                        }
                    }
                    if (cluster_type == 0 || cluster_type == 2) {
                        for (e2 in cur_bic[e].col) {
                            var ent_val = cur_bic[e].col[e2],
                                ent_id = cur_bic[e].colField + "_" + ent_val;
                            y_pos += allEnts[ent_id].yPos;
                            num_items++;
                        }
                    }

                    y_pos = y_pos / num_items;

                    d3.select("#" + bic_name).transition()
                        .attr("transform", function(d) {
                            d.xPos = 2;
                            d.yPos = y_pos;
                            return "translate(2," + d.yPos + ")";
                        });
                }
            });


        var preMode;
        $("#bListCtrl_" + lsts[i] + "_" + lsts[i + 1])
            .on('click', function() {
                var preSelValue = this.value.split("_");
                preMode = preSelValue[0];
            })
            .change(function() {
                var selValue = $(this).val().split("_"),
                    // get the domain on the left
                    field1 = selValue[1],
                    // get the domain on the right
                    field2 = selValue[2],
                    // get the selected mode
                    selMode = selValue[0];

                console.log(selMode);
                if (selMode.indexOf("cluster") < 0)
                    biset.connectionDisplayed(field1, field2, selMode, preMode);

            });
    }
}


/*
 * display links or bics based on selected mode
 * @param domain1, the list on the left
 * @param domain2, the list on the right
 * @param curMode, the current selected mode
 * @param preMode, previuosly selected mode
 */
biset.connectionDisplayed = function(ldomain, rdomain, curMode, preMode) {
    if (curMode == "bic") {
        if (preMode == "link") {
            // hide original inbetween links
            biset.setVisibilityToOriLinksInBetween(ldomain, rdomain, "hidden");

            // show inbetween bics
            biset.setVisibilityToBicsInBetween(ldomain, rdomain, "visible");
            // show links connected with inbetween bics
            biset.setVisibilityToLinksInBetween(ldomain, rdomain, "visible");
        }
        if (preMode == "hybrid") {
            // hide all original links between the two list
            biset.setVisibilityToOriLinksInBetween(ldomain, rdomain, "hidden");
        }
    }
    if (curMode == "link") {
        if (preMode == "bic") {
            // hide inbetween bics
            biset.setVisibilityToBicsInBetween(ldomain, rdomain, "hidden");
            // hide links connected with inbetween bics
            biset.setVisibilityToLinksInBetween(ldomain, rdomain, "hidden");

            // show original inbetween links
            biset.setVisibilityToOriLinksInBetween(ldomain, rdomain, "visible");
        }
        if (preMode == "hybrid") {
            // show links belong to bics
            biset.setVisibilityToOriLinksInBics(ldomain, rdomain, "visible");

            // hide inbetween bics
            biset.setVisibilityToBicsInBetween(ldomain, rdomain, "hidden");
            // hide links connected with inbetween bics
            biset.setVisibilityToLinksInBetween(ldomain, rdomain, "hidden");
        }
    }
    if (curMode == "hybrid") {
        if (preMode == "link") {
            // hide links belong to bics
            biset.setVisibilityToOriLinksInBics(ldomain, rdomain, "hidden");

            // show inbetween bics
            biset.setVisibilityToBicsInBetween(ldomain, rdomain, "visible");
            // show links connected with inbetween bics
            biset.setVisibilityToLinksInBetween(ldomain, rdomain, "visible");
        }
        if (preMode == "bic") {
            // show original inbetween links
            biset.setVisibilityToOriLinksInBetween(ldomain, rdomain, "visible");

            // hide links belong to bics
            biset.setVisibilityToOriLinksInBics(ldomain, rdomain, "hidden");
        }
    }
}


/*
 * set visibility to a list of bics between two domains
 * @param ldomain {string}, the type of left list
 * @param rdomain {string}, the type of right list
 * @param visable {string}, "visible" or "hidden"
 */
biset.setVisibilityToBicsInBetween = function(ldomain, rdomain, visable) {
    var inbetweenBics = biset.findBicsInBetween(ldomain, rdomain);
    for (e in inbetweenBics)
        biset.setVisibility(e, visable);
}

/*
 * set visibility to a list of links (connected with bics) between two domains
 * @param ldomain {string}, the type of left list
 * @param rdomain {string}, the type of right list
 * @param visable {string}, "visible" or "hidden"
 */
biset.setVisibilityToLinksInBetween = function(ldomain, rdomain, visable) {
    var linksConnectedBics = biset.findLinksInBetween(ldomain, rdomain);
    for (e in linksConnectedBics)
        biset.setVisibility(e, visable);
}

/*
 * set visibility to a list of original links between two domains
 * @param ldomain {string}, the type of left list
 * @param rdomain {string}, the type of right list
 * @param visable {string}, "visible" or "hidden"
 */
biset.setVisibilityToOriLinksInBetween = function(ldomain, rdomain, visable) {
    var inbetweenLinks = biset.findOriLinksInBetween(ldomain, rdomain);
    for (e in inbetweenLinks)
        biset.setVisibility(e, visable);
}

/*
 * set visibility to a list of original links that belongs to bics in two domains
 * @param ldomain {string}, the type of left list
 * @param rdomain {string}, the type of right list
 * @param visable {string}, "visible" or "hidden"
 */
biset.setVisibilityToOriLinksInBics = function(ldomain, rdomain, visable) {
    var inbetweenBics = biset.findBicsInBetween(ldomain, rdomain);
    for (e in inbetweenBics) {
        var lkToHide = biset.findLinksInBic(e);
        for (l in lkToHide)
            biset.setVisibility(l, visable);
    }
}

/*
 * set visibility of an ent
 * @param entID {string}, the id of an entity
 * @param visable {string}, "visible" or "hidden"
 */
biset.setVisibility = function(entID, visable) {
    d3.select("#" + entID)
        .attr("visibility", visable);
}


/*
 * Find all original links belong to a bic
 * @param bicID, the id of a bicluster
 * @return List, a list of id
 */
biset.findLinksInBic = function(bicID) {

    var thisBic = allBics[bicID],
        rows = thisBic.row,
        cols = thisBic.col,
        rType = thisBic.rowField,
        cType = thisBic.colField;

    var linksInBic = [],
        oriLinksInBic = {};

    // get ori links that have been aggregated in this bic
    for (var i = 0; i < rows.length; i++) {
        for (var j = 0; j < cols.length; j++) {
            var lEnt = rType + "_" + rows[i],
                rEnt = cType + "_" + cols[j];
            linksInBic.push(biset.genLinkID(lEnt, rEnt));
        }
    }

    // check these identified links from the dictionary
    for (var j = 0; j < linksInBic.length; j++) {
        if (allOriLinks[linksInBic[j]] !== undefined) {
            oriLinksInBic[linksInBic[j]] = allOriLinks[linksInBic[j]];
        }
    }

    return oriLinksInBic;
}


/*
 * generate the link ID of two ents
 * @param lEntID {string}, the id of left ent
 * @param rEntID {string}, the id of right ent
 * @return {string}, the id of the link 
 */
biset.genLinkID = function(lEntID, rEntID) {
    var lkName = "";
    if (lEntID.localeCompare(rEntID) < 0) {
        var tmp = lEntID,
            lEntID = rEntID,
            rEntID = tmp;
    }
    lkName = lEntID + "__" + rEntID;
    return lkName;
}


/*
 * find all bics between two lists
 * @param ldomain, the type of left list
 * @param rdomain, the type of right list
 */
biset.findBicsInBetween = function(ldomain, rdomain) {
    var bicsInbetween = {};
    for (e in allBics) {
        if (allBics[e].bicIDCmp.indexOf(ldomain) >= 0 && allBics[e].bicIDCmp.indexOf(rdomain) >= 0)
            bicsInbetween[e] = allBics[e];
    }
    return bicsInbetween;
}


/*
 * find all orignial links between two lists
 * @param ldomain, the type of left list
 * @param rdomain, the type of right list
 */
biset.findOriLinksInBetween = function(ldomain, rdomain) {
    var oriLinksInbetween = {};
    for (e in allOriLinks) {
        if (allOriLinks[e].oriLinkID.indexOf(ldomain) >= 0 && allOriLinks[e].oriLinkID.indexOf(rdomain) >= 0)
            oriLinksInbetween[e] = allOriLinks[e];
    }
    return oriLinksInbetween;
}


/*
 * find all links between two lists
 * @param ldomain, the type of left list
 * @param rdomain, the type of right list
 */
biset.findLinksInBetween = function(ldomain, rdomain) {
    var linksInbetween = [];
    for (e in allLinks) {
        if (allLinks[e].linkID.indexOf(ldomain) >= 0 && allLinks[e].linkID.indexOf(rdomain) >= 0)
            linksInbetween[e] = allLinks[e];
    }
    return linksInbetween;
}


/*
 * add a line
 * reference: http://raphaeljs.com/graffle.html
 * @param obj1, the 1st object
 * @param obj2, the 2nd object
 * @param d3obj, d3 object to append the line
 * @param bg, 
 */
biset.addLink = function(obj1, obj2, line, d3obj, bg) {
    if (obj1.line && obj1.from && obj1.to) {
        line = obj1;
        obj1 = line.from;
        obj2 = line.to;
        d3obj = line.d3Canvas;
    }

    // var svgPos = d3obj[0][0].getBoundingClientRect();

    // var bb1 = obj1[0][0].getBoundingClientRect(),
    //     bb2 = obj2[0][0].getBoundingClientRect(),

    //     p = [{x: bb1.left + bb1.width / 2 - svgPos.left, y: bb1.top - 1 - svgPos.top},
    //     {x: bb1.left + bb1.width / 2 - svgPos.left, y: bb1.top + bb1.height + 1 - svgPos.top},
    //     {x: bb1.left - 1 - svgPos.left, y: bb1.top + bb1.height / 2 - svgPos.top},
    //     {x: bb1.left + bb1.width + 1 - svgPos.left, y: bb1.top + bb1.height / 2 - svgPos.top},
    //     {x: bb2.left + bb2.width / 2 - svgPos.left, y: bb2.top - 1 - svgPos.top},
    //     {x: bb2.left + bb2.width / 2 - svgPos.left, y: bb2.top + bb2.height + 1 - svgPos.top},
    //     {x: bb2.left - 1 - svgPos.left, y: bb2.top + bb2.height / 2 - svgPos.top},
    //     {x: bb2.left + bb2.width + 1 - svgPos.left, y: bb2.top + bb2.height / 2 - svgPos.top}],

    var bb1 = biset.getOffset(obj1),
        bb2 = biset.getOffset(obj2),

        p = [{
            x: bb1.left + bb1.width / 2,
            y: bb1.top - 1
        }, {
            x: bb1.left + bb1.width / 2,
            y: bb1.top + bb1.height + 1
        }, {
            x: bb1.left - 1,
            y: bb1.top + bb1.height / 2
        }, {
            x: bb1.left + bb1.width + 1,
            y: bb1.top + bb1.height / 2
        }, {
            x: bb2.left + bb2.width / 2,
            y: bb2.top - 1
        }, {
            x: bb2.left + bb2.width / 2,
            y: bb2.top + bb2.height + 1
        }, {
            x: bb2.left - 1,
            y: bb2.top + bb2.height / 2
        }, {
            x: bb2.left + bb2.width + 1,
            y: bb2.top + bb2.height / 2
        }],
        d = {},
        dis = [];

    for (var i = 0; i < 4; i++) {
        for (var j = 4; j < 8; j++) {
            var dx = Math.abs(p[i].x - p[j].x),
                dy = Math.abs(p[i].y - p[j].y);
            if ((i == j - 4) || (((i != 3 && j != 6) || p[i].x < p[j].x) && ((i != 2 && j != 7) || p[i].x > p[j].x) && ((i != 0 && j != 5) || p[i].y > p[j].y) && ((i != 1 && j != 4) || p[i].y < p[j].y))) {
                dis.push(dx + dy);
                d[dis[dis.length - 1]] = [i, j];
            }
        }
    }
    if (dis.length == 0) {
        var res = [0, 4];
    } else {
        res = d[Math.min.apply(Math, dis)];
    }
    var x1 = p[res[0]].x,
        y1 = p[res[0]].y,
        x4 = p[res[1]].x,
        y4 = p[res[1]].y;
    dx = Math.max(Math.abs(x1 - x4) / 2, 10);
    dy = Math.max(Math.abs(y1 - y4) / 2, 10);
    var x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3),
        y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3),
        x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3),
        y3 = [0, 0, 0, 0, y1 + dy, y1 - dy, y4, y4][res[1]].toFixed(3);
    var path = ["M" + x1.toFixed(3), y1.toFixed(3) + "C" + x2, y2, x3, y3, x4.toFixed(3), y4.toFixed(3)].join(",");

    if (line && line.line) {
        //console.log(line.line.bg);
        //line.bg && line.bg.attr({path: path});
        line.line.attr("d", path);
    } else {
        // var color = typeof line == "string" ? line : "#000";

        var lid1 = obj1.attr("id"),
            lid2 = obj2.attr("id"),
            lID = biset.genLinkID(lid1, lid2);

        return {
            //bg: bg && bg.split && robj.path(path).attr({stroke: bg.split("|")[0], fill: "none", "stroke-width": bg.split("|")[1] || 3}),
            lineID: lID,
            line: d3obj.append("path")
                .attr("d", path)
                .attr("id", lID)
                .attr("class", "lineNormal")
                .style("stroke", biset.colors.lineNColor)
                .style("stroke-width", biset.conlink.nwidth)
                .style("fill", "none"),
            from: obj1,
            to: obj2,
            d3Canvas: d3obj
        };
    }
};


/*
 * add all orginial links to lists
 * @param linkLsts, a list of links (logically)
 */
biset.addOriginalLinks = function(linkLsts) {

    console.log("call here");

    for (var i = 0; i < linkLsts.length; i++) {
        var obj1ID = linkLsts[i].obj1,
            obj2ID = linkLsts[i].obj2,
            lkID = linkLsts[i].oriLinkID;

        var obj1 = d3.select("#" + obj1ID),
            obj2 = d3.select("#" + obj2ID),
            lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas);



        biset.setVisibility(lineObj.lineID, "hidden");

        connections[lineObj.lineID] = lineObj;

        // connections.push(biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas));
    }
}


/*
 * update a set of links
 * @param links, an array of links
 */
biset.updateLink = function(links) {
    for (lk in links)
        biset.addLink(links[lk]);
}


/* 
 * reset all global parameters
 */
biset.globalParamClear = function() {
    connections = [];
    entLists = [];
    selectedEnts = [];
    biset.entList.count = 0;
    biset.entList.startPos = 0;
    biset.bic.count = 0;
}


/* 
 * remove all elements in current d3 canvas
 * @param {object} thisCanvas, current d3 canvas
 */
biset.removeVis = function(thisCanvas) {
    thisCanvas.selectAll("*").remove();
    biset.visCanvas.inUse = 0;
    // remove sort control
    $('.listControlGroup').remove();
    $('.BiclistControlGroup').remove();
}


/*
 * get coordinates of a svg object
 * @param element {d3 object}, a d3 object
 */
biset.getOffset = function(element) {
    var $element = $(element[0][0]);
    return {
        left: $element.position().left,
        top: $element.position().top,
        width: element[0][0].getBoundingClientRect().width,
        height: element[0][0].getBoundingClientRect().height,
    };
}

// drag function for a d3 object
biset.objDrag = d3.behavior.drag()
    .origin(function() {
        // position of current selected item
        thisOffset = biset.getOffset(d3.select(this));
        // position of the parent
        parentOffset = biset.getOffset(d3.select(this.parentNode));
        return {
            x: thisOffset.left - parentOffset.left,
            y: thisOffset.top
        };
    })
    .on("dragstart", function(d) {
        draged = 1;
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);
    })
    .on("drag", function(d) {
        var dragX = d3.event.x,
            dragY = d3.event.y;

        // boundary check
        if (dragY < 0)
            dragY = 0;
        if (dragX >= biset.entList.gap * 2)
            dragX = biset.entList.gap * 2;
        if (dragX + biset.entList.gap * 2 <= 0)
            dragX = -biset.entList.gap * 2;
        // move the element
        d3.select(this).attr("transform", "translate(" + dragX + "," + dragY + ")");
        // log the y position
        d.yPos = dragY;
        // update related lines
        biset.updateLink(connections);
        // console.log(connections);
    })
    .on("dragend", function(d) {
        draged = 0;
        biset.updateLink(connections);
        d3.select(this).classed("dragging", false);
    });


/*
 * Get the class of a html element by id
 * @param {string} elementID, the id of a html element
 * @param {string} calssName, a calss name
 * @return the class
 */
biset.getClass = function(elementID, className) {
    return d3.select(elementID).classed(className);
}


/*
 * Get the class of a html element by id
 * @param {string} elementID, the id of a html element
 * @param {string} className, the class name
 * @param {string} TorF, true or false for the class
 */
biset.setClass = function(elementID, className, TorF) {
    d3.select(elementID).classed(className, TorF);
}


/*
 * Get the max value in an array
 * @param {int}, an array only with integer value
 * @return {int}, the max value in this array
 */
Array.max = function(array) {
    return Math.max.apply(Math, array);
};


/*
 * Get the min value in an array
 * @param {int}, an array only with integer value
 * @return {int}, the min value in this array
 */
Array.min = function(array) {
    return Math.min.apply(Math, array);
};
