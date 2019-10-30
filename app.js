const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
//const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');


//mongoDB
var monk = require('monk');
var db = monk('0.tcp.ngrok.io:19249/validage'); 


var createError = require('http-errors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// const apiKey = process.env.SHOPIFY_API_KEY;
// const apiSecret = process.env.SHOPIFY_API_SECRET;
// const scopes = ['read_themes', 'write_themes', 'read_script_tags', 'write_script_tags', 'read_checkouts', 'write_checkouts', 'read_orders', 'write_orders'];
// const forwardingAddress = process.env.HOST;

var auth = require('./routes/auth');
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
  //app.use('/', load);
  

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