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
        innerRdCorner: 7,
        posShift: 0,
        mRdCorner: 10,
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
    selEntSet = new Set(),
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
    selectedLists = [],

    // a list of bicluster which context menu is shown
    bicShowMenu = [],
    bicOnMouseover = [],
    // a global parameter to maintain the relations for each bic and ent
    relations = {};

// canvas for visualizations
var canvas = vis.addSvg(biSetContainer, biSetVisCanvas, biset.visCanvas.width, biset.visCanvas.height);

var svgPos = canvas[0][0].getBoundingClientRect(),
    svgCanvasOffset = {
        left: svgPos.left,
        top: svgPos.top
    };

// get dataset name
var selData = $('#selDataSet').val();

/*
 * Add a list in a canvas and return this list
 * @param canvas, the canvas for adding a list
 * @param listData, data to generate the list
 * @param bicList, the list of all bics
 * @param startPos, position to draw bar
 * @param networkData, all connections between bics and ents
 */
biset.addList = function(canvas, listData, bicList, startPos, networkData) {

    // initialize the global relations (just once)
    relations = networkData;

    // type of the list
    var type = listData.listType,
        // the list id
        listNum = listData.listID,
        // entities in this list
        entSet = listData.entities;

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
            HybridMode = "hybrid_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],

            ClusterMode = "cluster_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            ClusterModeLeft = "clusterLeft_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            ClusterModeRight = "clusterRight_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],
            seriationMode = "seriation_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum],

            sliderID = "slider_" + selectedLists[listNum - 1] + "_" + selectedLists[listNum];

        $("#biset_control").append("<div class='BiclistControlGroup'>" +
            "<select class='bListCtrl' id='" + bListRGroupName + "'>" +
            "<option value='" + bicMode + "'>Bic Only</option>" +
            "<option value='" + linkMode + "'>Link Only</option>" +
            "<option value='" + HybridMode + "'>Hybrid</option>" +
            "</select>" +

            "<select class='bListCtrlSortBic' id='" + bListRGroupName + "_sort_bic' style='margin-left: 25px'>" +
            "<option value='ClusterSize'>Default</option>" +
            "<option value='" + ClusterMode + "'>sort by two</option>" +
            "<option value='" + ClusterModeLeft + "'>sort by left</option>" +
            "<option value='" + ClusterModeRight + "'>sort by right</option>" +
            "<option value='" + seriationMode + "'>seriation</option>" +
            "</select>" +

            "<input type='range' id=" + sliderID + " min='-1' max='1' value= '0' step='0.001' style='display:inline; width:130px; margin-left:15px'/>" +

            "</div>");
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
            d.startPos = startPos;
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
        .style("font-size", nEntFontforPaper) // 0.83em
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


    // add contextmenu to ents
    addMenuToEnt(type);

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
                            vis.setFontSize(e + "_text", hEntFontforPaper);
                        vis.setSvgCssClass(e + "_text", lEntFontClass, true);
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
                            vis.setFontSize(e + "_text", nEntFontforPaper);
                        vis.setSvgCssClass(e + "_text", lEntFontClass, false);
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
                        if (biset.getClass("#" + e + "_text", lEntFontClass) == true) {
                            vis.setFontSize(e + "_text", nEntFontforPaper);
                        }
                    }
                });
            }
            biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);
            d.selected = false;
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
                biset.barUpdate("#" + e + "_frame", biset.colors.bicFrame, "", "");
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
 * update the color of entities associated with a merged bic
 * @param entList, a list of entity objects
 * @param utype, string, "highlight" or "normal"
 */
biset.mergedBicEntsUpdate = function(entList, utype) {
    if (utype == "highlight") {
        for (e in entList) {
            var alfaVal = 0.15 + 0.08 * (entList[e].lFreq - 1),
                colEntNewColor = "rgba(228, 122, 30, " + alfaVal + ")";
            biset.barUpdate("#" + e + "_frame", colEntNewColor, "", "");
        }
    } else {
        for (e in entList) {
            biset.barUpdate("#" + e + "_frame", biset.colors.entNormal, "", "");
        }
    }
}


/*
 * set the frame color of a bic
 * @param bicData, the binded data of a bic 
 * @param utype, string, the type of updates
 */
biset.setMergedBicColor = function(bicData, utype) {
    var bicId = bicData.bicIDCmp;
    if (utype == "highlight") {
        var alfaVal = 0.15 + 0.08 * (bicData.bicNum - 1),
            colEntNewColor = "rgba(228, 122, 30, " + alfaVal + ")";
        biset.barUpdate("#" + bicId + "_frame", colEntNewColor, "", "");
    } else {
        biset.barUpdate("#" + bicId + "_frame", biset.colors.bicFrame, "", "");
    }
}


/*
 * function to update the color of correlated entities
 * @param entID, the ID of correlated entities
 * @param barColor, the new color of the bar
 * @param barClass, the new class of the bar
 * @param bdColor, the color for border
 * @param bdStrokeWidth, border width of the bar
 */
biset.barUpdate = function(entID, barColor, bdColor, bdStrokeWidth) {
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



biset.setPathColor = function(pid, pcolor) {
    d3.select("#" + pid)
        .style("stroke", pcolor);
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
            d.xPos = biset.bic.posShift;
            d.yPos = (i + 1) * biset.bic.frameHeight;
            d.startPos = bicStartPos;
            return "translate(" + d.xPos + "," + d.yPos + ")";
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
        })
        .attr("x", function(d, i) {
            return -bicEntsCount(d.rowEntNum);
        })
        .attr("height", biset.entity.height * 0.6)
        .attr("rx", biset.bic.innerRdCorner)
        .attr("ry", biset.bic.innerRdCorner)
        .attr("fill", biset.colors.bicFre);

    bics.append("rect")
        .attr("id", function(d, i) {
            var rfield = d.rowField,
                cfield = d.colField;
            return rfield + "_" + cfield + "_bic_" + d.bicID + "_right";
        })
        .attr("width", function(d, i) {
            return bicEntsCount(d.colEntNum);
        })
        .attr("x", 0)
        .attr("height", biset.entity.height * 0.6)
        .attr("rx", biset.bic.innerRdCorner)
        .attr("ry", biset.bic.innerRdCorner)
        .attr("fill", biset.colors.bicFre);

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
        })
        .attr("x", function(d, i) {
            return -bicEntsCount(d.rowEntNum);
        })
        .attr("height", biset.entity.height * 0.6)
        .attr("rx", biset.bic.frameRdCorner)
        .attr("ry", biset.bic.frameRdCorner)
        .attr("fill", biset.colors.bicFrame);

    // set switch style
    setSwitchMenuItem("bicSelectSwitch");
    setSwitchMenuItem("moveEntSwitch");
    setSwitchMenuItem("bicMergeSwitch");

    // add contextmenu to bics
    addMenuToBic("bics");

    // mouseover event for bic
    bics.on("mouseover", function(d) {
        bicOnMouseover.push(d);
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
                        vis.setFontSize(e + "_text", hEntFontforPaper);
                    vis.setSvgCssClass(e + "_text", lEntFontClass, true);
                });
            }
        }

    });

    // mouseout event for bic
    bics.on("mouseout", function(d) {
        bicOnMouseover.pop();
        biset.bicMoutHandler(d, networkData, entPathCaled);
    });

    // click event for bic
    bics.on("click", function(d) {

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
                            if (biset.getClass("#" + e + "_text", lEntFontClass) == true) {
                                vis.setFontSize(e + "_text", nEntFontforPaper);
                            }
                        }
                    });
                }
                biset.barUpdate("#" + thisFrameID, "", biset.colors.entMouseOverBorder, biset.entity.moBorder);
                d.bicSelected = false;
            }
        }

        // place entities near a bic
        if (d.moveEntOption == true) {
            if (d.mergeOption == false) {
                biset.placeEntNearBic(d, "bic");
            } else {
                var threshold = 0.3,
                    rfield = d.rowField,
                    cfield = d.colField,
                    bID = d.bicIDCmp,

                    bList = biset.getBicsByField(rfield, cfield, allBics),
                    jmatrices = biset.getJindexMatrix(bList, rfield, cfield),

                    jmatrix = jmatrices.jmatrix,
                    ljmatrix = jmatrices.ljmatrix,
                    rjmatrix = jmatrices.rjmatrix,

                    similarBics = biset.getSimilarBics(bID, bList, "bicIDCmp", jmatrix, threshold);

                var tmpBics = similarBics;
                tmpBics[bID] = d;
                relatedEnts = biset.getEntsFromSimBics(tmpBics);
                entLinks = biset.getLinksFromEntList(relatedEnts.entIDs, connections);

                // move similar bics and all related entities
                biset.placeEntNearSimilarBics(rfield, cfield, tmpBics, d.yPos);
            }
        }
    });

    // add links between bic and ent
    for (var i = 0; i < biclusters.length; i++) {
        var rowType = biclusters[i].rowField,
            colType = biclusters[i].colField,
            rowIDs = biclusters[i].row,
            colIDs = biclusters[i].col,
            bicID = biclusters[i].bicID;

        for (var j = 0; j < rowIDs.length; j++) {
            var obj1 = d3.select("#" + rowType + "_" + rowIDs[j]),
                obj2 = d3.select("#" + rowType + "_" + colType + "_bic_" + bicID),
                lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas, "", 1, "normal");

            biclusters[i].linkIDs.push(lineObj.lineID);
            biclusters[i].linkObjs.push(lineObj);

            var entData = biset.getBindDataByBid(rowType + "_" + rowIDs[j]);
            entData.linkIDs.push(lineObj.lineID);
            entData.linkObjs.push(lineObj);

            connections[lineObj.lineID] = lineObj;
        }

        for (var k = 0; k < colIDs.length; k++) {
            var obj1 = d3.select("#" + rowType + "_" + colType + "_bic_" + bicID),
                obj2 = d3.select("#" + colType + "_" + colIDs[k]),
                lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas, "", 1, "normal");

            biclusters[i].linkIDs.push(lineObj.lineID);
            biclusters[i].linkObjs.push(lineObj);

            var entData = biset.getBindDataByBid(colType + "_" + colIDs[k]);
            entData.linkIDs.push(lineObj.lineID);
            entData.linkObjs.push(lineObj);

            connections[lineObj.lineID] = lineObj;
        }
    }
    bics.call(biset.objDrag);
}


