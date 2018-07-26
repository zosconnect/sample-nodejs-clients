// (C) Copyright IBM Corp. 2018 All Rights Reserved
//
// Licensed under the Apache License, Version 2.0
// which you can read at https://www.apache.org/licenses/LICENSE-2.0
//
// This program shows how to create an orchestration API using Node.js.
// The program can be executed on any platform that supports Node.js including
// z/OS.  
//
// The sample uses the catalog manager application (EGUI) provided with CICS.
// The catalog manager program can inquire products in the catalog, get
// details of a specific item in the catalog, order an item in the catalog,
// and other functions. In this sample, we will use the 'order an item in
// the catalog' and 'get details of a specific item in the catalog'. These 
// CICS functions were exposed as REST APIs using z/OS Connect Enterprise 
// Edition. The products in the catalog (mobile phones) are stored in a 
// VSAM file.
//
// This sample is an HTTP POST call and requires a JSON payload as input.
// The JSON payload should contain the following:
//
// {
//    "item" : "<item-num>",  (valid values: 0010, 0020, ..., 0210)
//    "userid" : "<user>",    (8-char user ID)
//    "dept" : "<dept-id>",   (8-char department ID)
//    "qty"  : n-qty,         (1-999)
//    "street" : "<street>",  
//    "city" : "<city>",
//    "state" : "<state>",
//    "zipcode" : "<zipcode>"
// }
//
// When an order is received, the CICS transaction to process an order
// is called first, the following fields are used as input:
//
//   * User ID (userid)
//   * Department charge dode (dept)
//   * Item reference number (item)
//   * Order quantity (qty)
//
// After order is processed, the get item details function is called. The 
// following fields are returned:
//
//   * Item reference number
//   * Item description
//   * Department
//   * Items in stock
//   * Cost per item
//   * Items on order
//
// Once product is ordered it is logged into a Db2 table in z/OS to keep
// track of the orders. Update to the table is done using Db2 REST service 
// exposed as REST APIs using z/OS Connect Enterprise Edition.  The Db2 table 
// contains columns for the following:
//
//   * Item reference number
//   * User ID
//   * Description
//   * Department charge code
//   * Quantity
//   * Ship-to Address (Street, city, state, zipcode)
//   * Order timestamp
//

var express = require('express');
var httpReq = require('request');

var app = express();
var portNum = 50002;

// Parses incoming request with JSON payload
app.use(express.json());
      
// Display Ready Message if root path was specified
app.get('/', displayReady);

// REST API to Post An Order
app.post('/product/mobile/order', processOrder);
app.listen(portNum, displayStarted);

//
// This function process the order for an item in a product
// catalog by calling 3 REST APIs. 
// - API to post an order in CICS
// - API to retrieve details of the item that was ordered in CICS
// - API to add an order record directly into Db2
//
function processOrder(req, res) {
  
   var order = { };
   
   //
   // JSON structure that will be passed to the HTTP POST
   // call to order an item 
   // 
   var cicsJsonOrder = { 'DFH0XCP1' : {
                           'CA_ORDER_REQUEST' : {
                              'CA_USERID' : req.body.userid,
                              'CA_CHARGE_DEPT' : req.body.dept,
                              'CA_ITEM_REF_NUMBER' : req.body.item,
                              'CA_QUANTITY_REQ' : req.body.qty
                           }
                         }
                       }; 
                        
   //
   // The REST end points used in this sample are all using the IBM Cloud secure gateway 
   // service to enable access to a private network where the original REST APIs are hosted
   //                       
   // Options field for the HTTP POST call to CICS
   //                                      
   var cicsHttpCall = { url : 'http://cap-sg-prd-2.integration.ibmcloud.com:16476/product/catalog/order/mobile',
                        method : 'POST',
                        headers : {
                          'Content-Type': 'application/json'
                        },
                        body : JSON.stringify(cicsJsonOrder)
                      };
                  
   var getItemUrl = 'http://cap-sg-prd-2.integration.ibmcloud.com:16476/product/catalog/mobile?itemID=' + req.body.item; 
   
   // 
   // Call the first API to post an order
   //
   httpReq(cicsHttpCall, function(error, resp, body) {
      
      if (error) {
         res.status(500).send(error);
      }

      var placeOrder = JSON.parse(body);

      //
      // Callback function to handle response from the third API call
      //      
      var logOrderRecord = function (error, resp, body) {
        if (error) {
          res.status(500).send(error);
        }
        
        res.status(200).send(order);
      }

      //
      // Callback function to handle response from the second API call
      // to get item details; then call next API to log order to Db2
      //                  
      var getItemDetails = function (error, resp, body) {
        if (error) {
          res.status(500).send(error);
        }
        
        var itemDetail = JSON.parse(body);

        //
        // Add the details of the order to the JSON object that will
        // be returned by this API
        //        
        order['item'] = req.body.item;
        order['order-qty'] = req.body.qty;
        order['desc'] = itemDetail.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.CA_SNGL_DESCRIPTION
        order['updated-stock'] = itemDetail.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.IN_SNGL_STOCK
        order['status'] = placeOrder.DFH0XCP1.CA_RESPONSE_MESSAGE;

        //
        // JSON structure that will be passed to the HTTP POST
        // call to log order to Db2 
        //        
        var db2LogOrder = { 'item' : req.body.item,
                            'user' : req.body.userid,
                            'desc' : itemDetail.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.CA_SNGL_DESCRIPTION,
                            'dept' : req.body.dept,
                            'qty' : req.body.qty,
                            'street' : req.body.street,
                            'city' : req.body.city,
                            'state' : req.body.state,
                            'zipcode' : req.body.zipcode
                          };     

        //                      
        // Options field for the HTTP POST call to Db2
        //                         
        var db2HttpCall = { url : 'http://cap-sg-prd-2.integration.ibmcloud.com:16476/db2/catalog/order',
                            method : 'POST',
                            headers : {
                              'Content-Type': 'application/json'
                            },
                            body : JSON.stringify(db2LogOrder)
                          };

        // 
        // Finally, call the third API to log order to Db2
        //        
        httpReq(db2HttpCall, logOrderRecord); 
      }
      
      if (placeOrder.DFH0XCP1.CA_RESPONSE_MESSAGE === 'ORDER SUCCESSFULLY PLACED') {      
        // 
        // Now, call the second API to get item details
        //
        httpReq.get(getItemUrl, getItemDetails);
      }
      else {
        //
        // Order was not successful
        //
        order['item'] = req.body.item;
        order['qty'] = req.body.qty;
        order['status'] = 'ORDER NOT SUBMITTED';
        res.status(200).send(order);      
      } 
   });
}

function displayReady(req, res) {
  res.write("=====================================================================\n");
  res.write("=         Node.js sample application running on port 50002.         =\n");
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
