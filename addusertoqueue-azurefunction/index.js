let mongo = require('mongodb').MongoClient,
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

    var user = {};
    mongo.connect(connectionString, function(err, db) {
      assert.equal(null, err);
      var col = db.collection('_User');
      col.find({chanceEncounterMode:true},{username:1,Location:1,_id:0}).toArray(function(err, docs) {
        context.log(JSON.stringify(docs));
        context.log(docs.length);
        if (docs.length > 0){
          context.log('adding user');
          user = docs[0];
          var username = user.username;
          context.log(username);
          // Add user to queue
          context.bindings.outputQueueItem = username;
          context.done();
        } else{
          context.log('no user added');
          context.done();
        }
      });
      db.close();
    });

    
    
};