/*
 * Get the binded data of a bic
 * @param bid, string, the id of a bic
 * @return object, the data object of this bic
 */
biset.getBindDataByBid = function(bid) {
    return d3.select("#" + bid).data()[0];
}


/*
 * bic mouse out event handler
 * @param d, bic data object
 * @param networkData, dictionary of connections
 * @param entPathCaled, 
 */
biset.bicMoutHandler = function(d, networkData, entPathCaled) {

    if (d.bicMouseOvered == true && d.bicSelected == false && d.bicMenuOnShow == false) {

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


        biset.barUpdate("#" + thisID + "_frame", "", biset.colors.bicFrame, 0);

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
                    vis.setFontSize(e + "_text", nEntFontforPaper);
                vis.setSvgCssClass(e + "_text", lEntFontClass, false);
            });
        }
    }
}


/*
 * get a set of row or col ent ids
 * @param rowOrCol, list of ids from a bic
 * @return a set of ids
 */
biset.getEntSetFromBic = function(rowOrCol) {
    var r = new Set(rowOrCol);
    return r;
}


/*
 * get a set of row or col ent ids
 * @param rowOrCol, list of ids from a merged bic
 * @return a set of ids
 */
biset.getEntSetFromMbic = function(rowOrCol) {
    var entIDs = [];
    for (e in rowOrCol) {
        var theID = parseInt(e.split("_")[1]);
        entIDs.push(theID);
    }
    var r = new Set(entIDs);
    return r;
}


/*
 * get entity info from a list for ordering
 * @param etype, string, the type of entities
 * @return an object with all / partial ent info
 */
biset.prepEntsInfoForOrdering = function(etype) {
    var entsInfo = {},
        objList = [],
        simpleObjList = [],
        idx = 0;

    d3.selectAll("." + etype).each(function(d) {
        var index = d3.select(this).attr("id");
        objList.push(d);
        var item = {};
        item['yPos'] = d.yPos;
        item['id'] = d.entityID;
        item['index'] = idx;
        simpleObjList.push(item);
        idx++;
    });

    entsInfo.fullEntInfoList = objList;
    entsInfo.simplifiedEntInfoList = simpleObjList;

    return entsInfo;
}


/*
 * initialize visual order of objects
 * @param objList, a list of object with simplified info
 * @return lst, with all info initialized as 0
 */
biset.initObjVisualOrder = function(objList) {
    var lst = [];
    for (var i = 0; i < objList.length; i++) {
        var item = {};
        item['id'] = 0;
        item['index'] = 0;
        item['yPos'] = 0;
        item['visualIndex'] = 0;
        lst.push(item);
    }
    return lst;
}


/*
 * update the visual order of ent based on the pos of a given bic
 * @param bPos, int/float, the position of a bic
 * @param entSet, a set of entity id
 * @param entSimpleInfoList, a list of ent object with simplified info
 * @param entVisualList, a list of ent object with simplified + visual order info
 */
biset.updateVisualOrder = function(bPos, entSet, entSimpleInfoList, entVisualList) {
    var pos = -1,
        avgPos = biset.entList.topGap + entSet.size / 2 * biset.entity.height,
        inc_num = 0;

    while (avgPos < bPos) {
        if (avgPos + biset.entity.height > bPos)
            break;
        else {
            inc_num++;
            avgPos += biset.entity.height;
        }
    }
    if (avgPos + biset.entity.height - bPos < bPos - avgPos) {
        inc_num++;
        avgPos += biset.entity.height;
    }

    if (inc_num + entSet.size >= entSimpleInfoList.length)
        inc_num = entSimpleInfoList.length - entSet.size;
    //shuffling the left part
    //var pos_2 = entSet.size;
    var pos_2 = 0;
    pos = inc_num - 1;
    for (var i = 0; i < entSimpleInfoList.length; i++) {
        if (entSet.has(entSimpleInfoList[i].id)) {
            pos++;
            entVisualList[pos]['visualIndex'] = pos;
            entVisualList[pos]['id'] = entSimpleInfoList[i]['id'];
            entVisualList[pos]['index'] = entSimpleInfoList[i]['index'];
        } else {
            if (pos_2 == inc_num)
                pos_2 += entSet.size;
            entVisualList[pos_2]['visualIndex'] = pos_2;
            entVisualList[pos_2]['id'] = entSimpleInfoList[i]['id'];
            entVisualList[pos_2]['index'] = entSimpleInfoList[i]['index'];
            pos_2++;
        }
    }
}


/*
 * shift entities based on a field in the bind data
 * @param etype, string, the type of entity
 * @param field, string, the field in data for ordering
 * @param x, int/float, x position
 * @param y, d3 scale function
 * @param links, all links with the entities
 */
biset.shiftEnt = function(etype, field, x, y, links) {
    d3.selectAll("." + etype).transition()
        .attr("transform", function(d, i) {
            d.xPos = x;
            d.yPos = y(d[field]);
            return "translate(" + d.xPos + "," + d.yPos + ")";
        })
        .call(endall, function() {
            biset.updateLink(links);
        });
}


/*
 * pull entities to the position near a clicked bic
 * @param bicData, data object, the data object of a bic
 * @param bicType, string, the type of bic, "bic" or "mbic"
 */
biset.placeEntNearBic = function(bicData, bicType) {
    var lListType = bicData.rowField,
        rListType = bicData.colField;

    //prepare the left part data
    lEntInfo = biset.prepEntsInfoForOrdering(lListType);
    leftList = lEntInfo.fullEntInfoList;
    leftItemList = lEntInfo.simplifiedEntInfoList;

    //prepare the right part data
    rEntInfo = biset.prepEntsInfoForOrdering(rListType);
    rightList = rEntInfo.fullEntInfoList;
    rightItemList = rEntInfo.simplifiedEntInfoList;

    //sort based on the y value;
    leftItemList.sort(function(a, b) {
        return a.yPos - b.yPos;
    });
    rightItemList.sort(function(a, b) {
        return a.yPos - b.yPos;
    });

    if (bicType == "bic") {
        var item_set_left = biset.getEntSetFromBic(bicData.row),
            item_set_right = biset.getEntSetFromBic(bicData.col);
    } else { // for the case of merged bic
        var item_set_left = biset.getEntSetFromMbic(bicData.rowEnts),
            item_set_right = biset.getEntSetFromMbic(bicData.colEnts);
    }

    //prepare the data
    var newListLeft = biset.initObjVisualOrder(leftItemList),
        newListRight = biset.initObjVisualOrder(rightItemList);

    // update visual order in the left and right part
    biset.updateVisualOrder(bicData.yPos, item_set_left, leftItemList, newListLeft);
    biset.updateVisualOrder(bicData.yPos, item_set_right, rightItemList, newListRight);

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

    var lYaxis = d3.scale.ordinal()
        .domain(yAxisOrderLeft)
        .rangePoints([biset.entList.topGap, leftItemList.length * biset.entity.height + biset.entList.topGap], 0);

    var rYaxis = d3.scale.ordinal()
        .domain(yAxisOrderRight)
        .rangePoints([biset.entList.topGap, rightItemList.length * biset.entity.height + biset.entList.topGap], 0);

    if (bicData.bicClass == "bic") {
        var rowEntLinks = biset.getHalfEntLinksFromBic(bicData, "row");
        biset.shiftEnt(lListType, "entVisualOrder", 2, lYaxis, rowEntLinks.allLinkOjbs);

        var colEntLinks = biset.getHalfEntLinksFromBic(bicData, "col");
        biset.shiftEnt(rListType, "entVisualOrder", 2, rYaxis, colEntLinks.allLinkOjbs);
    } else { // for merged bics
        // TO DO: CALCULATE THE LINKS TO IMPROVE PERFORMANCE
        biset.shiftEnt(lListType, "entVisualOrder", 2, lYaxis, connections);
        biset.shiftEnt(rListType, "entVisualOrder", 2, rYaxis, connections);
    }
}


