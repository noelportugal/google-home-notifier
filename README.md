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
