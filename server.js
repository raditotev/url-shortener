'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const dns = require('dns');
var bodyParser = require('body-parser');
// var autoIncrement = require("mongodb-autoincrement");
var autoIncrement = require('mongoose-auto-increment');

var connection = mongoose.createConnection(process.env.MONGODB_URI);
autoIncrement.initialize(connection);

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
var Schema = mongoose.Schema;
var urlSchema = new Schema({
  short_url: Number,
  url: String 
});

urlSchema.plugin(autoIncrement.plugin, {
  model: 'URL',
  field: 'short_url',
  startAt: 1,
  incrementBy: 1
});
var URL = mongoose.model('URL', urlSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// Create short URL
app.post("/api/shorturl/new", (req, res) => {
  //   Validate posted url
  var validUrl = /https?:\/\/www\..+\.\w+(\/.+)*/i
  if(!req.body.url.match(validUrl))
    return res.json({"error":"invalid URL"});
  
  //   Remove protocol and www
  var regexp = /https?:\/\/www\./i
  var url = req.body.url.replace(regexp, '')
  
  //   Check if real address
  dns.lookup(url, (err, address) => {
    if(err) {
      if(err.code == 'ENOTFOUND'){
        return res.json({"error":"Webpage not found"});
      } else {
      return console.log(err);
      }
    }
    // If new url create record, else show existing short url        
    var original_url = req.body.url;
    URL.findOne({url: original_url}, (err, data) => {
      if (err)
        return console.log(err);
      
      if(data){
        send_response(data, res);
      } else {
        var new_entry = new URL({url: original_url});
        new_entry.save((err, data) => {
          if(err)
            return console.log(err);
          send_response(data, res);
        });
      }
    });
  });
});

var send_response = (data, res) => {
  res.json({
    "original_url": data.url,
    "short_url": data.short_url
  });
}

// Open short URL
app.get('/api/shorturl/:short_url_id', (req, res) => {
  var short_url = Number(req.params.short_url_id);
  URL.findOne({short_url: short_url}, (err, data) => {
    if(err)
      return console.log(err); 
    if(data){
      res.writeHead(301,
        {Location: data.url}
      );
      res.end();
    } else {
      res.json({"error": "not found"});  
    }
  });
});

mongoose.connect(process.env.MONGODB_URI, (err, connection) => {
  if(err)
    console.log(err);
  app.listen(port, function () {
    console.log('Node.js listening ...');
  });
});