let request = require('request'),
    mongo = require('mongodb').MongoClient,
    assert = require('assert');

const connectionString = process.env.DBCONNECT;

module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    context.log(timeStamp);
    
    if(myTimer.isPastDue)
    {
        context.log('Node.js is running late!');
    }
    context.log('Node.js timer trigger function ran!', timeStamp); 

    mongo.connect(connectionString, function(err, db) {
      assert.equal(null, err);
      var col = db.collection('_User');
      col.find({chanceEncounterMode:true},{username:1,Location:1,_id:0}).toArray(function(err, docs) {
        context.log(JSON.stringify(docs));
      });
      db.close();
    });

    var msg = 'Found a match for you!';

    request.post({
        url: process.env.PARSEPUSHURL,
        headers: {
            'X-Parse-Application-Id': process.env.APP_ID,
            'X-Parse-Master-Key': process.env.MASTER_KEY,
            'Content-Type': 'application/json'
        },
        json: {
            'where': { 
                "userID": process.env.testUserID
            }, 
            'data': { 
                'alert': msg
            }
        }
    }, function(err, resp) {
        context.log('got resp');
        if(err) context.log(err);
        try {
            //context.log(resp);
        } catch(e) {
            context.log(e);
        } finally {
            context.log('sending SMS...');

            context.bindings.message = {
                body: msg,
                to: process.env.TWILIO_TO,
                from: process.env.TWILIO_FROM
            };
            context.done();
        }
  });
};