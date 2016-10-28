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
  var screenName = '';
  var phone = '';
  
  mongo.connect(connectionString, function (err, db) {
    assert.equal(null, err);
    var users = db.collection('_User');
    users.find({ username: user }, { Interests: 1, matchHistory:1, _id: 0, screenName: 1, phone: 1}).toArray(function (err, docs) {
        context.log(docs.length);
        context.log(JSON.stringify(docs));

        if (docs.length > 0){
          let userInterests = docs[0].Interests;
          let userMatchHistory = docs[0].matchHistory;
          screenName = docs[0].screenName;
          phone = docs[0].phone;
          context.log(userInterests);
          context.log(phone);

          users.aggregate([
              { $match: { $and: [
                {username: { $ne: user }},
                {username: {$not: {$in: userMatchHistory}}},
                {Interests: { $in: userInterests }}
                ] } },
              
              {
                  $project: {
                    "username": 1,
                    "screenName": 1,
                    "matches":
                    { $setIntersection: [userInterests, "$Interests"] },
                    "matchSize": { $size: { $setIntersection: [userInterests, "$Interests"] } }
                  }
              },
            { $match: { matchSize: {$gte: 2}}}, // only allow chance encounters with multiple matching interests
            { $sort: { matchSize: -1 } },
            { $limit: 2 }
          ]).toArray(function (err, matchdocs) {
              context.log('after get matchdocs');
              context.log(matchdocs);

              // if we found matches, add them to match history
              if(matchdocs.length > 0) {
                let matchingUsernames = [];
                matchdocs.forEach(function (item) {
                    matchingUsernames.push(item.username);
                });

                users.update(
                    { username: user },
                    { $push: { matchHistory: { $each: matchingUsernames } } }
                );
              }
              
              // send notifications for each match
              var friends = '';
              for (var i = 0; i < matchdocs.length; i++){
                context.log(matchdocs[i]);
                context.log(matchdocs[i].screenName);
                friends += "@" + matchdocs[i].screenName + ', ';
              }
              if (friends.length > 0){
                friends = friends.substring(0, friends.length-2);
              }

              var msg = screenName + ", we've found matches for you: " + friends + '!';
              context.log(msg);
              db.close();
              if (matchdocs.length > 0){
                request.post({
                  url: process.env.PARSEPUSHURL,
                  headers: {
                      'X-Parse-Application-Id': process.env.APP_ID,
                      'X-Parse-Master-Key': process.env.MASTER_KEY,
                      'Content-Type': 'application/json'
                  },
                  json: {
                      'where': { 
                          "userID": user
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
                            to: phone,
                            from: process.env.TWILIO_FROM
                        };
                        context.done();
                    }
                });
              }else{
                context.log('no match found...');
                context.done();
              }
            });

        }else{
          context.log('user has no interests');
          context.done();
          db.close();
        }
    });
  });
};