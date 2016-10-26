var request = require('request');

module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    context.log(timeStamp);
    
    if(myTimer.isPastDue)
    {
        context.log('Node.js is running late!');
    }
    context.log('Node.js timer trigger function ran!', timeStamp); 

    request.post({
        url: 'https://dosttdemo.azurewebsites.net/parse/push',
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
                'alert': 'Testing push from Azure Function'
            }
        }
    }, function(err, resp) {
        context.log('got resp');
        if(err) context.log(err);
        try {
            context.log(resp);
        } catch(e) {
            context.log(e);
        } finally {
            context.done();
        }
  });
};