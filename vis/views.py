from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, Http404
from django.template.response import TemplateResponse
from sets import Set
import json
from django.db import connection
from django.conf import settings
from vis.models import Vis, VisNodes
from projects.models import Project, Collaborationship
from django.contrib.auth.decorators import login_required
from django.utils import timezone

# import the binary model
from MaxEnt import MaxEnt
import MaxEntMV
import maxent_utils, numpy as np

import pickle

# global variables to find path of a certain entity
networkData = {}
entPathCaled = set()
entPathLinkedEnts = {}
entPathLinkedLinks = {}

# initialize the maxent model as a global variable
initialRowNum = 3
initialColNum = 3
# initial the object for binary model
obj_maxent = MaxEnt(initialRowNum, initialColNum)

'''
Initial preparation for the real-valued model
'''
# the initial transaction matrix for real value model
# initDocNum = 4
# initEntNum = 7
# initThreshold = 0.001
# np_trans = np.zeros((initDocNum, initEntNum))
# obj_maxentmv = MaxEntMV.maxent_mv(initDocNum, initEntNum, initThreshold)

# a global variable for all doc IDs
gDocIDList = []
# a glabal variable for all docIDs + each entID + ent fequency as python tiles
glist_colTiles = []
# a global variable for indiviual docID + domain based entIDs + ent frequency as python tiles 
glist_rowTiles = []
# a global variable for all docIDs + all EntIDs in each domain + total frequency
glist_domainTile = []
# a global dictionray to store all entity ids for each domain
gEntIDsDict = {}
# a dictionary to store all ents for each doc
gdict_transactions = {}
# a global dictionary to store all bics with their entity ids
gbic_dictionary = {}


glist_colTiles_real = []
glist_rowTiles_real = []
glist_domainTiles_real = []

gJaccard_index_threshold = 0.1

@login_required 
def analytics(request):
    '''
    This is visualization page. 
    @param request: the Django HttpRequest object
    '''
    theUser = request.user
    previousVisList = []
    pid = 0
    if 'selected_project_id' in request.session:
        pid =  request.session['selected_project_id']
        # Load visList
        previousVisList = getVisListFromDB(pid)
    
    '''
    myProjects =  Project.objects.filter(user = theUser)
    
    privateProjects = []
    pCount = 0
    for item in myProjects:
        thisProject = {}
        thisProject['id'] = item.id
        thisProject['name'] = item.name
        thisProject['dataset'] = item.dataset        
        privateProjects.append(item)
        pCount += 1
    '''
        
    # Load the total number of projects for the user
    collaborationShip = Collaborationship.objects.filter(user = theUser, is_deleted = '0')
    my_projects_queryset = Project.objects.filter(user = theUser, is_deleted = '0')
    
    # Calculate the number of projects for the user
    project_set = set()
    shared_projects = []
    count = 0 
    
    try:
        for item in my_projects_queryset:
            if not item.id in project_set:
                project_set.add(item.id)
                count += 1
        
        for item in collaborationShip:
            if not item.project.id  in project_set:
                if not item.project.is_deleted:
                    project_set.add(item.project.id)
                    shared_projects.append(item.project)
                    count += 1
                
    except Exception as e:
        return HttpResponse(e)
    print previousVisList
    context = {'active_tag': 'analytics', 'BASE_URL':settings.BASE_URL, 'projects':my_projects_queryset,'shareProjects':shared_projects, 'pCount': count ,'prePid':pid ,'preVisList':previousVisList}
    #return TemplateResponse(request, 'vis/index.html', context)
    return render(request, 'vis/index.html', context)

@login_required
def loadVisList(request):
    '''
    Loading private projects. Returns the private projects for the loggin user.
    @param request: Django http request
    '''        
    
    theUser = request.user    
    requestJson = json.loads(request.body)
    project_id = requestJson['project_id']
    # Remember user's selection
    request.session['selected_project_id'] = project_id
    return HttpResponse(json.dumps(getVisListFromDB(project_id)))
 
def getVisListFromDB(project_id):  
    
    theVisList =  Vis.objects.filter(project = project_id).order_by('create_time')
    
    visList = []
    for item in theVisList:
        thisVis = {}
        thisVis['id'] = item.id        
        thisVis['vis_name'] = item.name
        thisVis['create_time'] = str(item.create_time)     
        visList.append(thisVis)
    return visList
    
 
@login_required     
def addVisConfig(request):
    '''
    Creating a visualization for "POST" request.
    Returning list and bisets json.
    @param request: Django http request
    '''
    try:
        # Loading front end data
        requestJson = json.loads(request.body)
        
        theUser = request.user
        project_id = requestJson['project_id']
        visconfigName = requestJson['vis_name']
        theProject = get_object_or_404(Project, pk = project_id)
        
        
        # Only the project creator, super user can delete the project
        has_permission = theProject.is_creator(theUser) or theProject.is_collaborator(theUser) or theUser.is_superuser
        
        if not has_permission:
            raise Http404

        
        personField = 0
        locationField = 0
        phoneField = 0
        dateField = 0
        orgField = 0
        miscField = 0
        
        listNames = []
        if 'person' in requestJson:
            personField = 1
            listNames.append("person")
        if 'location' in requestJson:
            locationField = 1
            listNames.append("location")
        if 'phone' in requestJson:
            phoneField = 1       
            listNames.append("phone")            
        if 'date' in requestJson:
            dateField = 1
            listNames.append("date")
        if 'org' in requestJson:
            orgField = 1
            listNames.append("org")
        if 'misc' in requestJson:
            miscField = 1
            listNames.append("misc")
            
        lstsBisetsJson = getLstsBisets(listNames)
        
        newVis = Vis(user = theUser, project = theProject, name = visconfigName, personIn = personField, locationIn = locationField, phoneIn = phoneField, dateIn = dateField, orgIn = orgField, miscIn = miscField, create_time = timezone.now())
            
        newVis.save()
        
        thisVis = {}
        thisVis['id'] = newVis.id        
        thisVis['vis_name'] = newVis.name
        thisVis['create_time'] = str(newVis.create_time)
        
        lstsBisetsJson['vis'] = thisVis
        
        responseJson = {"status": "success"}
    except Exception as e:
        responseJson = {"status": "error"}    
        
    return HttpResponse(json.dumps(lstsBisetsJson))
    
