from django.shortcuts import render
from django.http import HttpResponse
from django.core.files import File
from django.conf import settings
from sets import Set
import os, subprocess, sys, csv, json


import xml.etree.ElementTree as ET


from datamng.models import DocName, Person, PersonDoc, Location, LocationDoc, Phone, PhoneDoc,Date ,DateDoc ,Org ,OrgDoc,Misc ,MiscDoc ,Money ,MoneyDoc
from datamng.models import Cluster, ClusterCol, ClusterRow
# Create your views here.

def parseRawData(request):
	'''
	Process the Raw data and save to the database.
	@param request: Django http request
	'''
	f = open('datamng/rawdata/crescent.jig')

	tree = ET.parse(f)
	root = tree.getroot()

	documents = root.findall('document')

	for doc in documents:

		# print doc.tag, doc.attrib  # Child of root are documents
		curDocId = doc.find('docID').text
		# print(curDocId)

        # curDocText = doc.find('docText').text
        # print(curDocText)

		if not DocName.objects.filter(doc_name = curDocId):
			curD = DocName(doc_name = curDocId)
			curD.save()

		people = doc.findall('Person')
		for person in people:

			if person.text is not None:
				# print(person.text)
				# curPerson = Person.objects.get(person_name = person.text)

				if not Person.objects.filter(person_name = person.text):
					personObj = Person(person_name = person.text, person_count= 1)
					personObj.save()
				else:
					curPerson = Person.objects.get(person_name = person.text)
					# print(curPerson.person_count)
					curPerson.person_count = curPerson.person_count + 1
					curPerson.save()

				personDocObj = PersonDoc(person_name = Person.objects.get(person_name = person.text), doc_id = DocName.objects.get(doc_name = curDocId))
				personDocObj.save()


		locations = doc.findall('Location')
		for location in locations:

			if location.text is not None:
				# print(location.text)

				if not Location.objects.filter(location_name = location.text):
					locationObj = Location(location_name = location.text, location_count= 1)
					locationObj.save()
				else:
					curLocation = Location.objects.get(location_name = location.text)
					# print(curLocation.location_count)
					curLocation.location_count = curLocation.location_count + 1
					curLocation.save()

				locationDocObj = LocationDoc(location_name = Location.objects.get(location_name = location.text), doc_id = DocName.objects.get(doc_name = curDocId))
				locationDocObj.save()




		phones = doc.findall('Phone')
		for phone in phones:

			if phone.text is not None:
				# print(phone.text)
				# curPhone = Phone.objects.get(phone_number = phone.text)

				if not Phone.objects.filter(phone_number = phone.text):
					phoneObj = Phone(phone_number = phone.text, phone_count= 1)
					phoneObj.save()
				else:
					curPhone = Phone.objects.get(phone_number = phone.text)
					# print(curPhone.phone_count)
					curPhone.phone_count = curPhone.phone_count + 1
					curPhone.save()

				phoneDocObj = PhoneDoc(phone_number = Phone.objects.get(phone_number = phone.text), doc_id = DocName.objects.get(doc_name = curDocId))
				phoneDocObj.save()


		dates = doc.findall('Date')
		for date in dates:

			if date.text is not None:
				# print(date.text)

				if not Date.objects.filter(date_string = date.text):
					dateObj = Date(date_string = date.text, date_count= 1)
					dateObj.save()
				else:
					curDate = Date.objects.get(date_string = date.text)
					# print(curDate.date_count)
					curDate.date_count = curDate.date_count + 1
					curDate.save()

				dateDocObj = DateDoc(date_string = Date.objects.get(date_string = date.text), doc_id = DocName.objects.get(doc_name = curDocId))
				dateDocObj.save()



		orgs = doc.findall('Organization')
		for org in orgs:

			if org.text is not None:
				# print(org.text)

				if not Org.objects.filter(org_name = org.text):
					orgObj = Org(org_name = org.text, org_count= 1)
					orgObj.save()
				else:
					curOrg = Org.objects.get(org_name = org.text)
					# print(curOrg.org_count)
					curOrg.org_count = curOrg.org_count + 1
					curOrg.save()

				orgDocObj = OrgDoc(org_name = Org.objects.get(org_name = org.text), doc_id = DocName.objects.get(doc_name = curDocId))
				orgDocObj.save()



		miscs = doc.findall('Misc')
		for misc in miscs:

			if misc.text is not None:
				# print(misc.text)

				if not Misc.objects.filter(misc_string = misc.text):
					miscObj = Misc(misc_string = misc.text, misc_count= 1)
					miscObj.save()
				else:
					curMisc = Misc.objects.get(misc_string = misc.text)
					# print(curMisc.misc_count)
					curMisc.misc_count = curMisc.misc_count + 1
					curMisc.save()

				miscDocObj = MiscDoc(misc_string = Misc.objects.get(misc_string = misc.text), doc_id = DocName.objects.get(doc_name = curDocId))
				miscDocObj.save()	


		moneys = doc.findall('Money')
		for money in moneys:

			if money.text is not None:
				# print(money.text)

				if not Money.objects.filter(money_string = money.text):
					moneyObj = Money(money_string = money.text, money_count= 1)
					moneyObj.save()
				else:
					curMoney = Money.objects.get(money_string = money.text)
					# print(curMoney.money_count)
					curMoney.money_count = curMoney.money_count + 1
					curMoney.save()

                # count = curDocText.count(money.text)
                # print(count)

                moneyDocObj = MoneyDoc(money_string = Money.objects.get(money_string = money.text), doc_id = DocName.objects.get(doc_name = curDocId))
                moneyDocObj.save()

	output = 'after parse Raw data'

	return HttpResponse(json.dumps(output), content_type = "application/json")

