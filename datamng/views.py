from django.shortcuts import render
from django.http import HttpResponse
from django.core.files import File
from django.conf import settings
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


        