@login_required 
def saveVis(request):
    '''
    Handling vis saving request to save a vis to database.
    @param request: the Django HttpRequest object
    '''
    # Loading front end data
    requestJson = json.loads(request.body)
    
    theUser = request.user
    project_id = requestJson['project_id']
    theProject = get_object_or_404(Project, pk = project_id)
    
    # Only the project creator, super user can delete the project
    has_permission = theProject.is_creator(theUser) or theProject.is_collaborator(theUser) or theUser.is_superuser
    
    if not has_permission:
        raise Http404
    
    visID = requestJson['vis_id']
    
    rawNodes = requestJson['highlight_ent']
    
    toUpdate = []
    for item in rawNodes:
        nodeArr = item.split('_')
        tmp = {}
        tmp['nodeType'] = nodeArr[0]
        tmp['nodeId'] = nodeArr[1]
        toUpdate.append(tmp)
        
   
        
    # get the lists names of the vis
    listNames = []
    theVis = Vis.objects.get(id = visID)
    
    oldSelectedNodes = VisNodes.objects.filter(vis = theVis)
    
    # Checking which records should be added and removed
    for oldItem in oldSelectedNodes:
        
        isExist = False
        for newItem in toUpdate:
            if oldItem.nodeType == newItem['nodeType'] and oldItem.nodeId == newItem['nodeId'] and oldItem.modifyBy == theUser:
                newItem['nodeType'] = "exist"
                isExist = True
                break;
        # delete the record from database if the node was unhighlighted
        if not isExist:
            oldItem.delete();
    
    # Adding new highlighted nodes
    for newItem in toUpdate:
        if not newItem['nodeType'] == "exist":
            newVisNode = VisNodes(vis = theVis, nodeType = newItem['nodeType'], nodeId = newItem['nodeId'], modifyBy = theUser)
            newVisNode.save()
    
    responseJson = {"status": "success"}
    
    return HttpResponse(json.dumps(responseJson))
    
@login_required 
def deleteVis(request):
    '''
    Deleting a visualization
    @param request: Django http request
    '''
    try:
        # Loading front end data
        requestJson = json.loads(request.body)
        
        theUser = request.user
        project_id = requestJson['project_id']
        theProject = get_object_or_404(Project, pk = project_id)
        
        
        
        # Only the project creator, super user can delete the project
        has_permission = theProject.is_creator(theUser) or theProject.is_collaborator(theUser) or theUser.is_superuser
        
        if not has_permission:
            raise Http404
            
        visID = requestJson['vis_id']
        
        # Deleting all highlighted nodes
        nodesToDelete = VisNodes.objects.filter(vis = visID)
        
        for toDelete in nodesToDelete:
            toDelete.delete()
            
        # Deleting record from vis table
        theVis = Vis.objects.get(id = visID)
        theVis.delete()
        
        responseJson = {"status": "success"}
        
    except Exception as e:
        responseJson = {"status": "error"}
    
    return HttpResponse(json.dumps(responseJson))
    
