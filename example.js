var express = require('express');
var googlehome = require('./google-home-notifier');
var ngrok = require('ngrok');
var bodyParser = require('body-parser');
var app = express();
const serverPort = 8091; // default port

var deviceName = 'Google Home';
var ip = '192.168.1.20'; // default IP

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.post('/google-home-notifier', urlencodedParser, function (req, res) {
  
  if (!req.body) return res.sendStatus(400)
  console.log(req.body);
  
  var text = req.body.text;
  
  if (req.body.ip) {
     ip = req.body.ip;
  }

  var language = 'pl'; // default language code
  if (req.body.language) {
    language = req.body.language;
  }
  if (req.body.timeout) {
    googlehome.timeout(Number(req.body.timeout));
  }

  googlehome.ip(ip, language);
  googlehome.device(deviceName,language);
  googlehome.accent(language);

  if (text){
    try {
      if (text.startsWith('http')){
        var mp3_url = text;
        googlehome.play(mp3_url, function(notifyRes) {
          if (!notifyRes) {
            res.send(deviceName + ' cannot play sound.\n');
            return;
          }
          console.log(notifyRes);
          res.send(deviceName + ' will play sound from url: ' + mp3_url + '\n');
        });
      } else {
        googlehome.notify(text, function(notifyRes) {
          if (!notifyRes) {
            res.send(deviceName + ' cannot say text.\n');
            return;
          }
          console.log(notifyRes);
          res.send(deviceName + ' will say: ' + text + '\n');
        });
      }
    } catch(err) {
      console.log(err);
      res.sendStatus(500);
      res.send(err);
    }
  }else{
    res.send('Please POST "text=Hello Google Home"');
  }
})

app.get('/google-home-notifier', function (req, res) {

  console.log(req.query);

  var text = req.query.text;

  if (req.query.ip) {
     ip = req.query.ip;
  }

  var language = 'pl'; // default language code
  if (req.query.language) {
    language = req.query.language;
  }
  if (req.query.timeout) {
    googlehome.timeout(Number(req.query.timeout));
  }

  googlehome.ip(ip, language);
  googlehome.device(deviceName,language);
  googlehome.accent(language);

  if (text) {
    try {
      if (text.startsWith('http')){
        var mp3_url = text;
        googlehome.play(mp3_url, function(notifyRes) {
          if (!notifyRes) {
            res.send(deviceName + ' cannot play sound.\n');
            return;
          }
          console.log(notifyRes);
          res.send(deviceName + ' will play sound from url: ' + mp3_url + '\n');
        });
      } else {
        googlehome.notify(text, function(notifyRes) {
          if (!notifyRes) {
            res.send(deviceName + ' cannot say text.\n');
            return;
          }
          console.log(notifyRes);
          res.send(deviceName + ' will say: ' + text + '\n');
        });
      }
    } catch(err) {
      console.log(err);
      res.sendStatus(500);
      res.send(err);
    }
  }else{
    res.send('Please GET "text=Hello+Google+Home"');
  }
})

app.listen(serverPort, function () {
  ngrok.connect({configPath: '/home/pi/.ngrok2/ngrok.yml', addr: serverPort}, function (err, url) {
    if (err) {
      console.log('ngrok.connect failed');
      console.log(err);
      return;
    }
    console.log('Endpoints:');
    console.log('    http://localhost:' + serverPort + '/google-home-notifier');
    console.log('    ' + url + '/google-home-notifier');
    console.log('GET example:');
    console.log('curl -X GET ' + url + '/google-home-notifier?text=Hello+Google+Home');
	console.log('POST example:');
	console.log('curl -X POST -d "text=Hello Google Home" ' + url + '/google-home-notifier');
  });
})

