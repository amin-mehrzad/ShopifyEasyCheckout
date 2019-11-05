const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
//const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const https = require('https');

//mongoDB
var monk = require('monk');
var db = monk('0.tcp.ngrok.io:19249/validage');


var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var auth = require('./routes/auth');
var indexRouter = require('./routes/index');
//var load = require('./routes/load');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Make our db accessible to our router
app.use(function (req, res, next) {
  req.db = db;
  next();
});


app.use('/shopify', auth);
app.use('/', indexRouter);
//app.use('/', load);

// Find a record
var findStoreRecord = function (websiteKey) {
  return new Promise(function (resolve, reject) {
    //do something, fetch something....
    //you guessed it, mongo queries go here.
    db.collection('usercollection').find({ "websiteKey": websiteKey })
      .then(function (res) {
        resolve(res);
      })
    //I can continue to process my result inside my promise
    if (false) { reject('aasdasdas'); }

  });
}

//if(false)
app.post('/webhooks/orders/updated', function (req, res) {
  console.log('----------------------------------------------------------------------');
  console.log(req.body.id)

  var orderID = req.body.id;
  var orderProducer = req.body.order_status_url;
  splitedOrderProducer = orderProducer.split("/");
  var websiteKey = JSON.parse(splitedOrderProducer[3]);
  var shopOrigin = splitedOrderProducer[2];
  console.log(websiteKey);
  console.log(shopOrigin);

  findStoreRecord(websiteKey).then(function (websiteData) {
    console.log(websiteData[0].accessToken);
    var accessToken = websiteData[0].accessToken
    const orderData = req.body;
    var cartToken = orderData.cart_token;
    var date = orderData.created_at;
    var totalPrice = orderData.total_price;
    var orderNote = orderData.note;
    var orderTags = orderData.tags;

    console.log(orderTags);
    const shippingAddress = orderData.shipping_address;

    const validageData = {
      order: {
        order_number: orderID,
        order_status: "processing",
        order_date: date,
        order_total: totalPrice,
        order_data: orderData,
        order_billing: orderData.billing_address,
        order_shipping: shippingAddress
      },
      session_id: cartToken,
      website_version: "Shopify",
      website_key: websiteData[0].publicKey
    }

    const validageOptions = {
      hostname: 'cloud.validage.com',
      path: '/person/easycheck_shopify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${websiteData[0].secretKey}`
      }
    }

    const reqValidage = https.request(validageOptions, resp => {
      console.log(`statusCode: ${resp.statusCode}`)

      resp.on('data', d => {
        try {
          var resObj = JSON.parse(d);
          console.log('++++++++++')
        }
        catch (e) {
          console.log(e);
          console.log(e.message);
          return
        }
        var cyaCode = resObj.cya_code;

        //Changing Status,Note and Tag;


        if (cyaCode == 401 && orderNote != "Holded by ValidAge because information is not verified!") {
          const changeStatusData = {
            order: {
              note: "Holded by ValidAge because information is not verified!",
              tags: "Holded"
            }
          }
          const changeStatusOptions = {
            hostname: shopOrigin,
            path: `/admin/api/2019-10/orders/${orderID}.json`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken
            }
          }

          const reqChangeStatus = https.request(changeStatusOptions, respChangeStatus => {
            console.log(`statusCode: ${resp.statusCode}`)

            respChangeStatus.on('data', d => {
              process.stdout.write(d)
            })
          })
          reqChangeStatus.on('error', error => {
            console.error(error)
          })
          reqChangeStatus.write(JSON.stringify(changeStatusData))
          reqChangeStatus.end()
        } else if (cyaCode == 201 && orderNote != "Warning! Information is verified but ValidAge information and billing is not matched!") {
          const changeStatusData = {
            order: {
              note: "Warning! Information is verified but ValidAge information and billing is not matched!",
              tags: "Success"
            }
          }

          const changeStatusOptions = {
            hostname: shopOrigin,
            path: `/admin/api/2019-10/orders/${orderID}.json`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken
            }
          }

          const reqChangeStatus = https.request(changeStatusOptions, respChangeStatus => {
            console.log(`statusCode: ${resp.statusCode}`)

            respChangeStatus.on('data', d => {
              process.stdout.write(d)
            })
          })
          reqChangeStatus.on('error', error => {
            console.error(error)
          })
          reqChangeStatus.write(JSON.stringify(changeStatusData))
          reqChangeStatus.end()
        }else if (cyaCode == 200 && orderNote != "Age verified by ValidAge successfully!!"){
          const changeStatusData = {
            order: {
              note: "Age verified by ValidAge successfully!!",
              tags: "Success"
            }
          }

          const changeStatusOptions = {
            hostname: shopOrigin,
            path: `/admin/api/2019-10/orders/${orderID}.json`,
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken
            }
          }

          const reqChangeStatus = https.request(changeStatusOptions, respChangeStatus => {
            console.log(`statusCode: ${resp.statusCode}`)

            respChangeStatus.on('data', d => {
              process.stdout.write(d)
            })
          })
          reqChangeStatus.on('error', error => {
            console.error(error)
          })
          reqChangeStatus.write(JSON.stringify(changeStatusData))
          reqChangeStatus.end()
        }

        process.stdout.write(d)
      })
    })
    reqValidage.on('error', error => {
      console.error(error)
    })

    reqValidage.write(JSON.stringify(validageData))
    reqValidage.end()

  });
  res.status('200').send("OK")

});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err.message)
  res.render('error');
});

module.exports = app;