@login_required    
def loadVis(request):
    '''
    Loading a saved vis. Returning a json object.
    @param request: the Django HttpRequest object
    '''
    # Loading front end data
    requestJson = json.loads(request.body)
    
    theUser = request.user
    project_id = requestJson['project_id']
   
    theProject = get_object_or_404(Project, pk = project_id)
    
    # all the following variables used as global variables
    global gDocIDList
    global glist_colTiles
    global glist_rowTiles
    global glist_domainTile
    global gEntIDsDict
    global gdict_transactions
    global gbic_dictionary

    global np_trans
    global glist_colTiles_real
    global glist_rowTiles_real
    global glist_domainTiles_real
    
    # Only the project creator, super user can delete the project
    has_permission = theProject.is_creator(theUser) or theProject.is_collaborator(theUser) or theUser.is_superuser
    
    if not has_permission:
        raise Http404
    # get the lists names of the vis    
    visID = requestJson['vis_id']
    listNames = []
    theVis = Vis.objects.get(id = visID)
    if theVis.personIn:
        listNames.append("person")
    if theVis.locationIn:
        listNames.append("location")
    if theVis.phoneIn:
        listNames.append("phone")
    if theVis.dateIn:
        listNames.append("date")
    if theVis.orgIn:
        listNames.append("org")
    if theVis.miscIn:
        listNames.append("misc")
    
    
    lstsBisetsJson = getLstsBisets(listNames)  
    
    selectedNodes = VisNodes.objects.filter(vis = visID)
    
    lstsBisetsJson["highlight_ent"] = {}
    
    for item in selectedNodes:
        identity = str(item.nodeType) + "_" + str(item.nodeId)
        lstsBisetsJson["highlight_ent"][identity] = \
            {"nodeType": item.nodeType, "nodeID": item.nodeId}   
    
    # connections between entities and bics
    lstsBisetsJson["relNetwork"] = {}
    # relevant docs for entities and bics
    lstsBisetsJson["relatedDocs"] = {}
    # all links
    lstsBisetsJson["links"] = {}
    # all docs
    lstsBisetsJson["docs"] = {}
    # all origial relations in the dataset
    lstsBisetsJson["oriRelations"] = getLstsRelations(listNames)
    # origial relations reduced replicate ones in the dataset
    lstsBisetsJson["oriRelationsReduced"] = getReducedLstsRelations(listNames)

    # use this relationship parameter as global
    global networkData
    networkData = lstsBisetsJson["relNetwork"]

    relDocs = lstsBisetsJson["relatedDocs"]
    links = lstsBisetsJson["links"]
    docs = lstsBisetsJson["docs"]

    relations = lstsBisetsJson["oriRelations"]

    oriRelDict = {}
    for rel in relations:
        if not rel["oriLinkID"] in oriRelDict:
            tmpLinkDocList = []
            tmpLinkDocList.append(rel["docID"])
            oriRelDict[rel["oriLinkID"]] = tmpLinkDocList
        else:
            tmpList = oriRelDict[rel["oriLinkID"]]
            tmpList.append(rel["docID"])
            oriRelDict[rel["oriLinkID"]] = tmpList

    linkName = Set()


    bics = lstsBisetsJson["bics"]
    lists = lstsBisetsJson["lists"]



    # get data from global entity id table
    cursor = connection.cursor()
    sql_str = "SELECT * FROM datamng_globalentid"
    cursor.execute(sql_str)
    gEntID_table_rows = cursor.fetchall()
    
    domainList = []
    domainIDShift = {}
    # get a list of domains and the global id of their entities
    for row in gEntID_table_rows:
        domainList.append(row[1])
        domainIDShift[row[1]] = row[4]

    # add all bic with its entities in the dictionary
    for bic in bics:
        tmpArray = []
        rowType = bics[bic]["rowField"]
        colType = bics[bic]["colField"]
        rows = bics[bic]["row"]
        cols = bics[bic]["col"]

        bicID = rowType + "_" + colType + "_bic_" + str(bics[bic]["bicID"])

        gbic_dictionary[bicID] = {}
        gbic_dictionary[bicID]["id"] = str(bics[bic]["bicID"])
        gbic_dictionary[bicID]["rowType"] = rowType
        gbic_dictionary[bicID]["colType"] = colType

        gbic_dictionary[bicID]["rowEntIDs"] = set()
        gbic_dictionary[bicID]["colEntIDs"] = set()

        gbic_dictionary[bicID]["relRowEntIDs"] = set()
        gbic_dictionary[bicID]["relColEntIDs"] = set()

        # get all row id
        for row in rows:
            rowID = str(rowType) + "_" + str(row)
            tmpArray.append(rowID)
            if rowID > bicID:
                tmpLinkName = rowID + "__" + bicID
            else:
                tmpLinkName = bicID + "__" + rowID
            linkName.add(tmpLinkName)

            rowEntID = int(row) + domainIDShift[str(rowType)]
            gbic_dictionary[bicID]["rowEntIDs"].add(rowEntID)
            gbic_dictionary[bicID]["relRowEntIDs"].add(int(row))

        for col in cols:
            colID = str(colType) + "_" + str(col)
            tmpArray.append(colID)
            if colID > bicID:
                tmpLinkName = colID + "__" + bicID
            else:
                tmpLinkName = bicID + "__" + colID
            linkName.add(tmpLinkName)

            colID = int(col) + domainIDShift[str(colType)]
            gbic_dictionary[bicID]["colEntIDs"].add(colID)
            gbic_dictionary[bicID]["relColEntIDs"].add(int(col)) 

        # get a list of docs for a bic
        tmpDocList = Set()
        for rs in rows:
            rowID = str(rowType) + "_" + str(rs)
            for cs in cols:
                colID = str(colType) + "_" + str(cs)
                if (rowID > colID):
                    tmpID = rowID + "__" + colID
                else:
                    tmpID = colID + "__" + rowID

                if tmpID in oriRelDict:
                    for e in oriRelDict[tmpID]:
                        tmpDocList.add(e)
        bics[bic]['docs'] = list(tmpDocList)

        networkData[bicID] = tmpArray

    # all all entities with their bics in the dictionary
    for lst in lists:
        listType = lst["listType"]
        entities = lst["entities"]
        rType = lst["rightType"]
        lType = lst["leftType"]
        for ent in entities:
            entityID = str(listType) + "_" + str(ent["entityID"])
            leftBics = ent["bicSetsLeft"]
            rightBics = ent["bicSetsRight"]
            tmpArray = []
            if len(leftBics) != 0:
                for lbic in leftBics:
                    thisbicID = lType + "_" + listType + "_bic_" + str(lbic)
                    tmpArray.append(thisbicID)
                    if entityID > thisbicID:
                        tmpLinkName = entityID + "__" + thisbicID
                    else:
                        tmpLinkName = thisbicID + "__" + entityID
                    linkName.add(tmpLinkName)

            if len(rightBics) != 0:
                for rbic in rightBics:
                    thisbicID = listType + "_" + rType + "_bic_" + str(rbic)
                    tmpArray.append(thisbicID)
                    if entityID > thisbicID:
                        tmpLinkName = entityID + "__" + thisbicID
                    else:
                        tmpLinkName = thisbicID + "__" + entityID
                    linkName.add(tmpLinkName)

            if len(tmpArray) != 0:
                networkData[entityID] = tmpArray

    # get data from doc table
    cursor = connection.cursor()
    sql_str = "SELECT * FROM datamng_docname"       
    cursor.execute(sql_str)
    doc_table_rows = cursor.fetchall()

    # generate objects for doc
    for row in doc_table_rows:
        thisDocID = "Doc_" + str(row[0])
        docs[thisDocID] = {}
        docs[thisDocID]["docID"] = thisDocID
        docs[thisDocID]["docName"] = row[1]
        docs[thisDocID]["docContent"] = row[3]
        docs[thisDocID]["bicRelevent"] = {}
        docs[thisDocID]["bicNum"] = 0

        gDocIDList.append(int(row[0]) - 1)

    # get relevent bics for each doc
    for bic in bics:
        thisDocList = bics[bic]["docs"]
        for doc in thisDocList:
            docs[doc]["bicNum"] += 1
            if not bic in docs[doc]["bicRelevent"]:
                docs[doc]["bicRelevent"][bic] = bics[bic]

    # generate index of bic based on the number of its ents
    tBicNum = []
    for key, val in docs.iteritems():
        tBicNum.append(val)

    docList = sorted(tBicNum, key=lambda k: k['bicNum'], reverse=True)

    docIndex = 0
    for doc in docList:
        doc['index'] = docIndex
        docIndex += 1


    for lk in linkName:
        links[lk] = { "linkID": lk, "linkNumCoSelected": 0, "linkDisplayed": True }

    
    # use Hao's surprising model to rank bicluster
    obj_maxent = MaxEnt(4, 7)

    # initialize the dictionary
    for dID in gDocIDList:
        gdict_transactions[dID] = set()

    for d in domainList:
        cursor = connection.cursor()
        sql_str = "SELECT * FROM datamng_" + d
        cursor.execute(sql_str)
        ent_table_rows = cursor.fetchall()

        gEntIDsDict[d] = []

        for row in ent_table_rows:
            tmpDocToEnt = []
            tmpDocEntToFreq = []
            tmpID = []
            tmpDocToEnt.append(gDocIDList)

            tmpID.append(int(row[0]) + domainIDShift[d])
            tmpDocToEnt.append(tmpID)

            gEntIDsDict[d].append(int(row[0]) + int(domainIDShift[d]))

            tmpDocEntToFreq.append(tmpDocToEnt)
            tmpDocEntToFreq.append(int(row[2]))

            glist_colTiles.append(tmpDocEntToFreq)


        tmpDocFreq = {}
        for dID in gDocIDList:
            tmpDocFreq[dID] = 0

        sql_str = "SELECT * FROM datamng_" + d + "doc"
        cursor.execute(sql_str)
        entdoc_table_rows = cursor.fetchall()

        # total frequency for all entities in each domain
        tmpTotalFre = 0
        
        for row in entdoc_table_rows:
            if d == 'person' or d == 'date':
                ind = int(row[2]) - 1
                entID = int(row[1]) + domainIDShift[d]
            else:
                ind = int(row[1]) - 1
                entID = int(row[2]) + domainIDShift[d]

            tmpDocFreq[ind] += 1
            tmpTotalFre += 1

            gdict_transactions[ind].add(entID)


        for docID in gDocIDList:
            tmp1 = []
            tmp2 = []
            tmp3 = []

            tmp1.append(docID)
            tmp2.append(tmp1)
            tmp2.append(gEntIDsDict[d])

            tmp3.append(tmp2)
            tmp3.append(tmpDocFreq[docID])

            glist_rowTiles.append(tmp3)

        tmpDocIdsEntIds = []
        tmpDocsEntsFreq = []

        tmpDocIdsEntIds.append(gDocIDList)
        tmpDocIdsEntIds.append(gEntIDsDict[d])

        tmpDocsEntsFreq.append(tmpDocIdsEntIds)
        tmpDocsEntsFreq.append(tmpTotalFre)

        glist_domainTile.append(tmpDocsEntsFreq)

    # total number of entity
    totalEntity = 0
    totalDocs = len(gDocIDList)
    for e in gEntIDsDict:
        totalEntity += len(gEntIDsDict[e])


    #====================================================

    np_trans = np.zeros((totalDocs, totalEntity))

    # search all tables to generate the edge matrix
    for d in domainList:
        cursor = connection.cursor()
        sql_str = "SELECT * FROM datamng_" + d + "doc"
        cursor.execute(sql_str)
        entdoc_table_rows = cursor.fetchall()

        for row in entdoc_table_rows:
            if d == 'person' or d == 'date':
                docID = int(row[2]) - 1
                entID = int(row[1]) + domainIDShift[d]
            else:
                docID = int(row[1]) - 1
                entID = int(row[2]) + domainIDShift[d]

            np_trans[docID, entID] = float(row[3])
    # normalize the value in this matrix
    np_trans = np_trans / np.amax(np_trans)

    # prepare three required tiles
    for e in range(0, totalEntity):
        tmp_row = []
        tmp_row_out = []

        cur_id = []
        cur_id.append(e)

        cur_col = np_trans[:,e]
        cur_col_list = []

        cur_col_sum = 0
        cur_col_square_sum = 0
        for val in cur_col:
            tmp_val = []
            tmp_val.append(val)
            cur_col_list.append(tmp_val)

            cur_col_sum += val
            cur_col_square_sum += val * val

        tmp_row.append(gDocIDList)
        tmp_row.append(cur_id)
        tmp_row.append(cur_col_list)

        tmp_row_out.append(tmp_row)
        tmp_row_out.append(cur_col_sum)
        tmp_row_out.append(cur_col_square_sum)

        glist_colTiles_real.append(tmp_row_out)


    for d in domainList:
        cur_ent_list = gEntIDsDict[d]
        stat_ent_id = cur_ent_list[0]
        end_ent_id = cur_ent_list[len(cur_ent_list) - 1]

        for e in gDocIDList:
            tmp_row = []
            tmp_row_out = []

            cur_doc = []
            cur_doc.append(e)

            tmp_row.append(cur_doc)
            tmp_row.append(cur_ent_list)

            cur_matrix_row = np_trans[e:e+1, stat_ent_id:end_ent_id + 1]

            tmp_row.append(cur_matrix_row.tolist())

            cur_matrix_sum = cur_matrix_row.sum()
            cur_matrix_square_sum = np.sum(map(lambda x: x*x, cur_matrix_row))

            tmp_row_out.append(tmp_row)
            tmp_row_out.append(cur_matrix_sum)
            tmp_row_out.append(cur_matrix_square_sum)

            glist_rowTiles_real.append(tmp_row_out)    


    for d in domainList:
        cur_ent_list = gEntIDsDict[d]
        stat_ent_id = cur_ent_list[0]
        end_ent_id = cur_ent_list[len(cur_ent_list) - 1]

        tmp_row = []
        tmp_row_out = []

        tmp_row.append(gDocIDList)
        tmp_row.append(cur_ent_list)

        cur_submatrix = np_trans[:,stat_ent_id:end_ent_id + 1]
        tmp_row.append(cur_submatrix.tolist())

        tmp_row_out.append(tmp_row)

        cur_submatrix_sum = cur_submatrix.sum()
        cur_submatrix_square_sum = np.sum(map(lambda x: x*x, cur_submatrix))

        tmp_row_out.append(cur_submatrix_sum)
        tmp_row_out.append(cur_submatrix_square_sum)

        glist_domainTiles_real.append(tmp_row_out)

    
    '''
    save data to disc for the real-valued model 
    '''
    # use pickle to serialize the object to a file
    # pickle.dump(glist_colTiles_real, open("list_colTiles.txt", "w"))
    # pickle.dump(glist_rowTiles_real, open("list_rowTiles.txt", "w"))
    # pickle.dump(glist_domainTiles_real, open("list_domainTiles.txt", "w"))
    # pickle.dump(np_trans, open("np_trans.txt", "w"))

    # load the serialized object from a file
    # obj1 = pickle.load(open("list_colTiles.txt", "r"))
    # obj2 = pickle.load(open("list_rowTiles.txt", "r"))
    # obj3 = pickle.load(open("list_domainTiles.txt", "r"))
    # obj4 = pickle.load(open("np_trans.txt", "r"))

    #==============================================================

    # global obj_maxentmv
    # obj_maxentmv = MaxEntMV.maxent_mv(totalDocs, totalEntity, 0.001)

    # obj_maxentmv.add_background_tiles(glist_colTiles_real)
    # obj_maxentmv.add_background_tiles(glist_rowTiles_real)
    # obj_maxentmv.add_background_tiles(glist_domainTiles_real)

    # obj_maxentmv.train_maxent(0.001, 1000)


    '''
    Below: an example to evaluate a bicluster
    '''
    # set_rowID = set([29,21,36])
    # set_colID = set([102,103])

    # list_biTiles = maxent_utils.convert2TileListReal(np_trans, set_rowID, set_colID)
    # print("===================================")

    # f_global = obj_maxentmv.evaluate_biTiles(list_biTiles, "global")
    # f_local = obj_maxentmv.evaluate_biTiles(list_biTiles, "local")
    # print "The global score: " + str(f_global)
    # print("===================================")

    # obj_maxentmv.update_maxent(list_biTiles)
    # print("model update!")
    # print("===================================")
    '''
    END: an example to evaluate a bicluster
    '''


    # re-initialize the MaxEnt model, details from Hao Wu
    # train the background binary maxent model
    '''
    Create a binary maxent model object with the constructor MaxEnt(NRow, NCol).
    Here, NRow and NCol are number of rows and columns of the doc-entity
    transaction matrix.
    '''
    global obj_maxent 
    obj_maxent = MaxEnt(totalDocs, totalEntity)
    
    '''
    Add the background tiles list_colTiles, list_rowTiles and list_domainTiles
    into the binary MaxEnt model by calling its member function
    add_background_tiles.
    '''
    obj_maxent.add_background_tiles(glist_colTiles)
    obj_maxent.add_background_tiles(glist_rowTiles)
    obj_maxent.add_background_tiles(glist_domainTile)

    '''
    Call MaxEnt model's member function train_maxent(thresh, maxiter) to infer
    the background MaxEnt model.
    Arguments:
        thresh - the threshold for the model inferring algorithm to stop. The
                 default value is 0.01
        maxiter - the maximum allowed iteration for the model inference
                  algorithm. The default value is 100000.
    '''
    obj_maxent.train_maxent(0.001, 10000)

    '''
    In the toy dataset, we can easily derive that in the Person-Orginiaztion
    entity-entity relation, there exists the following entity-entity bicluster:
    ---------------------------
    |          | Nasdaq | CNN |
    ---------------------------
    | Robinson |    1   |  1  |
    | Grant    |    1   |  1  |
    ---------------------------
    To convert this entity-entity bicluster into a set of tiles over the
    doc-entity transaction matrix, we call the following function in
    maxent_utils.py:
        convert2TileListEachPair(dict_transactions, set_rowID, set_colID)

    Here, dict_transactions is a python dict with document IDs as key and a
    python set of entity IDs this document contains as value. set_rowID and
    set_colID are python sets that contains row entity IDs and column entity IDs
    of the entity-entity bicluster.

    In our toy example dataset, the dict_transactions would be:
    '''
    # dict_transactions = {0:set([0,1]), \
    #                      1:set([0,1,3,4]),\
    #                      2:set([3,4,5]),\
    #                      3:set([2,6])\
    #                     }
    '''
    The set_rowID and set_colID for the entity-entity bicluster are:
    '''
    # set_rowID = set([29,21,36])
    # set_colID = set([102,103])

    # list_biTiles1 = maxent_utils.convert2TileListEachPair(dict_transactions, \
    #         set_rowID, set_colID)

    # f_global1 = obj_maxent.evaluate_biTiles(list_biTiles1, "global")
    # print(f_global1)

    # obj_maxent.update_maxent(list_biTiles1)

    # bic1_rowID = set([17, 18, 19])
    # bic1_colID = set([54, 94, 98, 99])

    # bic2_rowID = set([53, 54, 56, 57])
    # bic2_colID = set([156, 158])

    # biTiles1 = maxent_utils.convert2TileListEachPair(dict_transactions, \
    #         bic1_rowID, bic1_colID)

    # biTiles2 = maxent_utils.convert2TileListEachPair(dict_transactions, \
    #         bic2_rowID, bic2_colID)

    # list_biTiles2 = biTiles1 + biTiles2
    # f_global2 = obj_maxent.evaluate_biTiles(list_biTiles2, "global")
    # print(f_global2)

    '''
    To evaluate this bicluster with binary MaxEnt model, we call the member
    function:
        evaluate_biTiles(py_tiles, str_option, thresh, maxiters)

    py_tiles - the list of tiles that represents the entity-entity bicluster,
               which is returned by maxent_utils.convert2TileListEachPair function.
    str_option - the evaluation score to use, either "global" or "local"
    thresh & maxiter - the same with the arguments in member function
                       train_maxent()
    '''
    # f_global = obj_maxent.evaluate_biTiles(list_biTiles, "global")
    # f_local = obj_maxent.evaluate_biTiles(list_biTiles, "local")
    # print "The global score is: " + str(f_global)
    # print "The local score is: " + str(f_local)

    # obj_maxent.update_maxent(list_biTiles)

    # get the inital evaluated score for each bic
    # initBicScore = bicsEval(gbic_dictionary, gdict_transactions, obj_maxent)

    return HttpResponse(json.dumps(lstsBisetsJson))


