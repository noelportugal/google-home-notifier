var express = require('express');
var googlehome = require('./google-home-notifier.js');

var app = express();
const serverPort = 8080;

googlehome.device('Google Home');

app.get('/', function (req, res) {
  var text = req.query.text;
  if (text){
    res.send('Google Home will say: ' + text + '\n');
    googlehome.notify(text, function(res) {
      console.log(res);
    });
  }else{
    res.send('You need to specify ?text=\n');
  }

})

app.listen(serverPort, function () {
  console.log('Listening on port ' + serverPort );
})
