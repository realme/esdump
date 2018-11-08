var request = require('request');
var url = require('url');
var fs   = require('fs');
var argv = require('optimist').argv;
logger = console

function fix2number(n) {
    return [0,n].join('').slice(-2);
}

function getTime(format) {
    var curdate = new Date();
    if (format == undefined) return curDate;
    format = format.replace(/Y/i, curdate.getFullYear());
    format = format.replace(/m/i, fix2number(curdate.getMonth() + 1));
    format = format.replace(/d/i, fix2number(curdate.getDate()));
    format = format.replace(/H/i, fix2number(curdate.getHours()));
    format = format.replace(/M/i, fix2number(curdate.getMinutes()));
    format = format.replace(/S/i, fix2number(curdate.getSeconds()));
    format = format.replace(/ms/i, curdate.getMilliseconds());
    return format;
}



logger.log(argv)
// For future developers.	If you add config here, be sure to add the option to test suite tests where necessary
var defaults = {
	input : "http://localhost:9200/index/_search?scroll=10m",
	auth	: "",
	limit: 	10000,
	id: 	0,
	max:	2,
	output:	"/data/es_dump/",
};

var config = {};
for(var i in defaults){
	config[i] = defaults[i];
	if(argv[i]){
		config[i] = argv[i];
	}
}
var lastScrollId = ""
var total = 0
var lastCount = 0

var saveData = function(id, count,  datas) {
	var output = ""
	for (data of datas) {
		output += JSON.stringify(data) + "\n" ;
	}
	var nowDate = new Date();
	var nowTime = getTime("YmdHMS")

	fname = config.output + "/" + nowTime + "." + id + "." + count + ".json"
	logger.log(nowTime + " File: " + fname)
	fs.writeFileSync(fname, output)
}

var httpHeader = function() { 
	var header = {
			"Content-Type": "application/json"
		}
	if (config.auth != "") { 
		header["Authorization"] = config.auth
	}

	return header 
}

var scrollData = function(lastScrollId, id) {
	///_search/scroll?scroll=10m
	scroll_url = url.parse(config.input)
	//"http://localhost:9200/_search/scroll?scroll=10m",
	var searchBody= {
		"scroll" : "10m",
		"scroll_id" : lastScrollId
		}
	var req = {
		"uri": scroll_url.protocol + "//" + scroll_url.host + "/_search/scroll" ,
		"headers" : httpHeader(),
		"method": "POST",
		"body": JSON.stringify(searchBody)
	}
	//logger.log("INFO", req)
	request.get(req, function requestResonse(err, response) {
		if (err) {
			logger.log("Err.......1", req)
			return;
		} else if (response.statusCode !== 200) {
			err = new Error(response.body);
			logger.log("Err.......2", response)
			return;
		}

		var body = JSON.parse(response.body);
		lastScrollId = body._scroll_id;
		total = body.hits.total
		lastCount += body.hits.hits.length
		logger.log("INFO", "totlal:", total, "lastCount:", lastCount, "id:", id, body._scroll_id, lastScrollId)
		saveData(id, lastCount, body.hits.hits) ;
		if (lastCount < total) {
			scrollData(lastScrollId, id)
		}
	})
}

var searchBody = {
	"slice": {
		"id": config.id,
		"max": config.max
	},
	"query": {
		"match_all": {}
	},
	"size": config.limit
}
var req = {
	"uri": config.input,
	"headers" : httpHeader(),
	"method": "GET",
	"sort": [ "_doc" ],
	"body": JSON.stringify(searchBody)
}
logger.log("INFO", req)
request.get(req, function requestResonse(err, response) {
	if (err) {
		logger.log("Err", req)
		return;
	} else if (response.statusCode !== 200) {
		err = new Error(response.body);
		logger.log("Err", req, response)
		return;
	}

	var body = JSON.parse(response.body);
	lastScrollId = body._scroll_id;
	total = body.hits.total  ;
	lastCount = body.hits.hits.length  ;
	logger.log("INFO", "totlal:", total, "lastCount:", lastCount, body._scroll_id, lastScrollId) ;
	saveData(config.id, lastCount, body.hits.hits) ;
	scrollData(lastScrollId, config.id) ;
})
