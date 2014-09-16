/**
 * Created by 弘树<tiehang.lth@alibaba-inc.com> on 14-9-14.
 * util Functions
 */
var os = require('os');
var fs = require('fs');
var path = require('path');

/**
 * 控制台输出需代理的域名
 * @param proxyHosts
 */
function showProxyHosts(proxyHosts) {
	console.log('当前已代理以下域名的请求：')
	if (typeof proxyHosts != 'object') {
		return;
	}
	for (var i = 0; i < proxyHosts.length; i++) {
		console.log('  > ' + green('http://' + proxyHosts[i] + '/'));
	}
}

function consoleColor(str, num) {
	if (!num) {
		num = '32';
	}
	return "\033[" + num + "m" + str + "\033[0m"
}

function green(str) {
	return consoleColor(str, 32);
}

function yellow(str) {
	return consoleColor(str, 33);
}

function red(str) {
	return consoleColor(str, 31);
}

function blue(str) {
	return consoleColor(str, 34);
}

function log(statCode, url, err) {
	var logStr = blue(statCode) + ' - ' + url;
	if (err)
		logStr += ' - ' + red(err);
	console.log(logStr);
}

/**
 * 读取给定路径下的文件信息，生成 html 展示页面
 * @param dir {String}
 * @returns {String}
 */
function getDirFiles(dir) {
	var files = fs.readdirSync(dir);
	var res_f = [];
	var res_d = [];
	var r = '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"></head><body>';
	files.forEach(function (file) {
		var stat = fs.lstatSync(path.resolve(dir, file));

		if (!stat.isDirectory()) {
			res_f.push(file);
		} else {
			res_d.push(file);
		}
	});

	r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1WNlnFadjXXaSQP_X-16-16.png" /> <a href="../">parent dir</a></p><hr size=1 />';

	res_d.forEach(function (file) {
		r += '<p><img src="http://img03.taobaocdn.com/tps/i3/T1nHRTFmNXXXaSQP_X-16-16.png" /> <a href="' + file + '/">' + file + '</a></p>';
	});

	res_f.forEach(function (file) {
		r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1Y7tPFg8eXXaSQP_X-16-16.png" /> <a href="' + file + '">' + file + '</a></p>';
	});

	r += '</body></html>';

	return r;
}

/**
 * 给定路径是否为目录
 * @param dir {String}
 * @returns {Boleaan}
 */
function isDir(dir) {
	if (fs.existsSync(dir)) {
		var stat = fs.lstatSync(dir);
		return stat.isDirectory();
	} else {
		return false;
	}
}

/**
 * 给定路径是否为文件
 * @param dir {String}
 * @returns {Boolean}
 */
function isFile(dir) {
	if (fs.existsSync(dir)) {
		var stat = fs.lstatSync(dir);
		return stat.isFile();
	} else {
		return false;
	}
}

/**
 * 读取本机 IP 地址（IPv4）
 * @returns {String}
 */
function getLocalIp() {
	var ifaces = os.networkInterfaces();
	var lookupIpAddress = null;
	for (var dev in ifaces) {
		if (dev != "en1" && dev != "en0") {
			continue;
		}
		ifaces[dev].forEach(function (details) {
			if (details.family == 'IPv4') {
				lookupIpAddress = details.address;
				return;
			}
		});
	}
	return lookupIpAddress || '127.0.0.1';
}

/**
 * 从 jsonp 格式数据解析出 json
 * @param jsonpRet
 * @returns {Object}
 */
function parseJsonp(jsonpRet) {

	if(jsonpRet) {

		var ret = jsonpRet.replace(/^\w*\((.*)\)$/, '$1');

		try {
			ret = JSON.parse(ret);
		} catch (e) {
			console.log(red('Failed to parse ' + ret + ' to JSON'));
			console.error(e);
			return {};
		}

		return ret;
	}

	return {};

}


exports.showProxyHosts = showProxyHosts;
exports.isDir = isDir;
exports.isFile = isFile;

exports.green = green;
exports.yellow = yellow;
exports.red = red;
exports.blue = blue;

exports.log = log;

exports.getDirFiles = getDirFiles;
exports.getLocalIp = getLocalIp;
exports.parseJsonp = parseJsonp;