''' 
load the MaxEnt model based on user selection
    @param request, the user selected bic ID
    @return the surprising score based on the maxEnt model
'''
def loadMaxEntModelStep(request):
    # get the request from front end
    rq = json.loads(request.body)
    searchterm = rq['query']

    global obj_maxent
    # global obj_maxentmv
    global gbic_dictionary
    global gdict_transactions

    thisBicRowIDs = gbic_dictionary[searchterm]["rowEntIDs"]
    thisBicColIDs = gbic_dictionary[searchterm]["colEntIDs"]

    '''
    START: this section is the evaluation based on binary model
    '''
    thisBicTiles = maxent_utils.convert2TileListEachPair(gdict_transactions, thisBicRowIDs, thisBicColIDs)

    # update the model with current select bicluster
    obj_maxent.update_maxent(thisBicTiles)

    # check the jaccard coefficient for each bicluster
    overlappedBics = {}
    global gJaccard_index_threshold
    for b in gbic_dictionary:
        jIndex = jacIndex(searchterm, b, gbic_dictionary)
        if jIndex > gJaccard_index_threshold:
            print(jIndex)
            overlappedBics[b] = gbic_dictionary[b]

    # evaluate all bics based on the update knowledge
    # bicScore = bicsEval(gbic_dictionary, gdict_transactions, obj_maxent)

    # evaluate only bics that shared entities with current selected one 
    bicScore = bicsEval(overlappedBics, gdict_transactions, obj_maxent)

    resultDict = {}
    if len(bicScore) > 0:
        resultDict["msg"] = "success"
        resultDict["bicScore"] = bicScore
    else:
        resultDict["msg"] = "fail"
        resultDict["bicScore"] = {}
    resultDict["curBicID"] = searchterm
    '''
    END: Binary model section 
    '''


    '''
    START: real-valued model evaluation
    '''
    # list_biTiles = maxent_utils.convert2TileListReal(np_trans, thisBicRowIDs, thisBicColIDs)
    # f_global = obj_maxentmv.evaluate_biTiles(list_biTiles, "global")
    # obj_maxentmv.update_maxent(list_biTiles)

    # resultDict = {}
    # if len(bicScore) > 0:
    # resultDict["msg"] = "success"
    # resultDict["bicScore"] = f_global
    # else:
    #     resultDict["msg"] = "fail"
    #     resultDict["bicScore"] = {}
    '''
    END: real-valued model evaluation
    '''

    return HttpResponse(json.dumps(resultDict), content_type = "application/json")



