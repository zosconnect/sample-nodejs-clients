# Sample Node.js applications on z/OS

This repository contains sample Node.js applications that demonstrates how you can combine data from multiple sources with API orchestration (sample-1.js and sample-2.js). The samples use REST APIs created by [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/overview/what_is_new.html) to access z/OS applications and data hosted in subsystems such as CICS, IMS and Db2. The samples are designed to work on z/OS and non-z/OS environments.

It also contains another sample of writing a microservices API with Node.js (sample-3.js). This sample contains a business rule for claims processing that was extracted from a COBOL program and created as microservices API using Node.js. 

**Note:** For the REST APIs created by z/OS Connect Enterprise Edition, you also have the option to use [zosconnect-node](https://github.com/zosconnect/zosconnect-node) to call the REST APIs. 

## Prerequisites
 * The [IBM SDK for Node.js on z/OS](https://www.ibm.com/support/knowledgecenter/en/SSTRRS_6.0.0/com.ibm.nodejs.zos.v6.doc/welcome.html) is installed and configured. There is a trial version available that you can download and use if you want to try Node.js on z/OS.  Refer to the [Node.js trial site](https://developer.ibm.com/node/sdk/ztp/) for additional information.

## Installing
 * Clone this repository `git clone git://github.com/zosconnect/sample-nodejs-clients.git`
 * Install Node.js on your preferred platform (MacOS, Windows, Linux or z/OS). See the prerequisites section for information on installing the IBM SDK for Node.js on z/OS.
 * Open a command window (Note: You will need to use a telnet session when using Node.js on z/OS) and issue the following to install *express* and *request* in the *sample1* and *sample2* directories:
 ```
 npm install
 ```
 
## Sample 1: An Orchestration API that combines an IMS transaction with a Web API
**Description:** This sample uses the [IMS phonebook application (IVTNO)](https://www.ibm.com/support/knowledgecenter/en/SSEPH2_15.1.0/com.ibm.ims15.doc.ins/ims_ivpsamples.htm). The phonebook application can *add a contact*, *delete a contact*, *display a contact*, and *update the contact*. The data is stored in an IMS database. In this sample, we will use the *display a contact* function to list information about the contact based on the last name. The REST API for the IMS transaction was created using [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_beta/com.ibm.zosconnect.doc/scenarios/ims_api_invoke.html).
![Sample 1 diagram](https://github.com/zosconnect/sample-nodejs-clients/blob/master/media/diag-sample1.png)
Here is a sample output from the REST API that calls the IVTNO IMS transaction:
```
{
  "OUTPUT_AREA": 
  {
    "OUT_ZIP_CODE": "90210",
    "OUT_FIRST_NAME": "JOHN",
    "OUT_LAST_NAME": "DOE",
    "OUT_EXTENSION": "84881",
    "OUT_MESSAGE": "ENTRY WAS DISPLAYED"
  }
}
```
After retrieving the contact information, it will extract additional information related to the zip code of the contact using a postal code REST API provided by [zippopotam.us](http://www.zippopotam.us/). Here is a sample output from the postal code REST API:
```
{
  "post code": "90210",
  "country": "United States",
  "country abbreviation": "US",
  "places": [
     {
       "place name": "Beverly Hills",
       "longitude": "-118.4065",
       "state": "California",
       "state abbreviation": "CA",
       "latitude": "34.0901"
     }
  ]
}
```
To run the `sample-1.js`, issue the following commands from a command window or Telnet session if using Node.js on z/OS:
``` 
cd sample1
node sample-1.js
```
The following output is displayed on the terminal:
```
Demo application listening on port 50001
```
To test `sample-1.js`, type the following from a web browser:
```
http://<hostname>:50001/phone/contact/DOE
```
The following is the sample output returned by the orchestration API:
```
{
  "lastname": "DOE",
  "firstname": "JOHN",
  "extension": "84881",
  "zipcode": "90210",
  "country": "United States",
  "latitude": "34.0901",
  "longitude": "-118.4065",
  "state": "California",
  "city": "Beverly Hills"
}
```
You can also try the following samples:
```
http://<hostname>:50001/phone/contact/JAMES
http://<hostname>:50001/phone/contact/MILLER
```

## Sample 2: An Orchestration API that combines a CICS transaction with a Db2 REST API
**Description:** This sample uses the [CICS catalog manager application (EGUI)](https://www.ibm.com/support/knowledgecenter/en/SSGMCP_5.4.0/applications/example-application/dfhxa_t100.html). The catalog manager program can *inquire products in the catalog*, *get details of a specific item in the catalog*, *order an item in the catalog*, and other functions. In this sample, we will use the *order an item in the catalog* and *get details of a specific item in the catalog*. The sample will also insert order information into a Db2 table using REST API. The REST APIs for the CICS transaction were created using [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/scenarios/cics_api_create.html). For Db2, it uses the [Db2 REST service function](https://www.ibm.com/support/knowledgecenter/en/SSEPEK_12.0.0/restserv/src/tpc/db2z_restservices.html) and extends that with [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/designing/sar_rest_intro.html).  The products in the catalog (office supplies) are stored in a [VSAM file](https://www.ibm.com/support/knowledgecenter/zosbasics/com.ibm.zos.zconcepts/zconcepts_169.htm).
![Sample 2 diagram](https://github.com/zosconnect/sample-nodejs-clients/blob/master/media/diag-sample2b.png)

This sample is an HTTP POST call and requires a JSON payload as input. The JSON payload must contain the following fields:
```
{
   "item" : "<item-num>",  (valid values: 0010, 0020, ..., 0210)
   "userid" : "<user>",    (8-char user ID)
   "dept" : "<dept-id>",   (8-char department ID)
   "qty"  : n-qty,         (1-999)    
   "street" : "<street>",  
   "city" : "<city>",
   "state" : "<state>",
   "zipcode" : "<zipcode>"
}
```
When an order is received, the CICS transaction to process an order is called first, the following fields are used as input:
   * User ID (userid)
   * Department charge dode (dept)
   * Item reference number (item)
   * Order quantity (qty)

After order is processed, the get item details function is called. The following fields are returned:

   * Item reference number
   * Item description
   * Department
   * Items in stock
   * Cost per item
   * Items on order

Once product is ordered it is logged into a Db2 table in z/OS to keep track of the orders. Update to the table is done using Db2 REST service exposed as REST APIs using z/OS Connect Enterprise Edition.  The Db2 table contains columns for the following:

   * Item reference number
   * User ID
   * Description
   * Department charge code
   * Quantity
   * Ship-to Address (Street, city, state, zipcode)
   * Order timestamp

The sample first calls the API to process order for an item. After that, it checks for current inventory using the API to get details on the item that was ordered. And finally, the order is logged into an order history table in Db2. 

To run the `sample-2.js`, issue the following commands from a command window or Telnet session if using Node.js on z/OS:
``` 
cd sample2
node sample-2.js
```
The following output is displayed on the terminal:
```
Demo application listening on port 50002
```
To test `sample-2.js`, type the following from REST client using POST:
```
http://<hostname>:50002/product/mobile/order
```
You need to specify a JSON payload like the one below
```
{
   "item" : "0080",
   "userid" : "JOHNDOE",
   "dept" : "DEPT01",
   "qty"  : 2,    
   "street" : "3039 E Cornwallis Rd",  
   "city" : "Research Triangle Park",
   "state" : "NC",
   "zipcode" : "27709"
}
```
You will receive an output similar to the one below
```
{
    "item": "0080",
    "order-qty": 2,
    "desc": "Motorolla DEFY",
    "updated-stock": 12,
    "status": "ORDER SUCCESSFULLY PLACED"
}
```
To find out the list of items in the product catalog, you can issue the following GET call from a web browser:
```
http://cap-sg-prd-2.integration.ibmcloud.com:16476/product/catalog/mobiles?startItemID=0010
```
To find out details on a specific item, you can issue the following GET call from a web browser:
```
http://cap-sg-prd-2.integration.ibmcloud.com:16476/product/catalog/mobile?itemID=0080
```
To find out all the orders that were processed successfully, you can issue the following GET call from a web browser:
```
http://cap-sg-prd-2.integration.ibmcloud.com:16476/db2/catalog/order
```

## Sample 3: A Microservice API that contains a health claim business rule
**Description:** This sample is the Node.js microservice API that provides the health claim business rule that is used in the [z/OS Connect EE GitHub Sample on API requester](https://github.com/zosconnect/zosconnect-sample-cobol-apirequester). The sample provides automatic approval for a health claim based on the claim type and claim amount submitted. It handles the following claim types: **MEDICAL**, **DRUG**, **DENTAL**. The claim amount limits are **100 for MEDICAL**, **800 for DENTAL**, and **1000 for DRUG**. If the amount exceeded these limits then the business rule will not approve the claim automatically. 
![Sample 3 diagram](https://github.com/zosconnect/sample-nodejs-clients/blob/master/media/diag-sample3b.png)

To run the `sample-3.js`, issue the following commands from a command window or Telnet session if using Node.js on z/OS:
``` 
cd sample3
node sample-3.js
```
The following output is displayed on the terminal:
```
Demo application listening on port 50003
```
To submit an approved claim, type the following from a REST client using GET:
```
http://<hostname>:50003/claim/rule?claimType=MEDICAL&claimAmount=100.00
```
Here is a sample output of a claim that is approved:

  ```json
  {
   "claim-type": "MEDICAL",
   "amount": "100.00",
   "status": "Accepted",
   "reason": "Normal claim"
  }
  ```
To submit a claim that is not approved, type the following from a REST client using GET:
```
http://<hostname>:50003/claim/rule?claimType=MEDICAL&claimAmount=250.00
```
Here is a sample output of a claim that is not approved:

  ```json
  {
    "claim-type": "MEDICAL",
    "amount": "250.00",
    "status": "Rejected",
    "reason": "Amount exceeded $100. Claim require further review."
  }
  ```
