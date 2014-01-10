/**
 * grunt-flexcombo
 * 
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var util = require('util');
var fs = require('fs');
var path = require('path');
var http = require('http');
var flexCombo = require('flex-combo');
var jayli = require('jayli-server');
var url = require('url');
var proxy = require('reverse-proxy');

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	grunt.registerMultiTask('flexcombo', 'Start FlexCombo.', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options();

		var that = this;
		var pwd = process.cwd();
		var port = options.port || '80';
		var proxyport = options.proxyport || 8080;
		var prefix = options.urls;
		var localPath = options.target;
		var filter = options.filter || {};
		if(typeof options.proxyHosts === 'object'){
			var proxyHosts = options.proxyHosts;
		} else if(typeof options.proxyHosts === 'string') {
			var proxyHosts = [options.proxyHosts];
		} else {
			var proxyHosts = [];
		}

		var obj = {};
		obj[options.urls] = options.target;
		for(var i in obj){
			obj[i] = path.resolve(pwd,obj[i]);
		}
		var comboInst = flexCombo(process.cwd(), obj,options);
		proxy.createServer({
			port: proxyport,
			map: function (config) {
				if(/([ag]\.tbcdn\.cn|g.assets.daily.taobao.net)/i.test(config.host)){
					config.host = 'localhost';
					config.port = port;
				}
				var proxyHost = false;
				proxyHosts.forEach(function(v,k){
					if(config.host.indexOf(v) >= 0){
						proxyHost = true;
					}
				});
				if(proxyHost){
					config.port = port;
					config.host = 'localhost';
					config.path = prefix + config.path;
					var alias_path = config.path;
					for(var i in filter){
						var regex = new RegExp(i,'i');
						alias_path = alias_path.replace(regex,filter[i]);
					}
					if(alias_path != config.path){
						console.log(green('alias') + ' ' + yellow(config.path));
						console.log(green('alias') + ' ' + blue(' => '));
						console.log(green('alias') + ' ' + yellow(alias_path));
						config.path = alias_path;
					}
				}
				return config;
			}
		});
		http.createServer(function (req, res) {
			comboInst(req, res, function(){
				// get true path
				var truePath = path.resolve(pwd , localPath,req.url.replace('http://'+req.headers.host,'').replace(prefix,'.'));
				truePath = truePath.replace(/\?.*$/,'');
				truePath = truePath.replace(/#.*$/,'').replace('http:/'+req.headers.host,'');
				if(isDir(truePath)){
					if(!/\/$/.test(req.url)){
						res.writeHead(302, {'Content-Type': 'text/html'});
						res.end('<script>window.location.href += "/";</script>');
						return;
					}
					res.writeHead(200, {'Content-Type': 'text/html'});
					var r = getDirFiles(truePath);
					r += '<style>' +
						'p {'+
						'font-family:Tahoma;'+
						'font-size:12px;'+
						'line-height:12px;'+
						'margin:9px 10px'+
						'}'+
						'</style>';
					res.end(r);
				} else if(isFile(truePath)) {
					jayli	
						.deliver('.', req, res,truePath)
						.before(function() {
						})
						.after(function(statCode) {
							log(statCode, req.url);
						});
				} else {
					log(404, req.url, 'Not found');
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end("Error 404: "+req.url);
				}
			});
		}).listen(port);
		console.log('\nPreview: ' + green('http://g.tbcdn.cn'+prefix+'/'));
		showProxyHosts(proxyHosts);
		console.log('\nFlex Combo Server running at '+blue('http://127.0.0.1:'+port));
		console.log('Reverse-Proxy running at '+blue('http://127.0.0.1:'+proxyport));
		console.log('\nYou Can:');
		console.log('  Change Your Hosts file: 127.0.0.1 '+green('a.tbcdn.cn')+' '+green('g.tbcdn.cn'));
		console.log(yellow('OR'));
		console.log('  Configure Browser HTTP Proxy or Mobi Device HTTP Proxy: '+green('IP:'+proxyport));
		console.log('\nHelp: '+ blue('https://npmjs.org/grunt-flexcombo'));
	});

};

function showProxyHosts(proxyHosts){
	if(typeof proxyHosts != 'object'){
		return;
	}
	for(var i = 0;i< proxyHosts.length;i++){
		console.log('Preview: '+green('http://'+proxyHosts[i] + '/'));
	}
}

function consoleColor(str,num){
	if (!num) {
		num = '32';
	}
	return "\033[" + num +"m" + str + "\033[0m"
}

function green(str){
	return consoleColor(str,32);
}

function yellow(str){
	return consoleColor(str,33);
}

function red(str){
	return consoleColor(str,31);
}

function blue(str){
	return consoleColor(str,34);
}

function log(statCode, url, err) {
  var logStr = blue(statCode) + ' - ' + url ;
  if (err)
    logStr += ' - ' + red(err);
  console.log(logStr);
}

function getDirFiles(dir){
	var files = fs.readdirSync(dir);
	var res_f = []; 
	var res_d = [];
	var r = '';
	files.forEach(function(file){
		var stat = fs.lstatSync(path.resolve(dir,file));

		if (!stat.isDirectory()){
			res_f.push(file);
		} else {
			res_d.push(file);
		}   
	});

	
	r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1WNlnFadjXXaSQP_X-16-16.png" /> <a href="../">parent dir</a></p><hr size=1 />';

	res_d.forEach(function(file){
		r += '<p><img src="http://img03.taobaocdn.com/tps/i3/T1nHRTFmNXXXaSQP_X-16-16.png" /> <a href="'+file+'/">'+file+'</a></p>';
	});

	res_f.forEach(function(file){
		r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1Y7tPFg8eXXaSQP_X-16-16.png" /> <a href="'+file+'">'+file+'</a></p>';
	});

	return r;
}

function isDir(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isDirectory();
	} else {
		return false;
	}
}

function isFile(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isFile();
	} else {
		return false;
	}
}
