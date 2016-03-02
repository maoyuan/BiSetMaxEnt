/*
 * add menu to bics
 * @param bicCssClass, string, the css class of bic objects
 */
var addMenuToBic = function(bicCssClass) {
    // add contextmenu to bics
    $("." + bicCssClass).contextmenu({
        target: '#bic-context-menu',
        onItem: function(context, e) {

            var thisBicID = $(context).attr("id"),
                selItem = $(e.target).attr("data-index");

            if (selItem == "doc") {

                var relDocs = allBics[thisBicID].docs,
                    rType = allBics[thisBicID].rowField,
                    cType = allBics[thisBicID].colField,
                    rows = allBics[thisBicID].row,
                    cols = allBics[thisBicID].col;

                var docNames = {},
                    docNameIndex = [],
                    rNames = [],
                    cNames = [];

                var docNameStr = "",
                    rNameStr = "",
                    cNameStr = "";

                for (e in relDocs) {
                    docNameIndex.push(allDocs[relDocs[e]].docName);
                    docNames[allDocs[relDocs[e]].docName] = allDocs[relDocs[e]];
                    docNameStr += "<label class='btn btn-success btn-xs bicToDocLable' data-index='" + allDocs[relDocs[e]].docID + "'>" + allDocs[relDocs[e]].docName + "</label> &nbsp";
                }

                for (e in rows) {
                    var tmp = rType + "_" + rows[e];
                    rNames.push(allEnts[tmp].entValue);
                    rNameStr += allEnts[tmp].entValue + ", ";
                }

                for (e in cols) {
                    var tmp = cType + "_" + cols[e];
                    cNames.push(allEnts[tmp].entValue);
                    cNameStr += allEnts[tmp].entValue + ", ";
                }

                var docID = docNameIndex[0];
                for (e in docNames) {
                    if (docNames[e].bicNum > docNames[docNameIndex[0]].bicNum)
                        docID = e;
                }

                // update the document view
                biset.docViewReFresh(docID, docNames[e].docContent);

                // append the bicluster ID
                $("#bic_current_visit").html("Bicluster ID: " + allBics[thisBicID].bicID);

                // append related documents
                $("#bic_related_docs").html(docNameStr);

                // append related entities
                var tmpStr = rNameStr + cNameStr,
                    relEntNameStr = tmpStr.substr(0, tmpStr.length - 2);
                $("#bic_related_ents").html(relEntNameStr);

                // show document view
                if ($("#doc_vis").is(":hidden") == true) {
                    $("#doc_vis").slideToggle("slow");
                    // change the control icon
                    $("#doc_ctrl_icon").removeClass('glyphicon-folder-close');
                    $("#doc_ctrl_icon").addClass('glyphicon-remove-sign');
                }

                // add click event handler for doc labels on the left
                $(".bicToDocLable").click(function() {
                    var thisDocID = $(this).attr("data-index"), // e.g., DOC_1, DOC_12
                        thisDocName = allDocs[thisDocID].docName, // e.g., se5, fbi11
                        thisDocContent = allDocs[thisDocID].docContent;

                    biset.docViewReFresh(thisDocName, thisDocContent);
                });

                // add click event handler for each item in docID list
                biset.docViewUpdateByClick(".doc-list");
            }

            if (selItem == "selection") {
                console.log("bic selection switch");
            }

            if (selItem == "entMove") {
                console.log("move ent switch");
            }

            // user choose to do stepwise evaluations
            if (selItem == "modelEvaStep") {
                biset.bicStepModelEvaluate(thisBicID);
            }

            // user choose to full path evaluation
            if (selItem == "modelEvaPath") {
                biset.bicFullPathModelEvaluate(thisBicID);
            }

            // enable selection for this bic
            if (selItem == "selOn") {
                allBics[thisBicID].bicSelectOn = true;
            }
            // disable selection for this bic
            if (selItem == "selOff") {
                allBics[thisBicID].bicSelectOn = false;
            }

            if (selItem == "hide") {
                biset.setVisibility(thisBicID, "hidden");
                for (e in connections) {
                    if (e.indexOf(thisBicID) >= 0)
                        biset.setVisibility(e, "hidden");
                }
            }

            // hide the connected edges
            if (selItem == "hideLine") {
                for (e in connections) {
                    if (e.indexOf(thisBicID) >= 0)
                        biset.setVisibility(e, "hidden");
                }
            }

            // show connected edges
            if (selItem == "showLine") {
                for (e in connections) {
                    if (e.indexOf(thisBicID) >= 0)
                        biset.setVisibility(e, "visable");
                }
            }
        }
    });
}


/*
 * set checkbox to the a switch style
 * @param name, string, the name of the checkbox
 */
var setSwitchMenuItem = function(name) {
    $("[name='" + name + "']").bootstrapSwitch();
}


/*
 * set the mark selection in the bic menu
 * @param bicMenuID, string, the id of ctrl menu on bics
 * @param markCtrlName, string, the mark ctrl name
 */
var bicMenuMark = function(bicMenuID, markCtrlName) {
    $('#' + bicMenuID).on('show.bs.context', function(context, e) {

        var thisBicID = $(context.target).attr("id"),
            thisBicSelOption = allBics[thisBicID].bicSelectOn,
            thisBicData = biset.getBindDataByBid(thisBicID);
        thisBicData.bicMenuOnShow = true;

        // use a global array to maintain the bic whose menu is shown
        bicShowMenu.push(thisBicID);

        // set the switch for each bic
        if (thisBicSelOption == false) {
            $("[name='" + markCtrlName + "']").bootstrapSwitch('state', false, true);
        } else {
            $("[name='" + markCtrlName + "']").bootstrapSwitch('state', true, true);
        }

        $("input[name='" + markCtrlName + "']").on('switchChange.bootstrapSwitch', function(event, state) {
            allBics[thisBicID].bicSelectOn = state;
        });
    });

    $('#' + bicMenuID).on('hide.bs.context', function(context, e) {
        var thisBicID = bicShowMenu.pop(),
            thisBicData = biset.getBindDataByBid(thisBicID);
        thisBicData.bicMenuOnShow = false;

        // make sure the mouse is not on a bic
        if (bicOnMouseover.length == 0) {
            biset.bicMoutHandler(thisBicData, relations, entPathCaled);
        }
    });
}


/*
 * set the switch widget in the bic menu
 * @param bicMenuID, string, the id of ctrl menu on bics
 * @param ctrlName, string, the mark ctrl name
 * @param field, string, the field in the bic data
 */
var bicMenuSwitch = function(bicMenuID, ctrlName, field) {
    $('#' + bicMenuID).on('show.bs.context', function(context, e) {
        var thisBicID = $(context.target).attr("id"),
            thisBicMoveEntOption = allBics[thisBicID][field];

        if (thisBicMoveEntOption == false) {
            $("[name='" + ctrlName + "']").bootstrapSwitch('state', false, true);
        } else {
            $("[name='" + ctrlName + "']").bootstrapSwitch('state', true, true);
        }

        $("input[name='" + ctrlName + "']").on('switchChange.bootstrapSwitch', function(event, state) {
            allBics[thisBicID][field] = state;
        });
    });
}
