const express = require('express'),
    router = express.Router();


router.get('/admin', (req, res, next) => {
    try {
        res.render('configuration', { title: "Validage Configuration", currentPublicKey: publicKey, currentSecretKey: secretKey, alert: "invisible",message:"" });

        // console.log(data);

        // websiteKey = data.store_hash;

        // // Set our internal DB variable
        // var db = req.db;

        // // Set our collection
        // var collection = db.get('usercollection');

        // // Find website record
        // collection.find({ websiteKey: websiteKey }, {}, function (e, doc) {
        //     console.log(doc[0]);

        //     keys = doc[0];
        //     accessToken = keys.accessToken;

        //     // Get values frm DB
        //     if (typeof keys === 'undefined') {
        //         var secretKey = '';
        //         var publicKey = '';
        //     } else {
        //         var secretKey = keys.secretKey;
        //         var publicKey = keys.publicKey;
        //     }
        // });
        console.log('***********************************************');

    } catch (err) {
        next(err);
    }
});

module.exports = router;