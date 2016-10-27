let request = require('request'),
    mongo = require('mongodb').MongoClient,
    assert = require('assert');

const connectionString = process.env.DBCONNECT;

module.exports = function (context, inputQueueItem) {
    context.log(inputQueueItem);

    if (!inputQueueItem) {
        context.log('inputQueueItem is null');
        context.done();
    }
    context.log('Node.js queue function ran!');

    var user = inputQueueItem;
    ///TODO: Find match for this user

    mongo.connect(connectionString, function (err, db) {
        assert.equal(null, err);
        var col = db.collection('_User');
        col.find({ userName: user }, { Interests: 1, _id: 0 }).toArray(function (err, docs) {
            var userInterests = docs[0].Interests;
            context.log(userInterests);
            col.aggregate([
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
            ]).toArray(sendMessage(err, matchdocs));

        });
        db.close();

    });

    function sendMessage(err, matchdocs) {

        var msg = `Found a match for you, ${user}: ${matchdocs[0].userName}, with common interests: ${matchdocs[0].Interests}!`;

        if (user) {
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
            }, function (err, resp) {
                context.log('got resp');
                if (err) context.log(err);
                try {
                    //context.log(resp);
                } catch (e) {
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
        } else {
            context.done();
        }
    };

};