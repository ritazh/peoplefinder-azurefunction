let request = require('request'),
    mongo = require('mongodb').MongoClient,
    assert = require('assert');

const connectionString = process.env.DBCONNECT;

module.exports = function (context, inputQueueItem) {
    context.log(inputQueueItem);
    
    if(!inputQueueItem)
    {
        context.log('inputQueueItem is null');
        context.done();
    }
    context.log('Node.js queue function ran!'); 

    var user = inputQueueItem;
    ///TODO: Find match for this user


    var msg = 'Found a match for you, ' + user;

    if (user){
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
    }else{
      context.done();
    }
    
};