''' 
load the MaxEnt model based on user selection
    @param request, the user selected bic ID
    @return the surprising score based on the maxEnt model
        for the full paths
'''
def maxEntModelFullPath(request):
    # get the request from front end
    rq = json.loads(request.body)
    searchterm = rq['query']

    global obj_maxent
    # global obj_maxentmv
    global gbic_dictionary
    global gdict_transactions
    global gJaccard_index_threshold

    global networkData
    global entPathCaled

    relInfo = findAllCons(searchterm, networkData, entPathCaled)
    entsInPath = relInfo["ents"]


    # print(searchterm)
    # print(entsInPath)

    # a dictionary of bics on paths by types
    bicTypedDict = {}
    for e in entsInPath:
        entType = getKeyfromNode(e)
        if "_" in entType:
            if bicTypedDict.has_key(entType) == False:
                bicTypedDict[entType] = []
            bicTypedDict[entType].append(e)
    
    curBicType = getKeyfromNode(searchterm)

    print("CURRENT: " + searchterm)

    depthSearch(searchterm, networkData)

    # print(bicTypedDict)

    # # bicsToEvaluate = {}
    # for bType in bicTypedDict:
    #     curBicGroup = bicTypedDict[bType]
    #     bicsToEvaluate = {}

    #     print(bType)
    #     print(curBicType)
    #     print(bType != curBicType)

    #     if bType != curBicType:
    #         for bic in curBicGroup:
    #             print(bic)
    #             jIndex = jacIndex(searchterm, bic, gbic_dictionary)
    #             print(jIndex)
    #             if jIndex > gJaccard_index_threshold:
    #                 bicsToEvaluate[bic] = gbic_dictionary[bic]




    # print(bicTypedDict)


    resultDict = {}
    resultDict["msg"] = "success"

    return HttpResponse(json.dumps(resultDict), content_type = "application/json")



