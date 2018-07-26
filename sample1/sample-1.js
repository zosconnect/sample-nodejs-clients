// (C) Copyright IBM Corp. 2018 All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 
// which you can read at https://www.apache.org/licenses/LICENSE-2.0
//
// This program shows how to create an orchestration API using Node.js.
// The program can be executed on any platform that supports Node.js including
// z/OS.  
//
// The sample uses the phonebook application (IVTNO) provided with IMS.
// The phonebook application can add a contact, delete a contact, display
// a contact, and update the contact. The data is stored in an IMS database.
// In this sample, we will use the 'display a contact' function to list 
// information about the contact based on last name. This IMS function can be 
// called as a REST API using z/OS Connect Enterprise Edition. The following 
// fields are returned:
//   
//   * Last Name
//   * First Name
//   * Extension Number
//   * Zip code
//
// After retrieving the contact information, it will extract additional
// information related to the zip code of the contact using a postal code 
// API provided by zippopotam.us.
//
// The final JSON result will include additional information returned
// by the zippopotam.us postal code API like:
//
//   * Postal code
//   * Country
//   * Place Name
//   * State
//   * Longitude
//   * Latitude
//

var express = require('express');
var httpReq = require('request');

var app = express();
var portNum = 50001;
      
// Display Ready Message if root path was specified
app.get('/', displayReady);

// REST API to Get Contact Information
app.get('/phone/contact/:lname', getContactInfo);
app.listen(portNum, displayStarted);

//
// This function retrieves the contact information by calling 2 REST APIs [GET]
// - API to get phonebook contact from IMS
// - API to get postal code or zip code information
// and combining the results into a single JSON object
//
function getContactInfo(req, res) {
   var lastName = req.params.lname;
   var contact = { };
   
   //
   // The REST end point below is using the IBM Cloud secure gateway service to enable
   // access to a private network where the original REST API is hosted
   //
   var contactUrl = 'http://cap-sg-prd-2.integration.ibmcloud.com:16476/phonebook/contact/' + lastName;

   httpReq.get(contactUrl, function(error, resp, body) {

      if (error) {
         res.status(500).send(error);
      }

      var phonebook = JSON.parse(body);
      var postal = phonebook.OUTPUT_AREA.OUT_ZIP_CODE;
      
      //
      // Check http://www.zippopotam.us for details on the postal and zip code
      // REST API used in this program
      //
      var addrUrl = 'http://api.zippopotam.us/us/' + postal;

      //
      // Callback function to handle response from the second API call
      //
      var setContactCallback = function(error, resp, body) {
      	
         if (error) {
            res.status(500).send(error);
         }
         var addr = JSON.parse(body);

         //
         // Add the postal code details from the second REST call
         // to the JSON object before sending JSON response
         //
         contact['country'] = addr.country;
         contact['latitude'] = addr.places[0]["latitude"];
         contact['longitude'] = addr.places[0]["longitude"];
         contact['state'] = addr.places[0]["state"];
         contact['city'] = addr.places[0]["place name"];
         res.status(200).send(contact);
      }

      if (phonebook.OUTPUT_AREA.OUT_MESSAGE != 'SPECIFIED PERSON WAS NOT FOUND') {
         //
         // Record found, add the contact fields from the first REST call
         // 
         contact['lastname'] = phonebook.OUTPUT_AREA.OUT_LAST_NAME;
         contact['firstname'] = phonebook.OUTPUT_AREA.OUT_FIRST_NAME;
         contact['extension'] = phonebook.OUTPUT_AREA.OUT_EXTENSION;
         contact['zipcode'] = postal;

         // 
         // Now call the second REST API call to get the address details based
         // on the zip code returned by the first REST API call
         // 
         httpReq.get(addrUrl, setContactCallback);
      }
      else {
      	//
      	// No record was found
      	//
        contact['status'] = 'Contact record not found';
        res.status(200).send(contact);
      }
  });
}

function displayReady(req, res) {
  res.write("=====================================================================\n");
  res.write("=         Node.js sample application running on port 50001.         =\n");
  res.write("=====================================================================\n");
  res.write("=  *****  ******   ***   ****  **    **    ****** **  **    ******  =\n");
  res.write("=  ** *** **      ** **  ** **  **  **     **  ** *** **       **   =\n");
  res.write("=  *****  ****** ******* **  **  ****      **  ** ******      **    =\n");
  res.write("=  ** **  **     **   ** ** **    **       **  ** ** ***     **     =\n");
  res.write("=  **  ** ****** **   ** ****     **       ****** **  **    ******  =\n");
  res.write("=====================================================================\n");
  res.end();
}

function displayStarted() {
  console.log('Demo application listening on port ' + portNum);
}
