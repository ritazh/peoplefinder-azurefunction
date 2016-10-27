let request = require('request'),
    mongo = require('mongodb').MongoClient,
    assert = require('assert');

const connectionString = process.env.DBCONNECT;

module.exports = function (context, inputQueueItem) {
  context.log('Get inputQueueItem...');
    
  if(!inputQueueItem)
  {
      context.log('inputQueueItem is null');
      context.done();
  }
  context.log('Node.js queue function ran!'); 
  context.log(inputQueueItem);

  var user = inputQueueItem;
  
  mongo.connect(connectionString, function (err, db) {
    assert.equal(null, err);
    var users = db.collection('_User');
    users.find({ username: user }, { Interests: 1, _id: 0 }).toArray(function (err, docs) {
        context.log(docs.length);
        context.log(JSON.stringify(docs));

        if (docs.length > 0){
          var userInterests = docs[0].Interests;
          context.log(userInterests);
          context.log('before aggregate');

          users.aggregate([
              { $match: { Interests: { $in: userInterests } } },
              {
                  $project: {
                    "username": 1,
                    "screenName": 1,
                    "matches":
                    { $setIntersection: [userInterests, "$Interests"] },
                    "matchSize": { $size: { $setIntersection: [userInterests, "$Interests"] } }

                  }
              },
            { $sort: { matchSize: -1 } },
            { $limit: 2 }
          ]).toArray(function (err, matchdocs) {
              context.log('after get matchdocs');
              context.log(matchdocs);
              context.log(matchdocs.length);
              
              var msg = "We've found a match for you, " + user + '!';
              context.log(msg);
              context.done();
              db.close();
            });

        }else{
          context.log('user has no interests');
          context.done();
          db.close();
        }
    });
  });

  //var msg = 'Found a match for you, ' + user;

  // if (user){
  //   request.post({
  //     url: process.env.PARSEPUSHURL,
  //     headers: {
  //         'X-Parse-Application-Id': process.env.APP_ID,
  //         'X-Parse-Master-Key': process.env.MASTER_KEY,
  //         'Content-Type': 'application/json'
  //     },
  //     json: {
  //         'where': { 
  //             "userID": process.env.testUserID
  //         }, 
  //         'data': { 
  //             'alert': msg
  //         }
  //     }
  //   }, function(err, resp) {
  //       context.log('got resp');
  //       if(err) context.log(err);
  //       try {
  //           //context.log(resp);
  //       } catch(e) {
  //           context.log(e);
  //       } finally {
  //           context.log('sending SMS...');

  //           context.bindings.message = {
  //               body: msg,
  //               to: process.env.TWILIO_TO,
  //               from: process.env.TWILIO_FROM
  //           };
  //           context.done();
  //       }
  //   });
  // }else{
  //   context.done();
  // }
};