'''
calculate the jaccard index for a two given bics
    @param bic1, the ID of the 1st biclsuter
    @param bic2, the ID of the 2nd bicluster
    @param bicDict, the dictionary of all bics with IDs as keys
'''
def jacIndex(bic1, bic2, bicDict):
    bic1_entIDs = bicDict[bic1]["rowEntIDs"].union(bicDict[bic1]["colEntIDs"])
    bic2_entIDs = bicDict[bic2]["rowEntIDs"].union(bicDict[bic2]["colEntIDs"])

    intersectionEntIDs = bic1_entIDs.intersection(bic2_entIDs)
    unionEntIDs = bic1_entIDs.union(bic2_entIDs)

    jaccard_index = float(len(intersectionEntIDs)) / float(len(unionEntIDs))

    return jaccard_index


'''
evaulate all bics with MaxEnt model and order the score
    @param bicDict, the dictionary contains all bics
    @param tranDict, the dictionary contains all transactions
    @param modelObj, the maxEnt model object
    @return sorted_bic_score, a dictionary contains score for all bics
'''
def bicsEval(bicDict, tranDict, modelObj):
    bic_score = {}
    for b in bicDict:
        set_rowID = bicDict[b]["rowEntIDs"]
        set_colID = bicDict[b]["colEntIDs"]

        list_biTiles = maxent_utils.convert2TileListEachPair(tranDict, set_rowID, set_colID)

        # f_local = modelObj.evaluate_biTiles(list_biTiles, "local")
        f_global = modelObj.evaluate_biTiles(list_biTiles, "global")

        # bic_score[b] = {}
        # bic_score[b]['local_score'] = f_local
        # bic_score[b]['global_score'] = f_global

        bic_score[b] = f_global

    # sorted_bic_score = sorted(bic_score.items(), key=lambda x: x[1]['global_score'])
    # sorted_bic_score = sorted(bic_score.items(), key=lambda x: x[1])

    return bic_score



def depthSearch(bicID, consDict):

    thisBicType = getKeyfromNode(bicID)

    type1 = thisBicType.split("_")[0]
    type2 = thisBicType.split("_")[1]

    pathLeft = getHalfPath(type1, consDict, bicID)
    pathRight = getHalfPath(type2, consDict, bicID)


    print("=====DICT=====")
    for p in pathRight:
        print(p)

def getHalfPath(direction, consDict, bicID):
    bicTypeSet = set()
    entTypeSet = set()

    thisBicType = getKeyfromNode(bicID)
    bicTypeSet.add(thisBicType)

    thisBicEnts = consDict[bicID]

    entStack = []
    for e in thisBicEnts:
        if getKeyfromNode(e) == direction:
            entStack.append(e)
    entTypeSet.add(direction)
    
    bicSet = set()
    path = []
    pathDict = {}

    curPath = []
    curPath.append(bicID)

    curPathKey = bicID

    for e in entStack:
        bics = consDict[e]
        for b in bics:
            if getKeyfromNode(b) not in bicTypeSet:

                curPath.append(b)
                tmpPathKey = curPathKey
                curPathKey += "$" + b

                bicTypeSet.add(getKeyfromNode(b))
                depthSearchHelper(curPath, curPathKey, path, pathDict, consDict, bicTypeSet, entTypeSet, b)
                bicTypeSet.remove(getKeyfromNode(b))

                curPath.pop()
                curPathKey = tmpPathKey

    return pathDict


def depthSearchHelper(curPath, curPathKey, path, pathDict, consDict, bicTypeSet, entTypeSet, bic):
    curBicEnts = consDict[bic]

    expandEntNum = 0
    for e in curBicEnts:
        if getKeyfromNode(e) not in entTypeSet:
            expandEntNum += 1

            bicForCurEnt = consDict[e]
            expandBicNum = 0
            for b in bicForCurEnt:
                if getKeyfromNode(b) not in bicTypeSet:
                    expandBicNum += 1

                    entTypeSet.add(getKeyfromNode(e))
                    bicTypeSet.add(getKeyfromNode(b))

                    # to update......
                    curPath.append(b)
                    tmpPathKey = curPathKey
                    curPathKey += "$" + b
                    path.append(curPath)
                    pathDict[curPathKey] = curPath

                    depthSearchHelper(curPath, curPathKey, path, pathDict, consDict, bicTypeSet, entTypeSet, b)

                    curPath.pop()
                    curPathKey = tmpPathKey
                    entTypeSet.remove(getKeyfromNode(e))
                    bicTypeSet.remove(getKeyfromNode(b))

            if expandBicNum == 0:
                path.append(curPath)
                pathDict[curPathKey] = curPath

    if expandEntNum == 0:
        path.append(curPath)
        pathDict[curPathKey] = curPath