biset.placeEntNearSimilarBics = function(rtype, ctype, bicObjs, yPos) {
    var lListType = rtype,
        rListType = ctype;

    //prepare the left part data
    lEntInfo = biset.prepEntsInfoForOrdering(lListType);
    leftList = lEntInfo.fullEntInfoList;
    leftItemList = lEntInfo.simplifiedEntInfoList;

    //prepare the right part data
    rEntInfo = biset.prepEntsInfoForOrdering(rListType);
    rightList = rEntInfo.fullEntInfoList;
    rightItemList = rEntInfo.simplifiedEntInfoList;

    //sort based on the y value;
    leftItemList.sort(function(a, b) {
        return a.yPos - b.yPos;
    });
    rightItemList.sort(function(a, b) {
        return a.yPos - b.yPos;
    });

    var left = [],
        right = [];

    for (b in bicObjs) {
        var tmpRowIDs = biset.getEntSetFromBic(bicObjs[b].row),
            tmpColIDs = biset.getEntSetFromBic(bicObjs[b].col);
        for (r of tmpRowIDs)
            left.push(r);
        for (c of tmpColIDs)
            right.push(c);
    }

    var item_set_left = new Set(left),
        item_set_right = new Set(right);

    //prepare the data
    var newListLeft = biset.initObjVisualOrder(leftItemList),
        newListRight = biset.initObjVisualOrder(rightItemList);

    // update visual order in the left and right part
    biset.updateVisualOrder(yPos, item_set_left, leftItemList, newListLeft);
    biset.updateVisualOrder(yPos, item_set_right, rightItemList, newListRight);

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

    var lYaxis = d3.scale.ordinal()
        .domain(yAxisOrderLeft)
        .rangePoints([biset.entList.topGap, leftItemList.length * biset.entity.height + biset.entList.topGap], 0);

    var rYaxis = d3.scale.ordinal()
        .domain(yAxisOrderRight)
        .rangePoints([biset.entList.topGap, rightItemList.length * biset.entity.height + biset.entList.topGap], 0);

    biset.shiftEnt(lListType, "entVisualOrder", 2, lYaxis, connections);
    biset.shiftEnt(rListType, "entVisualOrder", 2, rYaxis, connections);
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

                var opcScale = vis.linearScale(tmpScores, 0, 0.5);

                for (var b in bicScore) {
                    // do not change the color of the one being evaluated
                    if (opcScale(bicScore[b]) != 0) {
                        vis.setSvgOpacityByID(b + "_frame", "rgba(255,0,0, ", opcScale(bicScore[b])); // 51, 204, 51
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

    // retrieve information from MaxEnt Model
    $.ajax({
        url: window.SERVER_PATH + 'vis/maxEntModelFullPath/',
        type: "POST",
        data: JSON.stringify(requestJSON),
        contentType: "application/json",
        success: function(data) {
            var msg = data.msg,
                bicIDs = data.maxScoredChain,
                entIDs = data.maxChainEnts,
                edgeIDs = data.maxChainEdges;

            // minBicIDs = data.minScoredChain,
            // minEntIDs = data.minChainEnts,
            // minEdgeIDs = data.minChainEdges;

            if (msg == "success") {
                for (var i = 0; i < bicIDs.length; i++) {
                    d3.select("#" + bicIDs[i] + "_frame")
                        .attr("fill", "rgba(255,0,0,0.4)");
                }

                for (var i = 0; i < entIDs.length; i++) {
                    d3.select("#" + entIDs[i] + "_frame")
                        .attr("fill", "rgba(255,0,0,0.4)");
                }

                for (var i = 0; i < edgeIDs.length; i++) {
                    d3.select("#" + edgeIDs[i])
                        .style("stroke", "rgba(255,0,0,0.4)");
                }


                // for (var i = 0; i < minBicIDs.length; i++) {
                // 	d3.select("#" + minBicIDs[i] + "_frame")
                // 		.attr("fill", "rgba(0,255,0,0.4)");
                // }

                // for (var i = 0; i < minEntIDs.length; i++) {
                // 	d3.select("#" + minEntIDs[i] + "_frame")
                // 		.attr("fill", "rgba(0,255,0,0.4)");					
                // }

                // for (var i = 0; i < minEdgeIDs.length; i++) {
                // 	d3.select("#" + minEdgeIDs[i])
                // 		.style("stroke", "rgba(0,255,0,0.4)");					
                // }
            }


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

                // var cluster_type = 0;
                if (selMode == "clusterLeft")
                    var cluster_type = 1;
                else if (selMode == "clusterRight")
                    var cluster_type = 2;
                else if (selMode == "cluster")
                    var cluster_type = 0
                else if (selMode == "seriation")
                    var cluster_type = 3

                //step one: obtain the correspoing colom of bic
                var cur_bic = biset.getBicsByField(field1, field2, allBics),
                    idx_left = 0,
                    idx_right = 0;

                if (cluster_type != 3) {

                    //sort based on the left item values from large to small
                    cur_bic.sort(function(a, b) {
                        return b.totalEntNum - a.totalEntNum;
                    });

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
                        vis.svgTransform(bic_name, 2, y_pos);
                    }
                }
                // shuffle entities and bics based on seriation
                else {
                    biset.seriation(cur_bic, field1, field2, allEnts, "adjust");
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

                if (selMode.indexOf("cluster") < 0)
                    biset.connectionDisplayed(field1, field2, selMode, preMode);
            });

        $("#slider_" + lsts[i] + "_" + lsts[i + 1])
            .on("mouseup", function() {
                var selVal = $(this).val(),
                    field1 = $(this).attr("id").split("_")[1],
                    field2 = $(this).attr("id").split("_")[2],
                    bic_prefix = field1 + "_" + field2 + "_bic_";

                var megthreshold = Math.abs(selVal);
                // megthreshold = 1 - selVal;
                console.log(selVal);

                // obtain the correspoing colom of bic
                var cur_bic = biset.getBicsByField(field1, field2, allBics);

                var jacMatrix = {}, // for total entity
                    lJacMatrix = {}, // for entities in row (left)
                    rJacMatrix = {}, // for entities in col (right)
                    cJacMatrix = {}, // a combination of results for the two (l + r)matrix
                    megBicsPairs = new Set();
                for (var j = 0; j < cur_bic.length; j++) {
                    var bicID1 = bic_prefix + cur_bic[j]["bicID"],
                        entsInRow1 = biset.getBicEntsInRowOrCol(cur_bic[j], "row"),
                        entsInCol1 = biset.getBicEntsInRowOrCol(cur_bic[j], "col"),
                        allEnts1 = entsInRow1.concat(entsInCol1);
                    jacMatrix[bicID1] = {};
                    lJacMatrix[bicID1] = {};
                    rJacMatrix[bicID1] = {};
                    cJacMatrix[bicID1] = {};

                    for (var k = 0; k < cur_bic.length; k++) {
                        var bicID2 = bic_prefix + cur_bic[k]["bicID"],
                            entsInRow2 = biset.getBicEntsInRowOrCol(cur_bic[k], "row"),
                            entsInCol2 = biset.getBicEntsInRowOrCol(cur_bic[k], "col"),
                            allEnts2 = entsInRow2.concat(entsInCol2);

                        var tmpIntersect = lstIntersect(allEnts1, allEnts2),
                            tmpUnion = lstUnion(allEnts1, allEnts2),

                            ltmpIntersect = lstIntersect(entsInRow1, entsInRow2),
                            ltmpUnion = lstUnion(entsInRow1, entsInRow2),

                            rtmpIntersect = lstIntersect(entsInCol1, entsInCol2),
                            rtmpUnion = lstUnion(entsInCol1, entsInCol2),

                            jVal = jacIndex(tmpIntersect.length, tmpUnion.length),
                            ljVal = jacIndex(ltmpIntersect.length, ltmpUnion.length),
                            rjVal = jacIndex(rtmpIntersect.length, rtmpUnion.length);

                        jacMatrix[bicID1][bicID2] = jVal;
                        lJacMatrix[bicID1][bicID2] = ljVal;
                        rJacMatrix[bicID1][bicID2] = rjVal;
                        cJacMatrix[bicID1][bicID2] = ljVal * megthreshold + (1 - megthreshold) * rjVal;

                        if (jVal >= megthreshold && bicID1 != bicID2) {
                            if (bicID1 <= bicID2)
                                var bicPair = bicID1 + "____" + bicID2;
                            else
                                var bicPair = bicID2 + "____" + bicID1;

                            if (!megBicsPairs.has(bicPair))
                                megBicsPairs.add(bicPair);
                        }
                    }
                }
                // perform seriation
                // biset.seriation(cur_bic, field1, field2, allEnts, "original");

                /********************* start spatial based merge ************************/
                // sort distance
                // objArraySortMinToMax(cur_bic, "yPos");

                // var bicMergeSpatialDist = biset.bic.frameHeight * 1.5,
                //     spatialSets = findSubset(cur_bic, "yPos", bicMergeSpatialDist);

                // var mergeSets = [];
                // for (var i = 0; i < spatialSets.length; i++) {
                //     var tmpSets = distCheck(spatialSets[i], "bicIDCmp", jacMatrix, megthreshold);
                //     mergeSets.push(tmpSets);
                // }
                /********************* end spatial based merge **************************/

                /********************* start semantic based merge ************************/
                var curBicIDs = [],
                    curBicDict = {};
                for (var b = 0; b < cur_bic.length; b++) {
                    curBicIDs.push(cur_bic[b]["bicIDCmp"]);
                    curBicDict[cur_bic[b]["bicIDCmp"]] = cur_bic[b];
                }

                if (selVal < 0) {
                    var threshVal = 1 - megthreshold;
                    if (selVal > -0.1) {
                        var threshMatrix = jacMatrix;
                    } else {
                        var threshMatrix = lJacMatrix;
                    }
                } else {
                    var threshVal = 1 - megthreshold;
                    if (selVal < 0.1) {
                        var threshMatrix = jacMatrix;
                    } else {
                        var threshMatrix = rJacMatrix;
                    }
                }
                console.log(threshVal);
                var bGroups = kGroups(curBicIDs, threshMatrix, threshVal);
                var mergeSets = [];
                for (var g = 0; g < bGroups.length; g++) {
                    if (bGroups[g].length > 1) {
                        var objInCurGroup = [];
                        for (var j = 0; j < bGroups[g].length; j++) {
                            objInCurGroup.push(curBicDict[bGroups[g][j]]);
                        }
                        mergeSets.push(objInCurGroup);
                    }
                }
                /********************* end semantic based merge **************************/

                // remove previously merged bic and lines
                var mbicClass = field1 + "_" + field2 + "_" + "mergedBic",
                    mLineClass = field1 + "_" + field2 + "_" + "mergedBicLine";
                vis.svgRemovebyClass(mbicClass);
                vis.svgRemovebyClass(mLineClass);

                // show all bics
                for (var i = 0; i < bGroups.length; i++) {
                    var curBicID = bGroups[i][0];
                    biset.bicVisible(curBicID, "show");
                    vis.setPathVisibilitybyClass(curBicID, "show");
                }

                for (var i = 0; i < mergeSets.length; i++) {
                    /******** for spatial merge **********/
                    // var thisMergeSet = mergeSets[i][0];

                    /******** for semantic merge *********/
                    var thisMergeSet = mergeSets[i];
                    // make sure that there are elements to merge
                    if (thisMergeSet != undefined) {
                        var rowEntIDs = {},
                            colEntIDs = {},
                            avgXpos = 0,
                            avgYpos = 0,
                            mbicIDs = [],
                            bwidthUnit = 0;

                        for (var j = 0; j < thisMergeSet.length; j++) {
                            var thisBicID = thisMergeSet[j]["bicIDCmp"],
                                thisBicLeft = thisBicID + "_left",
                                thisBicRight = thisBicID + "_right",
                                thisBicFrame = thisBicID + "_frame";

                            vis.setPathVisibilitybyClass(thisBicID, "hidden");
                            biset.bicVisible(thisBicID, "hidden");

                            avgXpos += thisMergeSet[j]["startPos"];
                            avgYpos += thisMergeSet[j]["yPos"];

                            if (j == 0) {
                                // get the width unit of a bic
                                var thisBicLeftWidth = d3.select("#" + thisBicLeft).attr("width"),
                                    thisBicRowNum = d3.select("#" + thisBicLeft).datum().rowEntNum,
                                    bwidthUnit = thisBicLeftWidth / thisBicRowNum;
                            }
                            mbicIDs.push(thisBicID);

                            var thisRowEntIDs = biset.getBicEntsInRowOrCol(thisMergeSet[j], "row"),
                                thisColEntIDs = biset.getBicEntsInRowOrCol(thisMergeSet[j], "col");

                            lstEntCount(thisRowEntIDs, rowEntIDs);
                            lstEntCount(thisColEntIDs, colEntIDs);
                        }

                        avgXpos /= thisMergeSet.length;
                        avgYpos /= thisMergeSet.length;

                        var rEntNum = Object.keys(rowEntIDs).length,
                            cEntNum = Object.keys(colEntIDs).length,
                            bNum = thisMergeSet.length,
                            mbicData = biset.genMbicData(mbicIDs, mbicClass, avgXpos, avgXpos, avgYpos, field1, field2, rowEntIDs, colEntIDs, rEntNum, cEntNum, bNum, bwidthUnit);

                        var mergedBic = biset.addMergedBic("vis_canvas", mbicData);

                        // get min and max frequency
                        var rowEntFreq = [],
                            colEntFreq = [],
                            allEntFreq = [];
                        for (key in rowEntIDs)
                            rowEntFreq.push(rowEntIDs[key]["lFreq"]);
                        for (key in colEntIDs)
                            colEntFreq.push(colEntIDs[key]["lFreq"]);
                        allEntFreq = rowEntFreq.concat(colEntFreq);
                        var rmaxFreq = Array.max(rowEntFreq),
                            rminFreq = Array.min(rowEntFreq),
                            cmaxFreq = Array.max(colEntFreq),
                            cminFreq = Array.min(colEntFreq),
                            maxFreq = Array.max(allEntFreq),
                            minFreq = Array.min(allEntFreq);

                        for (key in rowEntIDs) {
                            var obj1 = d3.select("#" + key),
                                rlwRatio = rowEntIDs[key]["lFreq"],
                                rlType = rowEntIDs[key]["lType"],
                                lineObj = biset.addLink(obj1, mergedBic, biset.colors.lineNColor, canvas, mLineClass, rlwRatio, rlType);

                            mbicData.linkIDs.push(lineObj.lineID);
                            mbicData.linkObjs.push(lineObj);

                            connections[lineObj.lineID] = lineObj;
                        }

                        for (key in colEntIDs) {
                            var obj2 = d3.select("#" + key),
                                clwRatio = colEntIDs[key]["lFreq"],
                                clType = colEntIDs[key]["lType"],
                                lineObj = biset.addLink(mergedBic, obj2, biset.colors.lineNColor, canvas, mLineClass, clwRatio, clType);

                            mbicData.linkIDs.push(lineObj.lineID);
                            mbicData.linkObjs.push(lineObj);

                            connections[lineObj.lineID] = lineObj;
                        }
                        mergedBic.call(biset.objDrag);
                        // add context menu to merged bic
                        addMenuToMbic(mbicClass);

                        /******************** for spatial merge **********************/
                        /*
                        var bicToShow = setDiff(spatialSets[i], thisMergeSet, "bicIDCmp");
                        for (key in bicToShow) {
                            var thisBicLeft = key + "_left",
                                thisBicRight = key + "_right",
                                thisBicFrame = key + "_frame";

                            biset.setVisibility(thisBicLeft, "visible");
                            biset.setVisibility(thisBicRight, "visible");
                            biset.setVisibility(thisBicFrame, "visible");
                            vis.setPathVisibilitybyClass(key, "visible");
                        }
                        */
                    }
                    /******************** for spatial merge **********************/
                    /*
                    // show previously hide bics and their lines
                    else {
                        // var bicsToShow = spatialSets[i];
                        // for (var j = 0; j < bicsToShow.length; j++) {
                        //     var thisBicID = bicsToShow[j]["bicIDCmp"],
                        //         thisBicLeft = thisBicID + "_left",
                        //         thisBicRight = thisBicID + "_right",
                        //         thisBicFrame = thisBicID + "_frame";

                        //     vis.setPathVisibilitybyClass(thisBicID, "visible");
                        //     biset.setVisibility(thisBicLeft, "visible");
                        //     biset.setVisibility(thisBicRight, "visible");
                        //     biset.setVisibility(thisBicFrame, "visible");
                        // }
                    }
					*/
                }
            });
    }
}


/*
 * get bicluster between two fieldsss
 * @param rtype, string, the row type
 * @param ctype, string, the col type
 * @param bDict, object, the dictionary of all bics
 * @return a list of bic object
 */
biset.getBicsByField = function(rtype, ctype, bDict) {
    var bics = [];
    for (e in bDict) {
        if (e.indexOf(rtype) >= 0 && e.indexOf(ctype) >= 0) {
            bics.push(bDict[e]);
        }
    }
    return bics;
}


/*
 * get jaccard index matrix for a given list of bics
 * @param bicList, a list of bics
 * @param rtype, string, entity type on the left
 * @param ctype, string, entity type on the right
 * @return, three matrix of jaccard index (overall, left, right)
 */
biset.getJindexMatrix = function(bicList, rtype, ctype) {

    var bic_prefix = rtype + "_" + ctype + "_bic_",
        jmatrix = {},
        ljmatrix = {},
        rjmatrix = {},
        res = {};

    // megBicsPairs = new Set();

    for (var j = 0; j < bicList.length; j++) {
        var bicID1 = bic_prefix + bicList[j]["bicID"],
            entsInRow1 = biset.getBicEntsInRowOrCol(bicList[j], "row"),
            entsInCol1 = biset.getBicEntsInRowOrCol(bicList[j], "col"),
            allEnts1 = entsInRow1.concat(entsInCol1);
        jmatrix[bicID1] = {};
        ljmatrix[bicID1] = {};
        rjmatrix[bicID1] = {};

        for (var k = 0; k < bicList.length; k++) {
            var bicID2 = bic_prefix + bicList[k]["bicID"],
                entsInRow2 = biset.getBicEntsInRowOrCol(bicList[k], "row"),
                entsInCol2 = biset.getBicEntsInRowOrCol(bicList[k], "col"),
                allEnts2 = entsInRow2.concat(entsInCol2);

            var tmpIntersect = lstIntersect(allEnts1, allEnts2),
                tmpUnion = lstUnion(allEnts1, allEnts2),

                ltmpIntersect = lstIntersect(entsInRow1, entsInRow2),
                ltmpUnion = lstUnion(entsInRow1, entsInRow2),

                rtmpIntersect = lstIntersect(entsInCol1, entsInCol2),
                rtmpUnion = lstUnion(entsInCol1, entsInCol2),

                jVal = jacIndex(tmpIntersect.length, tmpUnion.length),
                ljVal = jacIndex(ltmpIntersect.length, ltmpUnion.length),
                rjVal = jacIndex(rtmpIntersect.length, rtmpUnion.length);

            jmatrix[bicID1][bicID2] = jVal;
            ljmatrix[bicID1][bicID2] = ljVal;
            rjmatrix[bicID1][bicID2] = rjVal;
        }
    }

    res["jmatrix"] = jmatrix;
    res["ljmatrix"] = ljmatrix;
    res["rjmatrix"] = rjmatrix;

    return res;
}


/*
 * get similar bics based on jaccard index with a given threshold
 * @param bID, string, the given bicluster
 * @param bList, a list of biclusters
 * @param idField, string, the field of bic id
 * @param jmatrix, matrix, paire-wise jaccard index value
 * @param val, int/float, the threshold
 */
biset.getSimilarBics = function(bID, bList, idField, jmatrix, val) {
    var r = {};
    for (var i = 0; i < bList.length; i++) {
        var curBicID = bList[i][idField];
        if (curBicID != bID && jmatrix[bID][curBicID] >= val) {
            r[curBicID] = bList[i];
        }
    }
    return r;
}


/*
 * set visibility of a bic
 * @param bicID, string, the id of a bic
 * @param visibility, string, show or hide
 */
biset.bicVisible = function(bicID, visibility) {
    var theBicLeft = bicID + "_left",
        theBicRight = bicID + "_right",
        theBicFrame = bicID + "_frame";

    biset.setVisibility(theBicLeft, visibility);
    biset.setVisibility(theBicRight, visibility);
    biset.setVisibility(theBicFrame, visibility);
}


/*
 * generate data for a merged bic
 */
biset.genMbicData = function(bids, bclass, stPos, bx, by, rfield, cfield, rObjs, cObjs, rNum, cNum, bNum, widthUnit) {
    var mbicID = "";
    for (var i = 0; i < bids.length; i++) {
        if (i == 0) {
            mbicID = bids[i];
        } else {
            mbicID += "----" + bids[i];
        }
    }
    var mbicData = {
        "bicIDCmp": mbicID,
        "bics": bids,
        "bicClass": bclass,
        "startPos": stPos,
        "xPos": bx,
        "yPos": by,
        "rowField": rfield,
        "colField": cfield,
        "rowEnts": rObjs,
        "colEnts": cObjs,
        "rowEntNum": rNum,
        "colEntNum": cNum,
        "bicNum": bNum,
        "mbicWithUnit": widthUnit,
        "linkIDs": [],
        "linkObjs": []
    }
    return mbicData;
}


biset.addMergedBic = function(canvasID, bData) {
    var mbic = d3.select("#" + canvasID)
        .append("g")
        .datum(bData)
        .attr("id", bData.bicIDCmp)
        .attr("class", bData.bicClass)
        .attr("transform", "translate(" + bData.startPos + "," + bData.yPos + ")");

    // proportion of row
    mbic.append("rect")
        .attr("id", bData.bicIDCmp + "_row")
        .attr("class", bData.bicClass)
        .attr("width", bData.mbicWithUnit * bData.rowEntNum)
        .attr("x", -bData.mbicWithUnit * bData.rowEntNum)
        .attr("height", biset.entity.height * 0.45 * bData.bicNum)
        .attr("rx", biset.bic.mRdCorner)
        .attr("ry", biset.bic.mRdCorner)
        .attr("fill", biset.colors.bicFre);

    // set the length of a bicluster based on its component
    mbic.append("rect")
        .attr("id", bData.bicIDCmp + "_col")
        .attr("class", bData.bicClass)
        .attr("width", bData.mbicWithUnit * bData.colEntNum)
        .attr("x", 0)
        .attr("height", biset.entity.height * 0.45 * bData.bicNum)
        .attr("rx", biset.bic.mRdCorner)
        .attr("ry", biset.bic.mRdCorner)
        .attr("fill", biset.colors.bicFre);

    mbic.append("rect")
        .attr("id", bData.bicIDCmp + "_frame")
        .attr("class", bData.bicClass)
        .attr("width", bData.mbicWithUnit * (bData.colEntNum + bData.rowEntNum))
        .attr("x", -bData.mbicWithUnit * bData.rowEntNum)
        .attr("height", biset.entity.height * 0.45 * bData.bicNum)
        .attr("rx", biset.bic.frameRdCorner)
        .attr("ry", biset.bic.frameRdCorner)
        .attr("fill", biset.colors.bicFrame);

    mbic.on("mouseover", function(d) {
        var bicID = d.bicIDCmp,
            rowEnts = d.rowEnts,
            colEnts = d.colEnts;
        biset.mergedBicEntsUpdate(rowEnts, "highlight");
        biset.mergedBicEntsUpdate(colEnts, "highlight");

        biset.setMergedBicColor(d, "highlight");

        biset.barUpdate("#" + bicID + "_frame", "", biset.colors.bicFrameHColor, 2);

        var linkToHighlight = biset.getLinksbyBic(d, connections);
        for (l in linkToHighlight)
            biset.setPathColor(l, biset.colors.linePreHColor);
    });

    mbic.on("mouseout", function(d) {
        var bicID = d.bicIDCmp,
            rowEnts = d.rowEnts,
            colEnts = d.colEnts;
        biset.mergedBicEntsUpdate(rowEnts, "normal");
        biset.mergedBicEntsUpdate(colEnts, "normal");

        biset.setMergedBicColor(d, "normal");

        biset.barUpdate("#" + bicID + "_frame", "", biset.colors.bicFrame, 0);

        var linkToNormal = biset.getLinksbyBic(d, connections);
        for (l in linkToNormal)
            biset.setPathColor(l, biset.colors.lineNColor);
    });

    mbic.on("click", function(d) {
        biset.placeEntNearBic(d, "mbic");
    });

    return mbic;
}


/*
 * remove a merged bic
 * @param mbicID, string, the id of this merged bic
 */
biset.removeMbicByID = function(mbicID) {
    vis.svgRemovebyID(mbicID + "_row");
    vis.svgRemovebyID(mbicID + "_col");
    vis.svgRemovebyID(mbicID + "_frame");
}


/*
 * remove a list of links
 * @param lList, array, a list of link ids
 */
biset.removeLinks = function(lList) {
    for (var i = 0; i < lList.length; i++) {
        var lID = lList[i];
        vis.svgRemovebyID(lID);
    }
}


/*
 * set visibility of a list of links
 * @param lList, a list of link ids
 * @param visible, string, "show" or "hidden"
 */
biset.setLinksVisible = function(lList, visible) {
    for (var i = 0; i < lList.length; i++) {
        var lID = lList[i];
        biset.setVisibility(lID, visible);
    }
}


/*
 * perform seriation to a pair of entity list
 * @param bics, list, a list of bics inbetween the tow ent list
 * @param rfield, string, the domain of list on the left
 * @param cfield, string, the domain of list on the right
 * @param entDict, dictionary, a dictionary of info for all ents
 * @param option, string, "adjust", "original", "fixed"
 */
biset.seriation = function(bics, rfield, cfield, entDict, option) {

    //sort bic based on sered order
    bics.sort(function(a, b) {
        return a.bicSeredOrder - b.bicSeredOrder;
    });

    var leftList = [],
        rightList = [];

    // entities in the left list    
    d3.selectAll("." + rfield).each(function(d) {
        var index = d3.select(this).attr("id");
        leftList.push(d);
    });

    // entities in the right list
    d3.selectAll("." + cfield).each(function(d) {
        var index = d3.select(this).attr("id");
        rightList.push(d);
    });

    var yAxisOrderLeft = [],
        yAxisOrderRight = [];
    for (var i = 0; i < leftList.length; i++)
        yAxisOrderLeft.push(i);
    for (var i = 0; i < rightList.length; i++)
        yAxisOrderRight.push(i);

    var yAxisLeft = d3.scale.ordinal()
        .domain(yAxisOrderLeft)
        .rangePoints([biset.entList.topGap, leftList.length * biset.entity.height + biset.entList.topGap], 0);

    var yAxisRight = d3.scale.ordinal()
        .domain(yAxisOrderRight)
        .rangePoints([biset.entList.topGap, rightList.length * biset.entity.height + biset.entList.topGap], 0);

    // shuffle entities in the left column
    d3.selectAll("." + rfield).transition()
        .attr("transform", function(d, i) {
            d.xPos = 2;
            d.yPos = yAxisLeft(d.entRseredOrder);
            return "translate(2," + yAxisLeft(d.entRseredOrder) + ")";
        })
        .call(endall, function() {
            biset.updateLink(connections);
        });

    // shuffle entities in the right colum
    d3.selectAll("." + cfield).transition()
        .attr("transform", function(d, i) {
            d.xPos = 2;
            d.yPos = yAxisRight(d.entLseredOrder);
            return "translate(2," + yAxisRight(d.entLseredOrder) + ")";
        })
        .call(endall, function() {
            biset.updateLink(connections);
        });

    var bic_prefix = rfield + "_" + cfield + "_bic_";

    // --------- ent based position with adjustment -----------
    // --------------------------------------------------------
    if (option == "adjust") {
        var pos_array = [];
        for (e in bics) {
            var bic_name = bic_prefix + bics[e].bicID.toString(),
                y_pos = 0,
                num_items = 0;

            for (e2 in bics[e].row) {
                var ent_val = bics[e].row[e2],
                    ent_id = bics[e].rowField + "_" + ent_val;
                y_pos += entDict[ent_id].yPos;
                num_items++;
            }
            for (e2 in bics[e].col) {
                var ent_val = bics[e].col[e2],
                    ent_id = bics[e].colField + "_" + ent_val;
                y_pos += entDict[ent_id].yPos;
                num_items++;
            }

            y_pos = y_pos / num_items;

            var tmp = {};
            tmp["bicID"] = bic_name;
            tmp["bicYpos"] = y_pos;
            pos_array.push(tmp);

        }

        // position adjustment
        for (var i = 0; i < pos_array.length - 1; i++) {
            var posDiff = pos_array[i + 1]["bicYpos"] - pos_array[i]["bicYpos"];
            if (posDiff < biset.bic.frameHeight) {
                if (posDiff >= 0)
                    pos_array[i + 1]["bicYpos"] += 1.2 * biset.bic.frameHeight;
                else
                    pos_array[i + 1]["bicYpos"] = pos_array[i]["bicYpos"] + biset.bic.frameHeight;
            }
        }

        for (var i = 0; i < pos_array.length; i++) {
            var bic_name = pos_array[i]["bicID"];
            vis.svgTransform(bic_name, 2, pos_array[i]["bicYpos"]);
        }
    }
    // --------- end ent based position with adjust -----------
    // --------------------------------------------------------


    // --------------------------------------------------------
    // ------------------ ent based position ------------------
    if (option == "original") {
        // shuffle the bic_cluster
        for (e in bics) {
            var bic_name = bic_prefix + bics[e].bicID.toString(),
                y_pos = 0,
                num_items = 0;

            for (e2 in bics[e].row) {
                var ent_val = bics[e].row[e2],
                    ent_id = bics[e].rowField + "_" + ent_val;
                y_pos += entDict[ent_id].yPos;
                num_items++;
            }
            for (e2 in bics[e].col) {
                var ent_val = bics[e].col[e2],
                    ent_id = bics[e].colField + "_" + ent_val;
                y_pos += entDict[ent_id].yPos;
                num_items++;
            }

            y_pos = y_pos / num_items;
            vis.svgTransform(bic_name, 2, y_pos);
        }
    }
    // ------------------ end ent based position --------------
    // --------------------------------------------------------


    // --------------------------------------------------------
    // ------------------ fixed position ----------------------
    if (option == "fixed") {
        for (e in bics) {
            var bic_name = bic_prefix + bics[e].bicID.toString();
            vis.svgTransform(bic_name, 2, bics[e].bicSeredOrder * biset.bic.frameHeight + 12);
        }
    }
    // ------------------ end fixed position ------------------
    // --------------------------------------------------------

}


/*
 * get entities id (with type) from a bic
 * @param bic, a bicluster object
 * @param rowOrCol, string, "row" or "col"
 * @return the elements in the row or column
 */
biset.getBicEntsInRowOrCol = function(bic, rowOrCol) {
    var e = bic[rowOrCol],
        r = [];
    for (var i = 0; i < e.length; i++) {
        var theID = bic[rowOrCol + "Field"] + "_" + e[i];
        r.push(theID);
    }
    return r;
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
 * find all links from a bic (without its entities)
 * @param bicData, a bic object
 * @param allLinks, object dictionary, all link object
 * @return object dict
 */
biset.getLinksbyBic = function(bicData, allLinks) {
    var thisBicID = bicData["bicIDCmp"],
        res = {};

    /************* start consider it entities *************/
    /* 
    rowEntIDs = biset.getBicEntsInRowOrCol(bicData, "row"),
    colEntIDs = biset.getBicEntsInRowOrCol(bicData, "col");

    var idsToCheck = [];
    idsToCheck = rowEntIDs.concat(colEntIDs);
    idsToCheck.push(thisBicID);
    for (var i = 0; i < idsToCheck.length; i++) {
        for (key in allLinks) {
            if (key.indexOf(idsToCheck[i]) >= 0) {
                res[key] = allLinks[key];
            }
        }
    }
	*/
    /************* end consider it entities **************/
    for (key in allLinks) {
        if (key.indexOf(thisBicID) >= 0) {
            res[key] = allLinks[key];
        }
    }
    return res;
}


biset.getLinksFromEntList = function(entList, allLinks) {
    var r = {};
    // console.log("here");
    // console.log()
    for (var i = 0; i < entList.length; i++) {
        var entID = entList[i];
        for (k in allLinks) {
            if (k.indexOf(entID) >= 0) {
                r[k] = allLinks[k];
            }
        }
    }
    return r;
}


/*
 * get all links from entities of a bic
 * @param bData, the binded data of this bic
 */
biset.getEntLinksFromBic = function(bData) {
    var r = {},
        blinks = [], // link with bic
        olinks = [], // link without bic (ent - ent)
        rowEntIDs = biset.getBicEntsInRowOrCol(bData, "row"),
        colEntIDs = biset.getBicEntsInRowOrCol(bData, "col");

    for (var i = 0; i < rowEntIDs.length; i++) {
        var thisEntData = biset.getBindDataByBid(rowEntIDs[i]);
        blinks = blinks.concat(thisEntData.linkObjs);
        olinks = olinks.concat(thisEntData.linkNotInBicObjs);
    }

    for (var i = 0; i < colEntIDs.length; i++) {
        var thisEntData = biset.getBindDataByBid(colEntIDs[i]);
        blinks = blinks.concat(thisEntData.linkObjs);
        olinks = olinks.concat(thisEntData.linkNotInBicObjs);
    }

    var allLinks = blinks.concat(olinks);
    r.linkObjs = blinks;
    r.linkNotInBicObjs = olinks;
    r.allLinkOjbs = allLinks;

    return r;
}


/*
 * get all links from row or col entities of a bic
 * @param bData, the binded data of this bic
 * @param rowOrCol, string, "row" or "col"
 */
biset.getHalfEntLinksFromBic = function(bData, rowOrCol) {
    var r = {},
        blinks = [], // link with bic
        olinks = [], // link without bic (ent - ent)
        entIDs = biset.getBicEntsInRowOrCol(bData, rowOrCol);

    for (var i = 0; i < entIDs.length; i++) {
        var thisEntData = biset.getBindDataByBid(entIDs[i]);
        blinks = blinks.concat(thisEntData.linkObjs);
        olinks = olinks.concat(thisEntData.linkNotInBicObjs);
    }

    var allLinks = blinks.concat(olinks);
    r.linkObjs = blinks;
    r.linkNotInBicObjs = olinks;
    r.allLinkOjbs = allLinks;

    return r;
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
 * @param lineClass, string, the css class of the line
 * @param lwidth, int/float, the with of the line
 * @param ltype, string, the type of the line
 */
biset.addLink = function(obj1, obj2, line, d3obj, lineClass, lwidth, ltype) {
    if (obj1.line && obj1.from && obj1.to) {
        line = obj1;
        obj1 = line.from;
        obj2 = line.to;
        d3obj = line.d3Canvas;
    }

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
        line.line.attr("d", path);
    } else {
        var lid1 = obj1.attr("id"),
            lid2 = obj2.attr("id"),
            lID = biset.genLinkID(lid1, lid2);

        if (lineClass == "") {
            var lclass = "lineNormal line___" + lid1 + " line___" + lid2;
        } else {
            var lclass = lineClass;
        }

        var lineWidth = lwidth * biset.conlink.nwidth;

        if (ltype == "normal") {
            var lineObj = d3obj.append("path")
                .attr("d", path)
                .attr("id", lID)
                .attr("class", lclass)
                .style("stroke", biset.colors.lineNColor)
                .style("stroke-width", lineWidth)
                .style("fill", "none");
        } else {
            var lineObj = d3obj.append("path")
                .attr("d", path)
                .attr("id", lID)
                .attr("class", lclass)
                .style("stroke", biset.colors.lineNColor)
                .style("stroke-width", lineWidth)
                .style("stroke-dasharray", "8,8")
                .style("fill", "none");
        }

        return {
            lineID: lID,
            line: lineObj,
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

    for (var i = 0; i < linkLsts.length; i++) {
        var obj1ID = linkLsts[i].obj1,
            obj2ID = linkLsts[i].obj2,
            lkID = linkLsts[i].oriLinkID;

        var obj1 = d3.select("#" + obj1ID),
            obj2 = d3.select("#" + obj2ID),
            lineObj = biset.addLink(obj1, obj2, biset.colors.lineNColor, canvas, "", 1, "normal");

        var ent1Data = biset.getBindDataByBid(obj1ID),
            ent2Data = biset.getBindDataByBid(obj2ID);

        ent1Data.linkNotInBicIDs.push(lineObj.lineID);
        ent1Data.linkNotInBicObjs.push(lineObj);
        ent2Data.linkNotInBicIDs.push(lineObj.lineID);
        ent2Data.linkNotInBicObjs.push(lineObj);

        biset.setVisibility(lineObj.lineID, "hidden");
        connections[lineObj.lineID] = lineObj;
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


/*
 * order bics in a object list
 * @param bList, a bic object list
 * @param field, string, the field of ent number
 * @return a list of bic ID, ordered from max to min
 */
biset.bicOrderBySize = function(bList, field) {
    var r = [];
    for (b in bList) {
        r.push(bList[b]);
    }
    r.sort(function(a, b) {
        return b[field] - a[field];
    });
    for (var i = 0; i < r.length; i++) {
        var bID = r[i].bicIDCmp;
        r[i] = bID;
    }
    return r;
}


/*
 * order similar bics based on jaccardy index
 * @param bList, a list of bic object
 * @param bID, string, the bic id to compute similarity
 * @param jmatrix, a matrix of similarity values
 * @return a list of bic object, ordered from max to min
 */
biset.bicOrderBySimilarity = function(bList, bID, jmatrix) {
    var r = [],
        simple = [];
    for (b in bList) {
        var tmp = {};
        tmp.bicIDCmp = b;
        tmp.bicJindex = jmatrix[bID][b];
        simple.push(tmp);
    }
    simple.sort(function(a, b) {
        return b.bicJindex - a.bicJindex;
    });
    for (var i = 0; i < simple.length; i++) {
        r.push(simple[i].bicIDCmp);
    }
    return r;
}


/*
 * get entities from a list of similar bics
 * @param bList, a list of bic object
 * @return an object of entities
 */
biset.getEntsFromSimBics = function(bList) {
    var r = {},
        rEnts = [],
        cEnts = [],
        allEnts = [];

    for (b in bList) {
        var bID = b,
            rfield = bList[b].rowField,
            cfield = bList[b].colField,
            rIDs = bList[b].row,
            cIDs = bList[b].col;

        for (var i = 0; i < rIDs.length; i++) {
            var rEntID = rfield + "_" + rIDs[i];
            rEnts.push(rEntID);
        }
        for (var j = 0; j < cIDs.length; j++) {
            var cEntID = cfield + "_" + cIDs[j];
            cEnts.push(cEntID);
        }
    }

    allEnts = rEnts.concat(cEnts);

    r.rowEntIDs = rEnts;
    r.colEntIDs = cEnts;
    r.entIDs = allEnts;

    return r;
}


// drag function for a d3 object
biset.objDrag = d3.behavior.drag()
    .origin(function(d) {
        // if (d.bicClass == "bic") {
        return {
            x: d.xPos, // d3.select(this).datum()
            y: d.yPos
        };
        // // } else {
        //     return {
        //         x: d.xPos + d.startPos,
        //         y: d.yPos
        //     }
        // }
    })
    .on("dragstart", function(d) {
        draged = 1;
        d3.event.sourceEvent.stopPropagation();
        d3.select(this).classed("dragging", true);

        // the shared data for merge
        dragShareData = {};

        if (d.mergeOption == true) {
            var threshold = 0.3,
                rfield = d.rowField,
                cfield = d.colField,
                bID = d.bicIDCmp,

                bList = biset.getBicsByField(rfield, cfield, allBics),
                jmatrices = biset.getJindexMatrix(bList, rfield, cfield),

                jmatrix = jmatrices.jmatrix,
                ljmatrix = jmatrices.ljmatrix,
                rjmatrix = jmatrices.rjmatrix,

                similarBics = biset.getSimilarBics(bID, bList, "bicIDCmp", jmatrix, threshold),
                orderSimBics = biset.bicOrderBySimilarity(similarBics, bID, jmatrix);

            // order similar bic with the dragged one by size
            var tmpBics = similarBics;
            tmpBics[bID] = d;
            var simBicBySize = biset.bicOrderBySize(tmpBics, "totalEntNum"),
                relatedEnts = biset.getEntsFromSimBics(tmpBics),
                entLinks = biset.getLinksFromEntList(relatedEnts.entIDs, connections);

            dragShareData.rowField = rfield;
            dragShareData.colField = cfield;
            dragShareData.bicIDCmp = bID;
            dragShareData.bicList = bList;
            dragShareData.threshVal = threshold;
            dragShareData.jMatrix = jmatrix;
            dragShareData.ljMatrix = ljmatrix;
            dragShareData.rjMatrix = rjmatrix;
            dragShareData.similarBics = similarBics;
            dragShareData.simBicBySize = simBicBySize;
            dragShareData.orderSimBics = orderSimBics;
            dragShareData.relatedEnts = relatedEnts;
            dragShareData.relatedLinks = entLinks;
        }
    })
    .on("drag", function(d) {
        var dragX = d3.event.x,
            dragY = d3.event.y;

        // TO DO: BOUNDARY CHECK!!!

        // var objClass = d3.select(this).attr("class");
        // if (objClass.indexOf("mergedBic") < 0) {
        //     // dragX -= d3.select(this).datum().startPos;
        //     
        //     // if (dragX >= biset.entList.gap * 2)
        //     //     dragX = biset.entList.gap * 2;
        //     // if (dragX + biset.entList.gap * 2 <= 0)
        //     //     dragX = -biset.entList.gap * 2;

        // }

        // boundary check
        if (dragY < 10)
            dragY = 10;

        d3.select(this).attr("transform", "translate(" + dragX + "," + dragY + ")");
        d.yPos = dragY;
        d.xPos = dragX;

        // update related lines (imporve dragging performance)
        var relatedLinks = d.linkObjs;
        biset.updateLink(relatedLinks);

        if (d.mergeOption == true) {
            var pos = 0,
                sortedSimBics = dragShareData.orderSimBics,
                sizebasedSimBics = dragShareData.simBicBySize,
                draggedBicID = dragShareData.bicIDCmp,
                draggedBicSizeIndex = sizebasedSimBics.indexOf(draggedBicID);

            for (var i = 0; i < sortedSimBics.length; i++) {
                var thisBicID = sortedSimBics[i],
                    thisBicSizeIndex = sizebasedSimBics.indexOf(thisBicID);

                if (thisBicSizeIndex < draggedBicSizeIndex) {
                    pos = (-20) * (i + 1);
                } else {
                    pos = 20 * (i + 1) + biset.bic.frameHeight;
                }

                var y = parseInt(d.yPos) + pos,
                    dtimer = i * 50,
                    thisBicData = biset.getBindDataByBid(thisBicID);

                // update the position of similar bics
                thisBicData.xPos = d.xPos;
                thisBicData.yPos = y;

                d3.select("#" + thisBicID)
                    .transition()
                    .delay(i * 50)
                    .attr("transform", "translate(" + d.xPos + "," + y + ")");

                // update related lines
                var blinks = biset.getBindDataByBid(sortedSimBics[i]).linkObjs;
                // setTimeout(biset.updateLink(blinks), dtimer);
                biset.updateLink(blinks);
            }
        }
    })
    .on("dragend", function(d) {
        draged = 0;
        if (d.mergeOption == false && d.moveEntOption == false) {
            biset.updateLink(d.linkObjs);
        } else {
            biset.updateLink(connections);
        }
        // TO DO: CALCUALTE LINKS TO IMPORVE PERFORMANCE

        // if (dragShareData.relatedLinks != undefined) {
        //     biset.updateLink(dragShareData.relatedLinks);
        // } else {
        //     console.log("no similar links");
        //     biset.updateLink(d.linkObjs);
        // }
        if (d.mergeOption == true && !$.isEmptyObject(dragShareData)) {
            var draggedBicID = d.bicIDCmp,
                cx = d.xPos + d.startPos,
                cy = d.yPos + biset.bic.frameHeight / 2,
                bics = dragShareData.similarBics,
                jmatrix = dragShareData.jMatrix;

            var cdata = [],
                y = [],
                simVal = [];
            for (b in bics) {
                var thisBicID = bics[b].bicIDCmp;
                if (thisBicID != draggedBicID && bics[b].merged == false) {
                    var tmp = {};
                    tmp.yPos = bics[b].yPos;
                    tmp.xPos = bics[b].xPos;
                    tmp.startPos = bics[b].startPos;
                    tmp.simVal = jmatrix[draggedBicID][thisBicID];
                    tmp.bicIDCmp = thisBicID;
                    tmp.rfield = bics[b].rowField;
                    tmp.cfield = bics[b].colField;

                    var diff = bics[b].yPos - cy;
                    if (diff > 0) {
                        var r = diff + biset.bic.frameHeight / 2 + 2;
                    } else {
                        var r = Math.abs(diff) + 2;
                    }
                    tmp.radius = r;

                    cdata.push(tmp);
                }
            }

            objArraySortMaxToMin(cdata, "radius");

            var semBicIDs = [];
            for (var i = 0; i < cdata.length; i++)
                semBicIDs.push(cdata[i].bicIDCmp);
            semBicIDs.push(draggedBicID);

            if (cdata.length > 0) {
                var srange = vis.addSvgGroup("vis_canvas", "semRange", cdata, cx, cy);
                vis.addCircies(srange, "bicIDCmp", "semCircle", 0, 0, "radius", "rgba(224, 110, 92, 0.18)");

                srange.on("mouseover", function(d) {
                    vis.setObjBorder(d3.select(this), "blue", 2);
                });

                srange.on("mouseout", function(d) {
                    vis.setObjBorder(d3.select(this), "blue", 0);
                });

                // merge bics within this circle
                srange.on("click", function(d) {
                    var bicID = d.bicIDCmp,
                        startIndex = semBicIDs.indexOf(bicID),
                        bNum = semBicIDs.length - startIndex,

                        rfield = d.rfield,
                        cfield = d.cfield,
                        mbicIDs = [],
                        mbicClass = rfield + "_" + cfield + "_" + "mergedBic",
                        mLineClass = rfield + "_" + cfield + "_" + "mergedBicLine",
                        startPos = d.startPos,

                        avgXpos = d.xPos,
                        avgYpos = 0,
                        bwidthUnit = 0,
                        rowEntIDs = {},
                        colEntIDs = {},

                        mergeSet = [];


                    for (var i = startIndex; i < semBicIDs.length; i++) {
                        var bData = biset.getBindDataByBid(semBicIDs[i]);
                        if (bData["merged"] == false) {
                            mbicIDs.push(semBicIDs[i]);
                            mergeSet.push(bData);
                        }
                    }

                    for (var j = 0; j < mergeSet.length; j++) {
                        var thisBicID = mergeSet[j]["bicIDCmp"],
                            thisBicLeft = thisBicID + "_left",
                            thisBicRight = thisBicID + "_right",
                            thisBicFrame = thisBicID + "_frame";
                        // set this bic has been merged
                        mergeSet[j]["merged"] = true;

                        vis.setPathVisibilitybyClass(thisBicID, "hidden");
                        biset.bicVisible(thisBicID, "hidden");

                        avgYpos += mergeSet[j]["yPos"];

                        if (j == 0) {
                            // get the width unit of a bic
                            var thisBicLeftWidth = d3.select("#" + thisBicLeft).attr("width"),
                                thisBicRowNum = d3.select("#" + thisBicLeft).datum().rowEntNum,
                                bwidthUnit = thisBicLeftWidth / thisBicRowNum;
                        }

                        var thisRowEntIDs = biset.getBicEntsInRowOrCol(mergeSet[j], "row"),
                            thisColEntIDs = biset.getBicEntsInRowOrCol(mergeSet[j], "col");

                        lstEntCount(thisRowEntIDs, rowEntIDs);
                        lstEntCount(thisColEntIDs, colEntIDs);
                    }
                    avgYpos /= mergeSet.length;

                    var rEntNum = Object.keys(rowEntIDs).length,
                        cEntNum = Object.keys(colEntIDs).length;

                    var mbicData = biset.genMbicData(mbicIDs, mbicClass, startPos, startPos, avgYpos, rfield, cfield, rowEntIDs, colEntIDs, rEntNum, cEntNum, bNum, bwidthUnit);
                    var mergedBic = biset.addMergedBic("vis_canvas", mbicData);

                    // get min and max frequency
                    var rowEntFreq = [],
                        colEntFreq = [],
                        allEntFreq = [];
                    for (key in rowEntIDs)
                        rowEntFreq.push(rowEntIDs[key]["lFreq"]);
                    for (key in colEntIDs)
                        colEntFreq.push(colEntIDs[key]["lFreq"]);
                    allEntFreq = rowEntFreq.concat(colEntFreq);
                    var rmaxFreq = Array.max(rowEntFreq),
                        rminFreq = Array.min(rowEntFreq),
                        cmaxFreq = Array.max(colEntFreq),
                        cminFreq = Array.min(colEntFreq),
                        maxFreq = Array.max(allEntFreq),
                        minFreq = Array.min(allEntFreq);

                    for (key in rowEntIDs) {
                        var obj1 = d3.select("#" + key),
                            rlwRatio = rowEntIDs[key]["lFreq"],
                            rlType = rowEntIDs[key]["lType"],
                            lineObj = biset.addLink(obj1, mergedBic, biset.colors.lineNColor, canvas, mLineClass, rlwRatio, rlType);

                        mbicData.linkIDs.push(lineObj.lineID);
                        mbicData.linkObjs.push(lineObj);

                        connections[lineObj.lineID] = lineObj;
                    }

                    for (key in colEntIDs) {
                        var obj2 = d3.select("#" + key),
                            clwRatio = colEntIDs[key]["lFreq"],
                            clType = colEntIDs[key]["lType"],
                            lineObj = biset.addLink(mergedBic, obj2, biset.colors.lineNColor, canvas, mLineClass, clwRatio, clType);

                        mbicData.linkIDs.push(lineObj.lineID);
                        mbicData.linkObjs.push(lineObj);

                        connections[lineObj.lineID] = lineObj;
                    }
                    mergedBic.call(biset.objDrag);

                    addMenuToMbic(mbicClass);

                    // remove all sem circles
                    vis.svgRemovebyClass("semRange");
                });

            }
        }
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
