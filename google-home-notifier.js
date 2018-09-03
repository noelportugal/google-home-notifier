var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');
var browser;
var deviceName;
var deviceAddress;
var language;
var ttsTimeout = 1000;

var device = function(name, lang = 'en') {
    deviceName = name;
    language = lang;
    return this;
};

var ip = function(ip, lang = 'en') {
  deviceAddress = ip;
  language = lang;
  return this;
}

var timeout = function(timeout) {
  ttsTimeout = timeout;
  return this;
};

var googletts = require('google-tts-api');
var googlettsaccent = 'us';
var accent = function(accent) {
  googlettsaccent = accent;
  return this;
}

var createMdnsBrowser = function() {
  var sequence = [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ?
      mdns.rst.DNSServiceGetAddrInfo() :
        mdns.rst.getaddrinfo({families:[4]}),
        mdns.rst.makeAddressesUnique()
  ];
  return mdns.createBrowser(mdns.tcp('googlecast'),
    {resolverSequence: sequence});
};

var notify = function(message, callback) {
  if (!deviceName) {
    console.log('deviceName should be supplied before notify');
    callback();
    return;
  }
  if (!deviceAddress){
    browser = createMdnsBrowser();
    browser.start();
    browser.on('error', function(err) {
        console.log(err);
        browser.stop();
        callback();
    });
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(deviceName.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getSpeechUrl(message, deviceAddress, function(res) {
          callback(res);
        });
      } else {
        callback();
      }
      browser.stop();
    });
  }else {
    getSpeechUrl(message, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var play = function(mp3_url, callback) {
  if (!deviceName) {
    console.log('deviceName should be supplied before play');
    callback();
    return;
  }
  if (!deviceAddress){
    browser = createMdnsBrowser();
    browser.start();
    browser.on('error', function(err) {
        console.log(err);
        browser.stop();
        callback();
    });
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(deviceName.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getPlayUrl(mp3_url, deviceAddress, function(res) {
          callback(res);
        });
      } else {
        callback();
      }
      browser.stop();
    });
  }else {
    getPlayUrl(mp3_url, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var getSpeechUrl = function(text, host, callback) {
  googletts(text, language, 1, ttsTimeout, googlettsaccent).then(function (url) {
    onDeviceUp(host, url, function(res){
      callback(res)
    });
  }).catch(function (err) {
    console.error(err.stack);
  });
};

var getPlayUrl = function(url, host, callback) {
    onDeviceUp(host, url, function(res){
      callback(res)
    });
};

var onDeviceUp = function(host, url, callback) {
  var client = new Client();
  client.connect(host, function() {
    client.launch(DefaultMediaReceiver, function(err, player) {

      var media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED' // or LIVE
      };
      player.load(media, { autoplay: true }, function(err, status) {
        client.close();
        callback('Device notified');
      });
    });
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    client.close();
    callback('error');
  });
};

exports.ip = ip;
exports.device = device;
exports.accent = accent;
exports.timeout = timeout;
exports.notify = notify;
exports.play = play;
