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
If you want to run a listner look at the example.js. You can run this from a Raspberry Pi, pc or mac. The examle uses ngrok so it can from outside your network. 

I tested with ifttt.com Maker channel and it worked like a charm