'''
 Given an entity, find its all related nodes and links
    @param entID, the id of an entity
    @param consDict, a dictionary of all relations
    @param entPathCaled, a set of ents that have been calculated their paths 
    @return {obj}, a object contains related nodes and links
'''
def findAllCons(entID, consDict, entPathCaled):
    global entPathLinkedEnts
    global entPathLinkedLinks

    if entID not in entPathCaled:
        nodes = set()
        # keyword of the node (e.g., people, location)
        kwdSet = set()
        # a set of nodes to be expanded
        expEntSet = set()
        # a set of links between these related nodes 
        allLinks = set()

        expEntSet.add(entID)
        findAllConsHelper(expEntSet, consDict, nodes, kwdSet, allLinks)

        entPathCaled.add(entID)

        # add all related nodes and links
        entPathLinkedEnts[entID] = nodes
        entPathLinkedLinks[entID] = allLinks
    else:
        nodes = entPathLinkedEnts[entID]
        allLinks = entPathLinkedLinks[entID]

    obj = {}
    obj["ents"] = nodes
    obj["paths"] = allLinks

    return obj


'''
Get key value based on node type
    @param node, the id of a node
    @return {string}, the type of this node
'''
def getKeyfromNode(node):
    nodeType = node.split("_")[0]
    idSize = len(node.split("_"))

    if idSize == 2:
        result = nodeType
    else:
        type2 = node.split("_")[1]
        result = nodeType + "_" + type2

    return result


'''
Given an entity, find its all related nodes and links
    @param expandSet, a set of entity to be expanded for exam
    @param consDict, a dictionary of relations for all entities
    @param key, a set of keywords of entity types
    @param paths, a set of paths from the given entity to all connected nodes
'''
def findAllConsHelper(expandSet, consDict, nodeSet, key, paths):

    toBeExpanded = set()
    found = False

    if len(expandSet) == 0:
        return

    for value in expandSet:
        if value not in nodeSet:
            nodeSet.add(value)

        if consDict.has_key(value) == True:
            if getKeyfromNode(value) not in key:
                tmpArray = consDict[value]
                for i in range(len(tmpArray)):
                    found = False

                    for kval in key:
                        typewd = tmpArray[i].split("_")
                        if len(typewd) == 2:
                            if kval == typewd[0]:
                                found = True
                        else:
                            tmpKey = typewd[0] + "_" + typewd[1]
                            if tmpKey == kval:
                                found = True

                    if found == False:
                        toBeExpanded.add(tmpArray[i])

                        a = value
                        b = tmpArray[i]

                        if a < b:
                            tmp = b
                            b = a
                            a = tmp

                        curPath = a + "__" + b
                        paths.add(curPath)

    if len(nodeSet) != 1:
        for node in nodeSet:
            key.add(getKeyfromNode(node))

    if len(toBeExpanded) == 0:
        return;

    findAllConsHelper(toBeExpanded, consDict, nodeSet, key, paths)


# All available pairs
PAIRS = Set(['person_location', 'person_phone', 'person_date', 'person_org', 'person_misc', 
    'location_phone', 'location_date', 'location_org', 'location_misc', 
    'phone_date', 'phone_org', 'phone_misc', 
    'date_org', 'date_misc',
    'org_misc'])
    
@login_required 
def getVisJson(request, table1 = "person", table2 = "location", table3 = "org", table4 = "EMPTY", table5 = "EMPTY", table6 = "EMPTY"):
    '''
    Returns a json object for visualization. 
    The json contains lists and bicsets objects.
    @param request: the Django HttpRequest object
    '''
    tableList = []
    tableList.append(table1)
    tableList.append(table2)
    tableList.append(table3)    
    return HttpResponse(json.dumps(getLstsBisets(tableList)))
    
  
def getLstsBisets(lstNames):
    '''
    Returns a json object for visualization. 
    The json contains lists and bicsets objects.
    @param lstNames: the names of lists
    '''
    length = len(lstNames)
    biclusDict = {}
    entryLists = []
    preCols = None    
    
    for i in range(0, length):
        if i == 0:
            theList, preCols = getListDict(None, lstNames[i], lstNames[i+1], preCols, biclusDict)
            entryLists.append({"listID": i + 1, "leftType": "", "listType": lstNames[i], "rightType": lstNames[i+1], "entities": theList})
        elif i == length - 1:
            theList, preCols = getListDict(lstNames[i-1], lstNames[i], None, preCols, biclusDict)
            entryLists.append({"listID": i + 1, "leftType": lstNames[i-1], "listType": lstNames[i], "rightType": "","entities": theList})
        else:           
            theList, preCols = getListDict(lstNames[i-1], lstNames[i], lstNames[i+1], preCols, biclusDict)
            entryLists.append({"listID": i + 1, "leftType": lstNames[i-1], "listType": lstNames[i], "rightType": lstNames[i+1], "entities": theList})
   
    return {"lists":entryLists, "bics":biclusDict}


def getLstsRelations(lstNames):
    '''
    Returns a json object for visualization. 
    The json contains relations between lists.
    @param lstNames: the names of lists
    '''
    length = len(lstNames)
    lstRelations = []

    for i in range(0, length - 1):
        lstName1 = lstNames[i]
        lstName2 = lstNames[i + 1]

        # get data from doc table
        cursor = connection.cursor()
        sql_str = "SELECT A." + lstName1 + "_id, B." + lstName2 + "_id, A.doc_id FROM datamng_" + lstName1 + "doc as A, datamng_" + lstName2 + "doc as B where A.doc_id = B.doc_id order by A."+ lstName1 + "_id"
        cursor.execute(sql_str)
        relation_table_rows = cursor.fetchall()

        for row in relation_table_rows:
            obj1ID = lstName1 + "_" + str(row[0])
            obj2ID = lstName2 + "_" + str(row[1])

            if (obj1ID > obj2ID):
                lnk = obj1ID + "__" + obj2ID
            else:
                lnk = obj2ID + "__" + obj1ID
            lstRelations.append({"oriLinkID": lnk, "obj1": obj1ID, "obj2": obj2ID, "docID": "Doc_" + str(row[2])})

    return lstRelations


def getReducedLstsRelations(lstNames):
    '''
    Returns a json object for visualization. 
    The json contains relations between lists.
    @param lstNames: the names of lists
    ''' 
    length = len(lstNames)
    lstRelations = []

    for i in range(0, length - 1):
        lstName1 = lstNames[i]
        lstName2 = lstNames[i + 1]

        # get data from doc table
        cursor = connection.cursor()
        sql_str = "SELECT A." + lstName1 + "_id, B." + lstName2 + "_id, A.doc_id FROM datamng_" + lstName1 + "doc as A, datamng_" + lstName2 + "doc as B where A.doc_id = B.doc_id group by A."+ lstName1 + "_id, B." + lstName2 + "_id"
        cursor.execute(sql_str)
        relation_table_rows = cursor.fetchall()

        for row in relation_table_rows:
            obj1ID = lstName1 + "_" + str(row[0])
            obj2ID = lstName2 + "_" + str(row[1])

            if (obj1ID > obj2ID):
                lnk = obj1ID + "__" + obj2ID
            else:
                lnk = obj2ID + "__" + obj1ID
            lstRelations.append({"oriLinkID": lnk, "obj1": obj1ID, "obj2": obj2ID, "oriLinkDisplayed": True})

    return lstRelations              

    
