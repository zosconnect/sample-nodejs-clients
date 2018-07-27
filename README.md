# Sample Node.js applications on z/OS

This repository contains sample Node.js applications that demonstrates how you can combine data from multiple sources with API orchestration. The samples call REST APIs created by [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/overview/what_is_new.html) to access z/OS applications and data hosted in subsystems such as CICS, IMS and Db2. The samples are designed to work on z/OS and non-z/OS environments.

## Prerequisites
 * The IBM SDK for Node.js on z/OS is installed and configured. There is a trial version available that you can download and use if you want to try Node.js on z/OS.  Refer to the [Node.js trial site](https://developer.ibm.com/node/sdk/ztp/) for additional information.

## Installing
 * Clone this repository `git clone git://github.com/zosconnect/sample-nodejs-clients.git`
 * Install Node.js on your preferred platform (MacOS, Windows, Linux or z/OS). See the prerequisites section for information on installing the IBM SDK for Node.js on z/OS.
 * Open a command window (Note: You will need to use a telnet session when using Node.js on z/OS) and issue the following to install *express* and *request* in the *sample1* and *sample2* directories:
 ```
 npm install express --save
 npm install request --save
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
To try this sample, copy or upload `sample-1.js` to the **nodeapp** directory you created.

To run the `sample-1.js`, issue the following command from a command window or Telnet session if using Node.js on z/OS:
``` 
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
**Description:** This sample uses the [CICS catalog manager application (EGUI)](https://www.ibm.com/support/knowledgecenter/en/SSGMCP_5.4.0/applications/example-application/dfhxa_t100.html). The catalog manager program can *inquire products in the catalog*, *get details of a specific item in the catalog*, *order an item in the catalog*, and other functions. In this sample, we will use the *order an item in the catalog* and *get details of a specific item in the catalog*. The sample will also insert order information into a Db2 table using REST API. The REST APIs for the CICS transaction were created using [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/scenarios/cics_api_create.html). For Db2, it uses the [Db2 REST service function](https://www.ibm.com/support/knowledgecenter/en/SSEPEK_12.0.0/restserv/src/tpc/db2z_restservices.html) and extends that with [z/OS Connect Enterprise Edition](https://www.ibm.com/support/knowledgecenter/en/SS4SVW_3.0.0/com.ibm.zosconnect.doc/designing/sar_rest_intro.html).  The products in the catalog (mobile phones) are stored in a [VSAM file](https://www.ibm.com/support/knowledgecenter/zosbasics/com.ibm.zos.zconcepts/zconcepts_169.htm).
![Sample 2 diagram](https://github.com/zosconnect/sample-nodejs-clients/blob/master/media/diag-sample2.png)

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

To try this sample, copy or upload `sample-2.js` to the **nodeapp** directory you created.

To run the `sample-2.js`, issue the following command from a command window or Telnet session if using Node.js on z/OS:
``` 
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
To find out all the orders successfully processed, you can issue the following GET call from a web browser:
```
http://cap-sg-prd-2.integration.ibmcloud.com:16476/db2/catalog/order
```