'''
update counts for each entity
'''
def updateCounts(request):
    '''
    Process the Raw data and save to the database.
    @param request: Django http request
    '''
    f = open('datamng/rawdata/crescent.jig')
    tree = ET.parse(f)
    root = tree.getroot()

    documents = root.findall('document')
    for doc in documents:
        # print doc.tag, doc.attrib  # Child of root are documents
        curDocId = doc.find('docID').text
        curDocText = doc.find('docText').text
        curDoc = DocName.objects.get(doc_name = curDocId)


        # update the real count for people
        people = doc.findall('Person')
        for person in people:
            count = curDocText.count(person.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curPerson = Person.objects.get(person_name = person.text)

            personToUpdate = PersonDoc.objects.get(person = curPerson.id, doc = curDoc.id)
            personToUpdate.person_count = count
            personToUpdate.save()


        # update the real count for location
        locations = doc.findall('Location')
        for location in locations:
            count = curDocText.count(location.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curLocation = Location.objects.get(location_name = location.text)

            locationToUpdate = LocationDoc.objects.get(location = curLocation.id, doc = curDoc.id)
            locationToUpdate.location_count = count
            locationToUpdate.save()


        # update the real count for phones
        phones = doc.findall('Phone')
        for phone in phones:
            count = curDocText.count(phone.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curPhone = Phone.objects.get(phone_number = phone.text)

            phoneToUpdate = PhoneDoc.objects.get(phone = curPhone.id, doc = curDoc.id)
            phoneToUpdate.phone_count = count
            phoneToUpdate.save()      


        # update the real count for dates
        dates = doc.findall('Date')
        for date in dates:
            count = curDocText.count(date.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curDate = Date.objects.get(date_string = date.text)

            dateToUpdate = DateDoc.objects.get(date = curDate.id, doc = curDoc.id)
            dateToUpdate.date_count = count
            dateToUpdate.save() 


        # update the real count for org
        orgs = doc.findall('Organization')
        for org in orgs:
            count = curDocText.count(org.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curOrg = Org.objects.get(org_name = org.text)

            orgToUpdate = OrgDoc.objects.get(org = curOrg.id, doc = curDoc.id)
            orgToUpdate.org_count = count
            orgToUpdate.save()


        # update the real count for misc
        miscs = doc.findall('Misc')
        for misc in miscs:
            count = curDocText.count(misc.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curMisc = Misc.objects.get(misc_string = misc.text)

            miscToUpdate = MiscDoc.objects.get(misc = curMisc.id, doc = curDoc.id)
            miscToUpdate.misc_count = count
            miscToUpdate.save()


        # update the real count for money
        moneys = doc.findall('Money')
        for money in moneys:
            count = curDocText.count(money.text)
            # check the count and increase as 1
            if count == 0:
                count += 1

            curMoney = Money.objects.get(money_string = money.text)
            
            moneyToUpdate = MoneyDoc.objects.get(money = curMoney.id, doc = curDoc.id)
            moneyToUpdate.money_count = count
            moneyToUpdate.save()

    return HttpResponse("Done")


###### Running Algorithm
from django.db import connection

def genLcmInput(request):
    '''
    Generate all combinations of input files for LCM progarm
    @param request: Django http request
    '''    
    file_name = "datamng/lcmdata/Input_Person_Location.txt"
    genOneLcmInput(file_name, "person_name", "location_name", "datamng_persondoc", "datamng_locationdoc");
    
    file_name = "datamng/lcmdata/Input_Person_Phone.txt"
    genOneLcmInput(file_name, "person_name", "phone_number", "datamng_persondoc", "datamng_phonedoc");
    
    file_name = "datamng/lcmdata/Input_Person_Date.txt"
    genOneLcmInput(file_name, "person_name", "date_string", "datamng_persondoc", "datamng_datedoc");
    
    file_name = "datamng/lcmdata/Input_Person_Org.txt"
    genOneLcmInput(file_name, "person_name", "org_name", "datamng_persondoc", "datamng_orgdoc");
    
    file_name = "datamng/lcmdata/Input_Person_Misc.txt"
    genOneLcmInput(file_name, "person_name", "misc_string", "datamng_persondoc", "datamng_miscdoc");
    
    
    ########################################    
    file_name = "datamng/lcmdata/Input_Location_Phone.txt"
    genOneLcmInput(file_name, "location_name", "phone_number", "datamng_locationdoc", "datamng_phonedoc");
    
    file_name = "datamng/lcmdata/Input_Location_Date.txt"
    genOneLcmInput(file_name, "location_name", "date_string", "datamng_locationdoc", "datamng_datedoc");
    
    file_name = "datamng/lcmdata/Input_Location_Org.txt"
    genOneLcmInput(file_name, "location_name", "org_name", "datamng_locationdoc", "datamng_orgdoc");
    
    file_name = "datamng/lcmdata/Input_Location_Misc.txt"
    genOneLcmInput(file_name, "location_name", "misc_string", "datamng_locationdoc", "datamng_miscdoc");
    
    
    
    #################################################################
    
    file_name = "datamng/lcmdata/Input_Phone_Date.txt"
    genOneLcmInput(file_name, "phone_number", "date_string", "datamng_phonedoc", "datamng_datedoc");
    
    file_name = "datamng/lcmdata/Input_Phone_Org.txt"
    genOneLcmInput(file_name, "phone_number", "org_name", "datamng_phonedoc", "datamng_orgdoc");
    
    file_name = "datamng/lcmdata/Input_Phone_Misc.txt"
    genOneLcmInput(file_name, "phone_number", "misc_string", "datamng_phonedoc", "datamng_miscdoc");
    
    #################################################################
    
    file_name = "datamng/lcmdata/Input_Date_Org.txt"
    genOneLcmInput(file_name, "date_string", "org_name", "datamng_datedoc", "datamng_orgdoc");
    
    file_name = "datamng/lcmdata/Input_Date_Misc.txt"
    genOneLcmInput(file_name, "date_string", "misc_string", "datamng_datedoc", "datamng_miscdoc");
    
    #################################################################
    
    file_name = "datamng/lcmdata/Input_Org_Misc.txt"
    genOneLcmInput(file_name, "org_name", "misc_string", "datamng_orgdoc", "datamng_miscdoc");
    
    return HttpResponse("Done")
    
def genOneLcmInput(fileName, field1, field2, table1, table2):
    '''
    Generate one input file for LCM program.
    @param fileName: file name of the input file to be saved.
    @param field1: row name of the cluster
    @param field2: col name of the cluster
    @param table1: database table name for the row field
    @param table2: database table name for the col field.
    '''
    
    # Fetch the row information of the cluster
    cursor = connection.cursor()
    sql_str = "SELECT A." + field1 + "_id, B."+ field2 + "_id FROM " + table1 + " as A, "+ table2 + \
        " as B WHERE A.doc_id_id = B.doc_id_id order by A." + field1 +"_id"   
    cursor.execute(sql_str)
    rows = cursor.fetchall()     
    
    
    # Create a Python file object using open() and the with statement
    with open(fileName, 'w') as f:
        myfile = File(f)
        lastRow = 0
        currLine = ""
        rowIndex = 0
        for row in rows:        
            #print row
            if row[0] == lastRow:
                currLine += str(row[1]) + " "
            else:            
                myfile.write(currLine + "\n")
                rowIndex += 1
                while not row[0] == rowIndex:
                    myfile.write("\n")
                    rowIndex += 1
                lastRow = row[0]
                currLine = str(row[1]) + " "            
            
        myfile.write(currLine + "\n")
        myfile.closed
        f.closed
   
# Generate the output based on the input
def genLcmOutput(request):
    '''
    Generate all combinations of bicluster.
    @param request: Django http request
    '''
    lcmFilePath = "datamng/lcmdata/lcm.exe"
    
    #########################
    inputFileName = "datamng/lcmdata/Input_Person_Location.txt"
    outputFileName = "datamng/lcmdata/Output_Person_Location.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "person", "location")
    
    inputFileName = "datamng/lcmdata/Input_Person_Phone.txt"
    outputFileName = "datamng/lcmdata/Output_Person_Phone.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "person", "phone")
    
    inputFileName = "datamng/lcmdata/Input_Person_Date.txt"
    outputFileName = "datamng/lcmdata/Output_Person_Date.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath,"person", "date")
    
    inputFileName = "datamng/lcmdata/Input_Person_Org.txt"
    outputFileName = "datamng/lcmdata/Output_Person_Org.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "person", "org")
    
    inputFileName = "datamng/lcmdata/Input_Person_Misc.txt"
    outputFileName = "datamng/lcmdata/Output_Person_Misc.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "person", "misc")
    
    
    #########################    
    inputFileName = "datamng/lcmdata/Input_Location_Phone.txt"
    outputFileName = "datamng/lcmdata/Output_Location_Phone.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "location", "phone")
    
    inputFileName = "datamng/lcmdata/Input_Location_Date.txt"
    outputFileName = "datamng/lcmdata/Output_Location_Date.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath,"location", "date")
    
    inputFileName = "datamng/lcmdata/Input_Location_Org.txt"
    outputFileName = "datamng/lcmdata/Output_Location_Org.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "location", "org")
    
    inputFileName = "datamng/lcmdata/Input_Location_Misc.txt"
    outputFileName = "datamng/lcmdata/Output_Location_Misc.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "location", "misc")
    
    #########################    
    inputFileName = "datamng/lcmdata/Input_Phone_Date.txt"
    outputFileName = "datamng/lcmdata/Output_Phone_Date.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath,"phone", "date")
    
    inputFileName = "datamng/lcmdata/Input_Phone_Org.txt"
    outputFileName = "datamng/lcmdata/Output_Phone_Org.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "phone", "org")
    
    inputFileName = "datamng/lcmdata/Input_Phone_Misc.txt"
    outputFileName = "datamng/lcmdata/Output_Phone_Misc.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "phone", "misc")
    
    #########################    
    inputFileName = "datamng/lcmdata/Input_Date_Org.txt"
    outputFileName = "datamng/lcmdata/Output_Date_Org.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "date", "org")
    
    inputFileName = "datamng/lcmdata/Input_Date_Misc.txt"
    outputFileName = "datamng/lcmdata/Output_Date_Misc.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "date", "misc")
    
    #########################    
    inputFileName = "datamng/lcmdata/Input_Org_Misc.txt"
    outputFileName = "datamng/lcmdata/Output_Org_Misc.txt"    
    genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, "org", "misc")
    
    return HttpResponse("good")

def genOneLcmOutput(inputFileName, outputFileName, lcmFilePath, f1, f2):
    '''
    Generate One LCM output file using a input file and save the output to database.
    @param inputFileName: the input file name for the LCM algorithm
    @param outputFileName: store the result after running the LCM algorithm.
    @param lcmFilePath: path of the LCM program
    @param f1: row field of the cluster
    @param f2: col field of the cluster
    '''
    # Runing the LCM program
    proc = subprocess.Popen([lcmFilePath, 'MqI', inputFileName, '3', outputFileName])
    # Waiting for the LCM program to finish
    proc.wait()
    
    # Saving the output of the LCM to the database.
    with open(outputFileName, 'r') as f:
        oeIndex = 0
        for line in f:
            words = line.split()
            if oeIndex%2 == 0: #col
                clus = Cluster(field1 = f1, field2 = f2)
                clus.save()
                for col in words:
                    clusterCol = ClusterCol(cluster = clus, cid = col)
                    clusterCol.save()
            else:
                for row in words:
                    clusterRow = ClusterRow(cluster = clus, rid = row)
                    clusterRow.save()
                
            print "EEE" + str(words)
            oeIndex += 1

import rpy2
from rpy2.robjects import r
r.library("ca")
r.library("FactoMineR")
r.library("seriation")

# All available pairs
PAIRS = Set(['person_location', 'person_phone', 'person_date', 'person_org', 'person_misc', 
    'location_phone', 'location_date', 'location_org', 'location_misc', 
    'phone_date', 'phone_org', 'phone_misc', 
    'date_org', 'date_misc',
    'org_misc'])

def seriation(request):

    clusterDict = {}
    gClusterIDs = []

    clusterInfo = fetchAllInfo('datamng_cluster')
    # print(clusterInfo)
    for e in clusterInfo:
        clusterDict[e[0]] = {}
        clusterDict[e[0]]['rowField'] = e[1]
        clusterDict[e[0]]['colField'] = e[2]
        gClusterIDs.append(e[0])
    gClusterIDShift = gClusterIDs[0]

    # get data from global entity id table
    gEntID_table_rows = fetchAllInfo('datamng_globalentid')
    
    gDomainList = []
    gDomainIDShift = {}
    # get a list of domains and the global id of their entities
    for row in gEntID_table_rows:
        gDomainList.append(row[1])
        gDomainIDShift[row[1]] = row[4]

    gEntDict = {}
    gEntLtoGDict = {}


    for d in gDomainList:

        # generate files for entities in each domain
        # fname = "./datamng/entdata/" + str(d) + ".csv"
        # docWriter = csv.writer(open(fname, "wb"))
        # ===========================================

        entsInfo = fetchAllInfo('datamng_' + d)
        for row in entsInfo:
            gEntindex = row[0] + gDomainIDShift[d]
            gEntDict[gEntindex] = {}
            gEntDict[gEntindex]['entType'] = d
            gEntDict[gEntindex]['entLocalID'] = row[0]

            gEntLtoGDict[d + "_" + str(row[0])] = gEntindex

            # ===========================================
            # rowinDoc = []
            # # entity global id
            # rowinDoc.append(gEntindex)
            # # entity local id
            # rowinDoc.append(row[0])
            # # entity value
            # rowinDoc.append(row[1])
            # # entity frequency
            # rowinDoc.append(row[2])

            # docWriter.writerow(rowinDoc)
            # ===========================================

    rowNum = len(gEntDict)
    colNum = len(clusterDict)
    gEntDicMatrix = [[ 0 for x in range(0, colNum)] for y in range(0, rowNum)]

    for p in PAIRS:
        tmpRow = p.split("_")[0]
        tmpCol = p.split("_")[1]

        curRows = fetchBicRowInfo("datamng_clusterrow", "datamng_cluster", tmpRow, tmpCol)
        curCols = fetchBicRowInfo("datamng_clustercol", "datamng_cluster", tmpRow, tmpCol)

        for row in curRows:
            thisEntLocalID = int(row[1])
            thisEntGlobalID = int(thisEntLocalID) + int(gDomainIDShift[tmpRow])

            thisClusterLocalID = int(row[2])
            thisClusterGlobalID = int(thisClusterLocalID) - int(gClusterIDShift)

            gEntDicMatrix[thisEntGlobalID][thisClusterGlobalID] = 1

        for col in curCols:
            thisEntLocalID = int(col[1])
            thisEntGlobalID = int(thisEntLocalID) + int(gDomainIDShift[tmpRow])

            thisClusterLocalID = int(col[2])
            thisClusterGlobalID = int(thisClusterLocalID) - int(gClusterIDShift)

            gEntDicMatrix[thisEntGlobalID][thisClusterGlobalID] = 1

    colOrientedMatrix = {}
    for col in range(0, colNum):
        tmp_list = []
        for row in range(0, rowNum):
            tmp_list.append(gEntDicMatrix[row][col])
        colOrientedMatrix[col] = rpy2.robjects.IntVector(tuple(tmp_list))

    # get the info of connections between all entities and all bics
    # c = csv.writer(open("./datamng/seriationdata/global_seriation.csv", "wb"))
    # for d in gEntDicMatrix:
    #     c.writerow(d)

    print(gDomainList)

    # get all pairs of domains
    pairedDomains = []
    for d1 in gDomainList:
        for d2 in gDomainList:
            if d1 != d2:
                tup1 = (d1, d2)
                tup2 = (d2, d1)
                if tup1 not in pairedDomains and tup2 not in pairedDomains:
                    pairedDomains.append(tup1)

    print(pairedDomains)

    # ==================================================
    # prepare the file as dictionary to compose data matrix between each two domains
    # for p in pairedDomains:
    #     pd1 = p[0]
    #     pd2 = p[1]
    #     entsInfo1 = fetchAllInfo('datamng_' + pd1)
    #     entsInfo2 = fetchAllInfo('datamng_' + pd2)

        # fname = "./datamng/seriationentdata/" + str(pd1) + "__" + str(pd2) + ".csv"
        # adocwriter = csv.writer(open(fname, "wb"))

        # rowID = 0

        # for ents1 in entsInfo1:
        #     globalEntID1 = ents1[0] + gDomainIDShift[pd1]

        #     arow1 = []
        #     # the current row id
        #     arow1.append(rowID)
        #     # the global id of current entity
        #     arow1.append(globalEntID1)
        #     # the local id of current entity
        #     arow1.append(ents1[0])
        #     # the value of current entity
        #     arow1.append(ents1[1])
        #     # the frequency of current entity
        #     arow1.append(ents1[2])

        #     adocwriter.writerow(arow1)

        #     rowID += 1

        # for ents2 in entsInfo2:
        #     globalEntID2 = ents2[0] + gDomainIDShift[pd2]

        #     arow2 = []
        #     # the current row id
        #     arow2.append(rowID)
        #     # the global id of current entity
        #     arow2.append(globalEntID2)
        #     # the local id of current entity
        #     arow2.append(ents2[0])
        #     # the value of current entity
        #     arow2.append(ents2[1])
        #     # the frequency of current entity
        #     arow2.append(ents2[2])

        #     adocwriter.writerow(arow2)

        #     rowID += 1
    # ==================================================


    # ==================================================
    '''
    Generate the data matrix for each paired domains
    '''
    for p in pairedDomains:
        pd1 = p[0]
        pd2 = p[1]

        curRows = fetchBicRowInfo("datamng_clusterrow", "datamng_cluster", str(pd1), str(pd2))
        curCols = fetchBicRowInfo("datamng_clustercol", "datamng_cluster", str(pd1), str(pd2))

        uniqueClusterIDs = []
        uniqueGrowIDs = []
        uniqueGcolIDs = []

        for arow in curRows:
            # get unique cluster id
            if arow[2] not in uniqueClusterIDs:
                uniqueClusterIDs.append(arow[2])

            # get unique (global) row entity ids
            curGrowID = gEntLtoGDict[str(pd1) + "_" + str(arow[1])]
            if curGrowID not in uniqueGrowIDs:
                uniqueGrowIDs.append(curGrowID)

        for acol in curCols:
            # get unique (global) col entity id
            curGcolID = gEntLtoGDict[str(pd2) + "_" + str(acol[1])]
            if curGcolID not in uniqueGcolIDs:
                uniqueGcolIDs.append(curGcolID)

        # all unique entity ids
        uniqueEntIDs = uniqueGrowIDs + uniqueGcolIDs       

        '''
        the format of the file that contains the unique entity ids,
        these entities (not all entities from two domains) belongs
        to certain two domains that involved in biclusters:
        rowID, entity global ID, entity type, entity local ID
        '''
        # fname = "./datamng/seriationdata/pairsdict/entdict/" + str(pd1) + "__" + str(pd2) + "__entIDs.csv"
        # adocwriter = csv.writer(open(fname, "wb"))

        # rowIndex = 0
        # for aId in uniqueEntIDs:
        #     oneRow = []
        #     oneRow.append(rowIndex)
        #     oneRow.append(aId)

        #     entType = gEntDict[aId]['entType']
        #     entLocalID = gEntDict[aId]['entLocalID']

        #     oneRow.append(entType)
        #     oneRow.append(entLocalID)

        #     adocwriter.writerow(oneRow)

        #     rowIndex += 1
        # =======================================================

        
        '''
        the format of the file that contains the unique cluster ids:
        rowID, cluster IDs, row type, col type
        '''
        # fname = "./datamng/seriationdata/pairsdict/clusterdict/" + str(pd1) + "__" + str(pd2) + "__clusterIDs.csv"
        # adocwriter = csv.writer(open(fname, "wb"))

        # rowIndex = 0
        # for aId in uniqueClusterIDs:
        #     oneRow = []
        #     oneRow.append(rowIndex)
        #     oneRow.append(aId)
        #     oneRow.append(str(pd1))
        #     oneRow.append(str(pd2))

        #     adocwriter.writerow(oneRow)
        #     rowIndex += 1
        # =======================================================


        '''
        generate data matrix for each paired domains
        row: is the set of elements from the two domains
        col: is the set of unique cluster ids
        '''
        # dataMatrixRowNum = len(uniqueEntIDs)
        # dataMatrixColNum = len(uniqueClusterIDs)
        # dataMatrix = [[ 0 for x in range(0, dataMatrixColNum)] for y in range(0, dataMatrixRowNum)]

        # for r in curRows:
        #     thisEntGlobalID = gEntLtoGDict[str(pd1) + "_" + str(r[1])]
        #     thisClusterID = r[2]

        #     rIndex = uniqueEntIDs.index(thisEntGlobalID)
        #     cIndex = uniqueClusterIDs.index(thisClusterID)
        #     dataMatrix[rIndex][cIndex] = 1

        # for c in curCols:
        #     thisEntGlobalID = gEntLtoGDict[str(pd2) + "_" + str(c[1])]
        #     thisClusterID = c[2]

        #     rIndex = uniqueEntIDs.index(thisEntGlobalID)
        #     cIndex = uniqueClusterIDs.index(thisClusterID)
        #     dataMatrix[rIndex][cIndex] = 1


        # fname = "./datamng/seriationdata/input/" + str(pd1) + "__" + str(pd2) + "_matrix.csv"
        # adocwriter = csv.writer(open(fname, "wb"))
        # for d in dataMatrix:
        #     adocwriter.writerow(d)


        '''
        open seriation output files (generated with r code)
        based on the seriation result to reassign the order
        for entities in each domain
        '''
        
        # create new dictionaries to contains the ordered informaiton
        newpath = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired"
        if not os.path.exists(newpath):
            os.makedirs(newpath)

        fname = "./datamng/seriationdata/output/" + str(pd1) + "__" + str(pd2) + "_sered.csv"

        f_cluster_dict = "./datamng/seriationdata/pairsdict/clusterdict/" + str(pd1) + "__" + str(pd2) + "__clusterIDs.csv"
        f_ent_dict = "./datamng/seriationdata/pairsdict/entdict/" + str(pd1) + "__" + str(pd2) + "__entIDs.csv"

        with open(fname) as f_seriation_ouput:
            f_csv = csv.reader(f_seriation_ouput)
            headers = next(f_csv)
            orderedClusters = headers[1:]

            # -------------------------------------------
            '''
            1) get the first column from the output matrix after seriation 
            2) separate entities from two domains
            3) order these entities based on the output matrix
            4) append entities not in the matrix
            '''
            # get the id of ordered entities
            orderedEnts = []
            for row in f_csv:
                orderedEnts.append(str(int(row[0]) - 1))

            fRowEnts = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired/" + str(pd1) + ".csv" 
            fColEnts = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired/" + str(pd2) + ".csv"

            entIdDict = {}
            with open(f_ent_dict) as fentDict:
                f_ents = csv.reader(fentDict)
                for row in f_ents:
                    entIdDict[row[0]] = {}
                    entIdDict[row[0]]["entType"] = row[2]
                    entIdDict[row[0]]["entGlobalID"] = row[1]
                    entIdDict[row[0]]["entLocalID"] = row[3]                    

            # separate ents into two groups based on domain
            entsType1 = []
            entsType2 = []
            for e in orderedEnts:
                if (entIdDict[str(e)]["entType"] == str(pd1)):
                    entsType1.append(entIdDict[str(e)]["entGlobalID"])
                if (entIdDict[str(e)]["entType"] == str(pd2)):
                    entsType2.append(entIdDict[str(e)]["entGlobalID"])

            fentsType1 = "./datamng/entdata/" + str(pd1) + ".csv"
            fentsType2 = "./datamng/entdata/" + str(pd2) + ".csv"

            # the info of all ents in a domain
            fullEntsDictType1 = {}
            # a list of ents that are not connected with any biclusters
            entsType1_notsered = []
            with open(fentsType1) as fents1:
                ents1 = csv.reader(fents1)

                for entInfo in ents1:
                    thisEntLID = entInfo[1]
                    thisEntGID = entInfo[0]

                    fullEntsDictType1[str(thisEntGID)] = {}
                    fullEntsDictType1[str(thisEntGID)]["entType"] = str(pd1)
                    fullEntsDictType1[str(thisEntGID)]["entGlobalID"] = thisEntGID
                    fullEntsDictType1[str(thisEntGID)]["entLocalID"] = thisEntLID
                    fullEntsDictType1[str(thisEntGID)]["entVal"] = entInfo[2]
                    fullEntsDictType1[str(thisEntGID)]["entFreq"] = entInfo[3]

                    if thisEntGID not in entsType1:
                        entsType1_notsered.append(thisEntGID)

            # the info of all ents in a domain
            fullEntsDictType2 = {}
            # a list of ents that are not connected with any biclusters
            entsType2_notsered = []
            with open(fentsType2) as fents2:
                ents2 = csv.reader(fents2)

                for entInfo in ents2:
                    thisEntLID = entInfo[1]
                    thisEntGID = entInfo[0]

                    fullEntsDictType2[str(thisEntGID)] = {}
                    fullEntsDictType2[str(thisEntGID)]["entType"] = str(pd2)
                    fullEntsDictType2[str(thisEntGID)]["entGlobalID"] = thisEntGID
                    fullEntsDictType2[str(thisEntGID)]["entLocalID"] = thisEntLID
                    fullEntsDictType2[str(thisEntGID)]["entVal"] = entInfo[2]
                    fullEntsDictType2[str(thisEntGID)]["entFreq"] = entInfo[3]

                    if thisEntGID not in entsType2:
                        entsType2_notsered.append(thisEntGID)

            allEntsInType1 = entsType1 + entsType1_notsered
            allEntsInType2 = entsType2 + entsType2_notsered

            '''
            the format of the file with all entities:
            order, glabal id, local id, ent type, value, freq
            '''
            # f_ordered_entTyp1 = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired/" + str(pd1) + "_seredIDs.csv" 
            # f_ordered_entTyp2 = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired/" + str(pd2) + "_seredIDs.csv"
            # adocwriter1 = csv.writer(open(f_ordered_entTyp1, "wb"))
            # adocwriter2 = csv.writer(open(f_ordered_entTyp2, "wb"))

            # orderIndex = 0
            # for e in allEntsInType1:
            #     curRow = []
            #     curRow.append(orderIndex)
            #     curRow.append(e)
            #     curRow.append(fullEntsDictType1[e]["entLocalID"])
            #     curRow.append(str(pd1))
            #     curRow.append(fullEntsDictType1[e]["entVal"])
            #     curRow.append(fullEntsDictType1[e]["entFreq"])

            #     adocwriter1.writerow(curRow)
            #     orderIndex += 1

            # orderIndex = 0
            # for e in allEntsInType2:
            #     curRow = []
            #     curRow.append(orderIndex)
            #     curRow.append(e)
            #     curRow.append(fullEntsDictType2[e]["entLocalID"])
            #     curRow.append(str(pd2))
            #     curRow.append(fullEntsDictType2[e]["entVal"])
            #     curRow.append(fullEntsDictType2[e]["entFreq"])

            #     adocwriter2.writerow(curRow)
            #     orderIndex += 1
            # -------------------------------------------



            # -------------------------------------------
            '''
            the file includes the ordered bicluster info:
            order, bicluster ID, row type, col type
            '''
            # cIdDict = {}
            # with open(f_cluster_dict) as fclusterDict:
            #     f_clusters = csv.reader(fclusterDict)
            #     for row in f_clusters:
            #         cIdDict[row[0]] = {}
            #         cIdDict[row[0]]["clusterID"] = row[1]
            #         cIdDict[row[0]]["rowType"] = row[2]
            #         cIdDict[row[0]]["colType"] = row[3]

            # f_ordered_cluster = "./datamng/seriationdata/ordered/" + str(pd1) + "__" + str(pd2) + "_paired/orderdClusterIDs.csv" 
            # adocwriter = csv.writer(open(f_ordered_cluster, "wb"))
            # clusterOrder = 0
            # for c in orderedClusters:
            #     theID = str(int(c[1:]) - 1)

            #     arow = []
            #     arow.append(clusterOrder)
            #     arow.append(cIdDict[theID]["clusterID"])
            #     arow.append(cIdDict[theID]["rowType"])
            #     arow.append(cIdDict[theID]["colType"])

            #     adocwriter.writerow(arow)
            #     clusterOrder += 1
            # ------------------------------------------

    # ==================================================

    return HttpResponse("Done")


# fetch all information from a table
def fetchAllInfo(tableName):
    cursor = connection.cursor()
    sql_str = "SELECT * FROM " + tableName
    cursor.execute(sql_str)
    return cursor.fetchall()


# get row or column info of bics with two specific fields
def fetchBicRowInfo(rowOrCol, cluster, field1, field2):
    cursor = connection.cursor()
    sql_str = "SELECT * FROM " + rowOrCol + " as A, " + cluster + " as B where A.cluster_id = B.id and B.field1 = '" + field1 + "' and B.field2 = '" + field2 + "' order by B.id"
    cursor.execute(sql_str)
    return cursor.fetchall()