def getListDict(tableLeft, table, tableRight, leftClusCols, biclusDict):
    '''
    Generate list items and clusters based on list name, the name of left list, 
    and the name of right list
    @param tableLeft: left list name
    @param table: the current list name
    @param tableRight: right list name
    ''' 
    # retrieve data for field1
    if not table == "EMPTY":
        cursor = connection.cursor()
        sql_str = "SELECT * FROM datamng_" + table
       
        cursor.execute(sql_str)
        table1_rows = cursor.fetchall()
        
        table1_item_dict = {}
        for row in table1_rows:
            if not row[0] in table1_item_dict:
                table1_item_dict[row[0]] = {}
                table1_item_dict[row[0]]['entityID'] = row[0]
                table1_item_dict[row[0]]['entValue'] = row[1]
                table1_item_dict[row[0]]['entFreq'] = row[2]
                table1_item_dict[row[0]]['entVisualOrder'] = 0
                table1_item_dict[row[0]]['entSortedBy'] = "alph"
                table1_item_dict[row[0]]['bicSetsLeft'] = []
                table1_item_dict[row[0]]['bicSetsRight'] = []
                table1_item_dict[row[0]]['numGroupsSelected'] = 0    # entSelected
                table1_item_dict[row[0]]['numCoSelected'] = 0
                table1_item_dict[row[0]]['selected'] = False
                table1_item_dict[row[0]]['mouseovered'] = False
                table1_item_dict[row[0]]['entType'] = table
                table1_item_dict[row[0]]['entityIDCmp'] = str(table) + "_" + str(row[0])
                table1_item_dict[row[0]]['xPos'] = 0
                table1_item_dict[row[0]]['yPos'] = 0
    else:
        return None, None
    
    #retrieve biset list
    if not (tableRight == "EMPTY" or tableRight == None):        
        isInOrder = True
        cursor = connection.cursor()
        sql_str = "SELECT * FROM datamng_" + table + " order by id"
        
        cursor.execute(sql_str)
        list1 = cursor.fetchall()
        
        if table + "_" + tableRight in PAIRS:
            isInOrder = True            
        
            # retrieve data from cluster row for field1
            sql_str = "SELECT * FROM datamng_clusterrow as A, datamng_cluster as B where A.cluster_id = B.id and B.field1 = '" + table + "' and B.field2 = '" + tableRight + "' order by B.id"
            cursor.execute(sql_str)
            t1_t2_ClusRows = cursor.fetchall()
            # retrieve data from cluster col for field1
            sql_str = "SELECT * FROM datamng_clustercol as A, datamng_cluster as B where A.cluster_id = B.id and B.field1 = '" + table + "' and B.field2 = '" + tableRight + "' order by B.id"
            cursor.execute(sql_str)
            t1_t2_ClusCols = cursor.fetchall()
            
            for row in t1_t2_ClusRows:
                if not row[2] in biclusDict:
                    biclusDict[row[2]] = {}
                    newRow = []
                    newRow.append(row[1])
                    biclusDict[row[2]]['row'] = newRow
                    biclusDict[row[2]]['rowField'] = table
                    biclusDict[row[2]]['colField'] = tableRight
                    biclusDict[row[2]]['bicIDCmp'] = str(table) + "_" + str(tableRight) + "_bic_" + str(row[2])
                    biclusDict[row[2]]['bicID'] = row[2]
                    biclusDict[row[2]]['docs'] = []
                    biclusDict[row[2]]['bicSelected'] = False
                    biclusDict[row[2]]['bicMouseOvered'] = False
                    biclusDict[row[2]]['bicNumCoSelected'] = 0
                    biclusDict[row[2]]['bicDisplayed'] = True
                    biclusDict[row[2]]['bicSelectOn'] = False
                else:
                    biclusDict[row[2]]['row'].append(row[1]);
                    
            for col in t1_t2_ClusCols:
                if not col[2] in biclusDict:
                    # Should not go here
                    print col[2], col[1]
                else:
                    if not 'col' in biclusDict[col[2]]:
                        newCol = []
                        newCol.append(col[1])                   
                        biclusDict[col[2]]['col'] = newCol
                    else:
                        biclusDict[col[2]]['col'].append(col[1]);

            for bic in biclusDict:
                rNum = len(biclusDict[bic]['row'])
                cNum = len(biclusDict[bic]['col'])
                # total entity number in a bic
                eNum = rNum + cNum
                biclusDict[bic]['totalEntNum'] = eNum
                biclusDict[bic]['rowEntNum'] = rNum
                biclusDict[bic]['colEntNum'] = cNum

            # generate index of bic based on the number of its ents
            tEntNum = []
            for key, val in biclusDict.iteritems():
                tEntNum.append(val)

            bicList = sorted(tEntNum, key=lambda k: k['totalEntNum'], reverse=True)

            bIndex = 0
            for bic in bicList:
                bic['index'] = bIndex
                bIndex += 1

            
            for row in t1_t2_ClusRows:
                if not row[1] in table1_item_dict:
                    print "Bug here, at line 454"
                else:
                    table1_item_dict[row[1]]['bicSetsRight'].append(row[2]);
            
            if not tableLeft == None and not leftClusCols == None:
                for col in leftClusCols:
                    if not col[1] in table1_item_dict:
                        print "Bug here, at line 454"
                    else:
                        table1_item_dict[col[1]]['bicSetsLeft'].append(col[2]);
            
            # removing id from the list item dictionary
            removedKeyList = []
            for key, val in table1_item_dict.iteritems():
                removedKeyList.append(val)
                
            
            newlist = sorted(removedKeyList, key=lambda k: k['entFreq'], reverse=True)
            
            index = 0
            for item in newlist:
                #print index, item
                item['index'] = index
                index += 1
            return newlist, t1_t2_ClusCols
    else:
        # adding col list to list items.
        for col in leftClusCols:
                if not col[1] in table1_item_dict:
                    print "Bug here, at line 454"
                else:
                    table1_item_dict[col[1]]['bicSetsLeft'].append(col[2]);
        
        # removing id from the list item dictionary
        removedKeyList = []
        for key, val in table1_item_dict.iteritems():
            removedKeyList.append(val)
            
        newlist = sorted(removedKeyList, key=lambda k: k['entFreq'], reverse=True)
            
        index = 0
        for item in newlist:
            #print index, item
            item['index'] = index
            index += 1    
        return newlist, None 
        
    return None, None