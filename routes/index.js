var express = require('express');
var router = express.Router();
const https = require('https');

/* POST to Add User Service */
router.post('/addKey', function (req, res, next) {

  console.log('1--------------------++++++++++++++++');
  //console.log(websiteKey);
  console.log('2--------------------++++++++++++++++');
  console.log(req.body.websiteKey);
console.log();
  // Set our internal DB variable
  var db = req.db;

  // Get our form values. These rely on the "name" attributes
  var secretKey = req.body.secretKey;
  var publicKey = req.body.publicKey;
  var websiteKey = JSON.parse(req.body.websiteKey);
  var shopOrigin = req.cookies.shopOrigin
  var accessToken


  // Set our collection
  var collection = db.get('usercollection');

  const checkKeysData = JSON.stringify({
    "website_key": publicKey,
    "secret_key": secretKey
  })
  const checkKeysOptions = {
    hostname: 'cloud.validage.com',
    path: '/check_keys',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      // 'X-Auth-Token': accessToken,
      // 'X-Auth-Client': 'rnocx3o086g0zb0py2d9i9d8v6jxnha'
    }
  }

  const reqCheck = https.request(checkKeysOptions, resCheck => {
    console.log(`statusCode: ${resCheck.statusCode}`)

    resCheck.on('data', checkKeyDataString => {
      process.stdout.write(checkKeyDataString)
      checkKeyData = (JSON.parse(checkKeyDataString))
      var message = checkKeyData.cya_message
      var code = checkKeyData.cya_code


      if (code == "200") {
        alert = "alert-success visible";
        message = "Your Information Succesfully Saved."
        console.log(websiteKey);

        db.collection('usercollection').find({ "websiteKey": websiteKey }, function (errFind, docFind) {
            console.error(errFind)
          console.log(docFind)
          console.log('-------------------------------------------------------$$$$$$$')
            accessToken=docFind[0].accessToken
          if (docFind[0].publicKey == "") {
           // if (false) {
            //Register Age verification Popup Script
            const popupScriptData = JSON.stringify({
                script_tag: {
                  event: 'onload',
                  src: `https://cloud.validage.com/cache/${publicKey}.js`
                }
              })
            const scriptOptions = {
              hostname: shopOrigin,
              path: `/admin/api/2019-10/script_tags.json`,
              method: 'POST',
              headers: {
                // 'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
               // 'X-Auth-Client': 'rnocx3o086g0zb0py2d9i9d8v6jxnha'
              }
            }

            const reqScript1 = https.request(scriptOptions, res => {
              console.log(`statusCode: ${res.statusCode}`)

              res.on('data', d => {
                process.stdout.write(d)
              })
            })

            reqScript1.on('error', error => {
              console.error(error)
            })
            reqScript1.write(popupScriptData)
            reqScript1.end()

            // And forward to success page   
 
          }

          // Submit to the DB
          collection.update({ "websiteKey": websiteKey }, {
            $set: {
              "publicKey": publicKey,
              "secretKey": secretKey,
              "websiteKey": websiteKey
            }
          }, { upsert: true }, function (err, doc) {
            if (err) {
              // If it failed, return error
              res.send("There was a problem adding the information to the database.");
              console.log(err);
            }
            else {
            }
          });

        })

      } else {
        if (message == "Website key is wrong.") {
          message = "Public Key is wrong! Please input correct information."
          publicKey = ""
        } else {
          message = "Secret Key is wrong! Please input correct information."
          secretKey = ""
        }


        alert = "alert-danger visible"
      }
      res.render('configuration', { title: "Validage Configuration", currentPublicKey: publicKey, currentSecretKey: secretKey, alert: alert, message: message,currentWebsiteKey: websiteKey });
    });

  })

  reqCheck.on('error', error => {
    console.error(error)
  })
  reqCheck.write(checkKeysData)
  reqCheck.end()


})



/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});


module.exports = router;
