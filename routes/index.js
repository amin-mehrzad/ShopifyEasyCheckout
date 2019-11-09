var express = require('express');
var router = express.Router();
const https = require('https');

/* POST to Add User Service */
router.post('/addKey', function (req, res, next) {
    console.log('1--------------------++++++++++++++++');
    console.log(req.body.websiteKey);

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
                    accessToken = docFind[0].accessToken
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
                                'Content-Type': 'application/json',
                                'X-Shopify-Access-Token': accessToken
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
            res.render('configuration', { title: "Validage Configuration", currentPublicKey: publicKey, currentSecretKey: secretKey, alert: alert, message: message, currentWebsiteKey: websiteKey });
        });

    })

    reqCheck.on('error', error => {
        console.error(error)
    })
    reqCheck.write(checkKeysData)
    reqCheck.end()


})

router.post('/cleanTheme', function (req, res, next) {
    console.log('1--------------------++++++++++++++++');
    console.log(req.body.websiteKey);

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var websiteKey = JSON.parse(req.body.websiteKey);
    var shopOrigin = req.cookies.shopOrigin
    var accessToken


    // Set our collection
    var collection = db.get('usercollection');








    console.log(websiteKey);

    db.collection('usercollection').find({ "websiteKey": websiteKey }, function (errFind, docFind) {
        console.error(errFind)
        console.log(docFind)
        console.log('-------------------------------------------------------$$$$$$$')
        accessToken = docFind[0].accessToken

        // Submit to the DB
        collection.update({ "websiteKey": websiteKey }, {
            $set: {
                "publicKey": "",
                "secretKey": "",
                "websiteKey": websiteKey
            }
        }, { upsert: true }, function (err, doc) {
            if (err) {

                // If it failed, return error
                res.send("There was a problem adding the information to the database.");
                console.log(err);
            } else {

                //Modify cart page

                // (1)Get theme IDs
                const themesOptions = {
                    hostname: shopOrigin,
                    path: `/admin/api/2019-10/themes.json`,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': accessToken
                    }
                }

                const reqThemes = https.request(themesOptions, resThemes => {
                    console.log(`statusCode: ${resThemes.statusCode}`)
                    resThemes.setEncoding('utf8');
                    var body = "";
                    resThemes.on('data', respData => {
                        console.log('--------------------->' + respData);
                        body += respData;
                    });
                    resThemes.on('end', function () {
                        var resThemesData = JSON.parse(body);
                        console.log(resThemesData);
                        resThemesData.themes.forEach(function (theme) {
                            if (theme.role == 'main') {
                                const themeID = theme.id;


                                // (2)Get Cart Page source from Asset API
                                const assetOptions = {
                                    hostname: shopOrigin,
                                    path: `/admin/api/2019-10/themes/${themeID}/assets.json?asset[key]=sections/cart-template.liquid&theme_id=${themeID}`,
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-Shopify-Access-Token': accessToken
                                    }
                                }

                                const reqAsset = https.request(assetOptions, resAsset => {
                                    console.log(`statusCode: ${resAsset.statusCode}`)
                                    resAsset.setEncoding('utf8');
                                    var body = "";
                                    resAsset.on('data', respoData => {
                                        body += respoData;
                                    });
                                    resAsset.on('end', function () {
                                        var resAssetData = JSON.parse(body);
                                        var cartSource = resAssetData.asset.value;

                                        cartSourceReplaced = cartSource.replace( 'name="checkout" disabled','name="checkout"');

                                        // (3)Update Cart Page source using Asset API
                                        const cartData = JSON.stringify({
                                            asset: {
                                                key: 'sections/cart-template.liquid',
                                                value: cartSourceReplaced
                                            }
                                        })
                                        const cartOptions = {
                                            hostname: shopOrigin,
                                            path: `/admin/api/2019-10/themes/${themeID}/assets.json`,
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-Shopify-Access-Token': accessToken
                                            }
                                        }

                                        const reqCart = https.request(cartOptions, resCart => {
                                            console.log(`statusCode: ${resCart.statusCode}`)
                                            resCart.on('data', responData => {
                                                process.stdout.write(responData)
                                            });
                                        })

                                        reqCart.on('error', error => {
                                            console.error(error)
                                        })

                                        reqCart.write(cartData)
                                        reqCart.end()

                                    })
                                })

                                reqAsset.on('error', error => {
                                    console.error(error)
                                })

                                reqAsset.end()



                            }
                        });
                    })
                })

                reqThemes.on('error', error => {
                    console.error(error)
                })

                reqThemes.end()

            }

        });



    })



    message = "Additiona template codes removed successfully. Now you can uninstall your ValidAge app."

    alert = "alert-warning visible"

    res.render('configuration', { title: "Validage Configuration", currentPublicKey: "", currentSecretKey: "", alert: alert, message: message, currentWebsiteKey: websiteKey });
});



/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', { title: 'Express' });
});


module.exports = router;
