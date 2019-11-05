const express = require('express');
const router = express.Router();
const dotenv = require('dotenv').config();
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const https = require('https');
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = ['read_themes', 'write_themes', 'read_script_tags', 'write_script_tags', 'read_checkouts', 'write_checkouts', 'read_orders', 'write_orders'];
const forwardingAddress = process.env.HOST;
var shopifyAPI = require('shopify-node-api');

var websiteKey;
var accessToken;
var webhookID;
// The Athorization Route
router.get('/', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = nonce();
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = 'https://' + shop +
            '/admin/oauth/authorize?client_id=' + apiKey +
            '&scope=' + scopes +
            '&state=' + state +
            '&redirect_uri=' + redirectUri;

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});


// The CallBack Route
router.get('/callback', (req, res) => {

    var db = req.db;

    //DB Update promise

    var myPromise = function (websiteKey, accessToken, webhookID) {
        return new Promise(function (resolve, reject) {
            //do something, fetch something....
            //you guessed it, mongo queries go here.
            db.collection('usercollection').update({ "websiteKey": websiteKey }, {
                $set: {
                    "publicKey": "",
                    "secretKey": "",
                    "websiteKey": websiteKey,
                    "accessToken": accessToken,
                    "webhookID": webhookID
                }
            }, { upsert: true })
                .then(function (resDB) {
                    resolve(resDB);
                    console.log("xxx");
                })
            //I can continue to process my result inside my promise
            if (false) { reject('aasdasdas'); }
        });
    }



    const { shop, hmac, code, state } = req.query;
    const stateCookie = cookie.parse(req.headers.cookie).state;

    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    if (shop && hmac && code) {
        // DONE: Validate request is from Shopify
        const map = Object.assign({}, req.query);
        delete map['signature'];
        delete map['hmac'];
        const message = querystring.stringify(map);
        const providedHmac = Buffer.from(hmac, 'utf-8');
        const generatedHash = Buffer.from(
            crypto
                .createHmac('sha256', apiSecret)
                .update(message)
                .digest('hex'),
            'utf-8'
        );
        let hashEquals = false;
        // timingSafeEqual will prevent any timing attacks. Arguments must be buffers
        try {
            hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
            // timingSafeEqual will return an error if the input buffers are not the same length.
        } catch (e) {
            hashEquals = false;
        };
        if (!hashEquals) {
            return res.status(400).send('HMAC validation failed');
        }

        // DONE: Exchange temporary code for a permanent access token
        const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
        };

        request.post(accessTokenRequestUrl, { json: accessTokenPayload })
            .then((accessTokenResponse) => {
                accessToken = accessTokenResponse.access_token;

                // res.status(200).send("Got an access token, let's do something with it");

                const shopRequestUrl = 'https://' + shop + '/admin/api/2019-10/shop.json';
                const shopRequestHeaders = {
                    'X-Shopify-Access-Token': accessToken,
                };

                request.get(shopRequestUrl, { headers: shopRequestHeaders })
                    .then((shopResponse) => {
                        //  res.status(200).send(shopResponse);
                        //res.status(200).render('auth', { title: ['Valid', 'Age'] })

                        var shopInformation = JSON.parse(shopResponse);
                        websiteKey = shopInformation.shop.id;
                        console.log(accessToken);

                        const webhookRegisterData = JSON.stringify({
                            webhook: {
                                topic: "orders/updated",
                                address: `${forwardingAddress}/webhooks/orders/updated`,
                                // format: "json"
                            }
                        });

                        const webhookOptions = {
                            hostname: shop,
                            path: `/admin/api/2019-10/webhooks.json`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Shopify-Access-Token': accessToken
                            }
                        }

                        const reqWebhook = https.request(webhookOptions, resWebhook => {
                            console.log(`statusCode: ${resWebhook.statusCode}`)
                            resWebhook.setEncoding('utf8');
                            var body = "";
                            resWebhook.on('data', resData => {
                                console.log('--------------------->' + resData);
                                body += resData;
                            });
                            resWebhook.on('end', function () {
                                var resWebhookData = JSON.parse(body);
                                console.log(resWebhookData);
                                if (resWebhook.statusCode == 200 || resWebhook.statusCode == 201) {
                                    webhookID = resWebhookData.webhook.id
                                    console.log(webhookID);
                                    myPromise(websiteKey, accessToken, webhookID).then(function (value) {
                                        console.log(value);
                                    });


                                    //Register Age verification Form Modal Script
                                    const modalScript = JSON.stringify({
                                        script_tag: {
                                            event: 'onload',
                                            src: `https://cloud.validage.com/cache/Shopify.js`
                                        }
                                    })
                                    const scriptOptions = {
                                        hostname: shop,
                                        path: `/admin/api/2019-10/script_tags.json`,
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'X-Shopify-Access-Token': accessToken
                                        }
                                    }

                                    const reqScript2 = https.request(scriptOptions, res => {
                                        console.log(`statusCode: ${res.statusCode}`)
                                        res.on('data', d => {
                                            process.stdout.write(d)
                                        })
                                    })

                                    reqScript2.on('error', error => {
                                        console.error(error)
                                    })
                                    reqScript2.write(modalScript)
                                    reqScript2.end()



                                    res.render('auth', { title: ['Valid', 'Age'], shop: shop })
                                } else {


                                    // Find website record
                                    db.collection('usercollection').update({ "websiteKey": websiteKey }, {
                                        $set: {
                                            "websiteKey": websiteKey,
                                            "accessToken": accessToken
                                        }
                                    }, { upsert: true }).then(function (respDB) {
                                        console.log(respDB);

                                        // Get values frm DB
                                        collection = db.collection('usercollection').find({ websiteKey: websiteKey }, async function (e, doc) {
                                            console.log('00=++++++++++++++', doc[0]);
                                            keys = doc[0];
                                            accessToken = keys.accessToken;
                                        }).then((collection) => {
                                            console.log('1-=++++++++++++++', collection)
                                            res.render('configuration', { title: "Validage Configuration", currentPublicKey: collection[0].publicKey, currentSecretKey: collection[0].secretKey, alert: "invisible", message: "", currentWebsiteKey: collection[0].websiteKey });
                                        })
                                    })
                                }
                            });
                        })
                        reqWebhook.on('error', error => {
                            console.error(error)
                        })
                        reqWebhook.write(webhookRegisterData)
                        reqWebhook.end()


                    })
                    .catch((error) => {
                        res.status(error.statusCode).send(error);
                    });


                // TODO
                // Use access token to make API call to 'shop' endpoint
            })
            .catch((error) => {
                res.status(error.statusCode).send(error.error.error_description);
            });

    } else {
        res.status(400).send('Required parameters missing');
    }
});
module.exports = router;