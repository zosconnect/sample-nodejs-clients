// (C) Copyright IBM Corp. 2018, 2021 All Rights Reserved
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
//    "itemNumber" : "<item-num>",  (valid values: 0010, 0020, ..., 0210)
//    "userID" : "<user>",          (8-char user ID)
//    "chargeDept" : "<dept-id>",   (8-char department ID)
//    "orderQty"  : n-qty,          (1-999)
//    "shiptoStreet" : "<street>",  
//    "shiptoCity" : "<city>",
//    "shiptoState" : "<state>",
//    "shiptoZipcode" : "<zipcode>"
// }
//
// When an order is received, the CICS transaction to process an order
// is called first, the following fields are used as input:
//
//   * User ID (userID)
//   * Department charge dode (chargeDept)
//   * Item reference number (itemNumber)
//   * Order quantity (orderQty)
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
//   * Order Quantity
//   * In-stock Quantity
//   * Ship-to Address (Street, city, state, zipcode)
//   * Order timestamp
//

const express = require('express');
const axios = require('axios');

let app = express();
let portNum = 50002;

// Parses incoming request with JSON payload
app.use(express.json());

// Display Ready Message if root path was specified
app.get('/', displayReady);

// Route to handle REST API to Post An Order
app.post('/product/order', processOrder);
app.listen(portNum, displayStarted);

//
// This function process the order for an item in a product
// catalog by calling 3 REST APIs.
// - API to post an order in CICS
// - API to retrieve details of the item that was ordered in CICS
// - API to add an order record directly into Db2
//
async function processOrder(req, res) {

  const uriPlaceOrder = 'product/catalog/order/item';
  const uriInquireOrder = 'product/catalog/item?itemID=' + req.body.itemNumber;
  const uriLogOrder = 'db2/supplies/order';

  const options = {
    baseURL: 'http://cap-sg-prd-4.securegateway.appdomain.cloud:20522/',
  };

  const suppliesOrder = {
    'DFH0XCP1' : {
       'CA_ORDER_REQUEST' : {
          'CA_USERID' : req.body.userID,
          'CA_CHARGE_DEPT' : req.body.chargeDept,
          'CA_ITEM_REF_NUMBER' : req.body.itemNumber,
          'CA_QUANTITY_REQ' : req.body.orderQty
       }
    }
  };

  try {

    let order = { };

    // Call the first API and wait for response before calling the second API
    // (a) Post the supplies order (CICS), this call updates the VSAM record
    const firstResponse = await axios.post(uriPlaceOrder, suppliesOrder, options);

    if (firstResponse && firstResponse.data.DFH0XCP1.CA_RESPONSE_MESSAGE === 'ORDER SUCCESSFULLY PLACED') {

        order['itemNumber'] = req.body.itemNumber;
        order['chargeDept'] = req.body.chargeDept;
        order['userID'] = req.body.userID;
        order['orderQty'] = req.body.orderQty;

        // Call the second API and wait for response before calling third API
        // (b) Inquire the current supplies inventory (CICS) to get description, in stock quantity and item cost
        const secondResponse = await axios.get(uriInquireOrder, options);

        const inStockQty = secondResponse.data.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.IN_SNGL_STOCK;
        const itemDescription = secondResponse.data.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.CA_SNGL_DESCRIPTION;
        const itemCost = secondResponse.data.DFH0XCP1.CA_INQUIRE_SINGLE.CA_SINGLE_ITEM.CA_SNGL_COST * 1;
        const totalCost = itemCost * req.body.orderQty * 1;

        order['inStockQty'] = inStockQty;
        order['itemDescription'] = itemDescription;
        order['itemCost'] = itemCost.toFixed(2);
        order['totalCost'] = totalCost.toFixed(2);

        const logOrder = {
            'itemNumber' : req.body.itemNumber,
            'userID' : req.body.userID,
            'itemDescription' : itemDescription,
            'chargeDept' : req.body.chargeDept,
            'orderQty' : req.body.orderQty,
            'inStockQty' : inStockQty,
            'shiptoStreet' : req.body.shiptoStreet,
            'shiptoCity' : req.body.shiptoCity,
            'shiptoState' : req.body.shiptoState,
            'shiptoZipcode' : req.body.shiptoZipcode
        };

        // Call the third API and wait for response
        // (c) Log the order record to Db2 for historical data
        const thirdResponse = await axios.post(uriLogOrder, logOrder, options);

        order['status'] = 'ORDER COMPLETED SUCCESSFULLY';
        res.status(200).send(order);
    }
    else {
        order['itemNumber'] = req.body.itemNumber;
        order['orderQty'] = req.body.qty;
        order['status'] = 'ORDER NOT SUBMITTED';
        res.status(200).send(order);
      }

  } catch (error) {
    console.log(error.response.data);
    console.log(error.response.status);
    console.log(error.response.headers);
    res.status(error.response.status).send(error.toJSON());
  }
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
  console.log('Node.js version is ' + process.version);
  console.log('Demo application listening on port ' + portNum);
}
