var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');
var sequence = [
    mdns.rst.DNSServiceResolve(),
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families:[4]}),
    mdns.rst.makeAddressesUnique()
];
var browser = mdns.createBrowser(mdns.tcp('googlecast'), {resolverSequence: sequence});
var deviceAddress;
var language;
var volume;

var device = function(name, lang = 'en') {
    device = name;
    language = lang;
    return this;
};

var ip = function(ip, lang = 'en') {
  deviceAddress = ip;
  language = lang;
  return this;
}

var volume = function(newVolume) {
  if (0.0 <= newVolume && newVolume <= 1.0) {
    volume = newVolume;
  }
}

var googletts = require('google-tts-api');
var googlettsaccent = 'us';
var accent = function(accent) {
  googlettsaccent = accent;
  return this;
}

var notify = function(message, callback) {
console.log('notify');
  if (!deviceAddress){
    browser.start();
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(device.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getSpeechUrl(message, deviceAddress, function(res) {
          callback && callback(res);
        });
      }
      browser.stop();
    });
  }else {
    getSpeechUrl(message, deviceAddress, function(res) {
      callback && callback(res);
    });
  }
};

var play = function(mp3_url, callback) {
console.log('play');
  if (!deviceAddress){
    browser.start();
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(device.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getPlayUrl(mp3_url, deviceAddress, function(res) {
          callback && callback(res);
        });
      }
      browser.stop();
    });
  }else {
    getPlayUrl(mp3_url, deviceAddress, function(res) {
      callback && callback(res);
    });
  }
};

var getSpeechUrl = function(text, host, callback) {
  const url = googletts.getAudioUrl(text, { lang: language });

  onDeviceUp(host, url, function(res){
    callback && callback(res);
  });
};

var getPlayUrl = function(url, host, callback) {
console.log('getPlayUrl');
    onDeviceUp(host, url, function(res){
      callback && callback(res);
    });
};

var onDeviceUp = function(host, url, callback) {
console.log('onDeviceUp');
  var client = new Client();
  var orgVolume;

  var closeClient = function(cb) {
console.error('closeClient');
    if (orgVolume != null) {
      client.setVolume(orgVolume, function() {
        client.close();
        cb && cb();
      });
    } else {
      client.close();
      cb && cb();
    }
  };

  client.connect(host, function() {
    // Save current volume level
    if (volume) {
      client.getVolume(function(err, vol) {
        orgVolume = vol;

        client.setVolume({level: volume}, function(err, vol) {
        });
      });
    }

console.error('launch');
    client.launch(DefaultMediaReceiver, function(err, player) {

      var media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED' // or LIVE
      };

console.error('load');
      player.load(media, { autoplay: true }, function(err, status) {
console.error('load callback');
        if (err) {
          console.log('Error: %s', err.message);
console.dir(err);
          closeClient(function() {
            callback && callback('error');
	  });
        }

        player.on('status', function(status) {
          switch(status.playerState) {
          case 'BUFFERING':
          case 'PLAYING':
            break; // do nothing
          default:
            // Finished. Restore volume level.
            closeClient(function() {
              callback && callback('Device notified');
            });
            break;
          }
        });
      });
    });
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    closeClient(function() {
      callback && callback('error');
    });
  });
};

exports.ip = ip;
exports.device = device;
exports.accent = accent;
exports.volume = volume;
exports.notify = notify;
exports.play = play;
