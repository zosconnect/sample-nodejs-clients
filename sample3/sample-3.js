// (C) Copyright IBM Corp. 2020 All Rights Reserved
//
// Licensed under the Apache License, Version 2.0
// which you can read at https://www.apache.org/licenses/LICENSE-2.0
//
// This program shows how Node.js can be use as a light weight rules
// engine. 
//
// For this sample, we use another program in z/OS written in COBOL.
// The COBOL batch program is extended to call a rule hosted in
// Node.js. The rule can be accessed as a REST API and the COBOL batch
// program uses the API requester function of z/OS Connect Enterprise
// Edition to call the REST API hosted on Node.js on z/OS.
// 
// The sample rule handles insurance claims. The following rules
// are used when processing a claim:
//
//   Drug claim - amount exceeded claim limit of $1000
//   Dental claim - amount exceeded claim limit of $800
//   Medical claim - amount exceeded claim limit of $500 
//

var express = require('express');
var rule = require('node-rules');
var request = require('request');

var app = express();
const portNum = 50003;

// Display Ready Message if root path was specified
app.get('/', displayReady);

// Parses incoming request with JSON payload
// app.use(express.json());

// REST API to Get claim result, using POST if we expose via z/OS Connect
app.get('/claim/rule', getClaimResult);

// Assign to server constant so we can handle closing later
const server = app.listen(portNum, displayStarted);

// Handle the termination properly (SIGTERM)
process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(() => {
    console.log('Http server closed.');
  });
});

//
// This function get the result of claim based on claim type and claim amount
// The following fields are passed as query parameters
//  - claimType
//  - claimAmount
//
function getClaimResult(req, res) {

   var results = { };
   
   // Create a Rule Engine instance
   var R = new rule();

   // Add a rule 
   var claimRule = {
       "condition" : function(R) {
         R.when((this.claimType === 'MEDICAL' && this.claimAmount > 100) ||
                (this.claimType === 'DENTAL' && this.claimAmount > 800) ||
                (this.claimType === 'DRUG' && this.claimAmount > 1000));
       },
       "consequence" : function(R) {
         this.result = false;

         R.stop();
       }
   };
   
   // Register claim rule 
   R.register(claimRule);
   
   // Get the data to be used for rule processing from request parameters
   var claimData = {
      'claimType' : req.query.claimType,
      'claimAmount' : req.query.claimAmount
   };

   //   
   // Callbank function to set response from rule processing
   //
   var setResultDetails = function (result) {

     results['claim-type'] = claimData.claimType;
     results['amount'] = claimData.claimAmount;
     var textMsg = '';

     if (result.result) {
     	  results['status'] = 'Accepted';
     	  results['reason'] = 'Normal claim';
     }
     else {
     	  results['status'] = 'Rejected';
     	      	  
     	  switch(claimData.claimType) {
     	  	case 'MEDICAL' :
     	  			results['reason'] = 'Amount exceeded $100. Claim require further review.';
     	  			textMsg = 'SHARE Demo: Submitted claim for ' + claimData.claimType + ' with amount $' + 
     	  			          claimData.claimAmount + ' exceeded $100 limit. Claim require further review.'
     	  			break;
     	  			     	  	
     	  	case 'DENTAL' :
     	  			results['reason'] = 'Amount exceeded $800. Claim require further review.'; 
     	  			textMsg = 'SHARE Demo: Submitted claim for ' + claimData.claimType + ' with amount ' + 
     	  			          claimData.claimAmount + ' exceeded $800 limit. Claim require further review.'
     	  			break;     	  	
     	  	
     	  	case 'DRUG' :
     	  			results['reason'] = 'Amount exceeded $1000. Claim require further review.'; 
     	  			textMsg = 'SHARE Demo: Submitted claim for ' + claimData.claimType + ' with amount ' + 
     	  			          claimData.claimAmount + ' exceeded $1000 limit. Claim require further review.'
     	  			break;
     	  }      
     }
    
     res.status(200).send(results);
   }
   
   // Process the rules using the data passed by caller
   R.execute(claimData, setResultDetails);
}

function displayReady(req, res) {
  res.write("=====================================================================\n");
  res.write("=         Node.js sample application running on port 50003.         =\n");
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
  console.log('Node.js application started and listening on port ' + portNum);
}