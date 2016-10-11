#!/usr/bin/env node

// Disable hibernation if plex is streaming media
var fs = require('fs');
var exec = require('child_process').exec;
var events = require('events');
var http = require('http');
var parseString = require('xml2js').parseString;

// Start event loop.
var emitter = new events.EventEmitter();
var enabled = true;
var token = process.argv[2] // Pass token as argument

// Daemonize
if (process.argv[2] != "test") {
  require('daemon')()
}

setInterval(() => {

  // Disable if this file exists
  fs.exists(process.env.HOME + "/awake", (exists) => {
    enabled=!exists
  });

  // Do it
  if (enabled) {
    http.get("http://localhost:32400/status/sessions?X-Plex-Token=" + token, (res) => {
      res.on('data', (xml) => {
        parseString(xml, (err, result) => {
          if(result.MediaContainer.$.size == 0) {
            emitter.emit("idle");
          } else {
            emitter.emit("streaming");
          }
        });
      });
    });
  } else {
    emitter.emit("streaming");
  }
},1000);

// Handle events
emitter
  .on("streaming",() => {
    exec("DISPLAY=:0 gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type", (error, stdout, stderr) => {
      if (error) {
        console.log("ERROR: " + stderr);
      } else if (stdout.trim() == "'suspend'") {
        exec("DISPLAY=:0 gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type nothing", (error, stdout, stderr) => {
          if (error) {
            console.log("ERROR: " + stderr);
          } else {
            console.log('Plex is streaming media, suspend disabled');
          }
        });
      }
    });
  }).on("idle",() => {
    exec("DISPLAY=:0 gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type", (error, stdout, stderr) => {
      if (error) {
        console.log("ERROR: " + stderr);
      } else if (stdout.trim() == "'nothing'") {
        exec("DISPLAY=:0 gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type suspend", (error, stdout, stderr) => {
          if (error) {
            console.log("ERROR: " + stderr);
          } else {
            console.log('Plex is not streaming media, suspend enabled');
          }
        });
      }
    });
  });

// ... never ends
