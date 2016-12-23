# google-home-notifier
Send notifications to Google Home

#### Installation
```sh
$ npm install google-home-notifier
```

#### Usage
```javascript
var googlehome = require('google-home-notifier');
googlehome.device('Google Home');
googlehome.notify('Hey Foo', function(res) {
  console.log(res);
});
```

#### Listener
If you want to run a listner look at the example.js. You can run this from a Raspberry Pi, pc or mac. The example uses ngrok so the server can be reached from outside your network. I tested with ifttt.com Maker channel and it worked like a charm

```sh
$ git clone https://github.com/noelportugal/google-home-notifier
$ cd google-home-notifier
$ npm install
$ node example.js
POST "text=Hello Google Home" to:
    http://localhost:8080/google-home-notifier
    https://xxxxx.ngrok.io/google-home-notifier
example:
curl -X POST -d "text=Hello Google Home" https://xxxxx.ngrok.io/google-home-notifier
```
