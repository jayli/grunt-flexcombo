/**
 * grunt-flexcombo
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var fs = require('fs');
var path = require('path');
var http = require('http');
var os = require('os');
var flexCombo = require('flex-combo');
var jayli = require('jayli-server');
var url = require('url');
var Rproxy = require('reverse-proxy');
// changed by 首作，替换反向代理为o_o
var Oproxy = require('o_o');
var open = require('open');

var HTMLProxy = require('html-proxy'),
    htmlProxy;

// mock用到的库
var formidable = require('formidable');
var Mocker = require('mockjs');
var _ = require('underscore');

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('flexcombo', 'Start FlexCombo.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options();

        var that = this;
        var longPolling = options.longPolling || false;
        var pwd = process.cwd();
        var port = options.port || '80';
        var proxyport = options.proxyport || 8080;
        var prefix = options.urls;
        var localPath = options.target;
        var filter = options.filter || {};
        var mockPath = options.mockPath || 'mock';
        var mockPathReg = new RegExp("^\\/" + mockPath + "\\/");
        var proxyHosts = [];
        if (typeof options.proxyHosts === 'object') {
            proxyHosts = options.proxyHosts;
        } else if (typeof options.proxyHosts === 'string') {
            proxyHosts = [options.proxyHosts];
        }


        // 初始化 HTML-Proxy 实例
        if (options.htmlProxy) {
            htmlProxy = new HTMLProxy({
                htmlProxyConfig: options.htmlProxy,
                htmlProxyPort: options.htmlProxyPort,
                needServer: true
            });
        }

        var obj = {};
        obj[options.urls] = options.target;
        for (var i in obj) {
            obj[i] = path.resolve(pwd, obj[i]);
        }
        var comboInst = flexCombo(process.cwd(), obj, options);
        if (longPolling === false) {
            Rproxy.createServer({
                port: proxyport,
                map: function (config, req, res) {
                    // 过滤指定了前缀的请求
                    var tpath = config.path.replace('??', '');
                    var tprefix = prefix.replace(/^\//, '');
                    if ((!prefix || (prefix && (tpath.indexOf(tprefix) == -1)))
                        && !(config.host && inArray(config.host, proxyHosts))
                        ) {
                        // 未指定前缀或是不匹配前缀,且不是proxyHost请求，直接pass
                    } else {
                        // a.tbcdn.cn/g.tbcdn.cn/g.assets./ 的请求将转发至flexcombo端口
                        if (/([ag]\.tbcdn\.cn|g.assets.daily.taobao.net)/i.test(config.host)) {

                            // 对于tpi之类同样通过a.tbcdn.cn/g.tbcdn.cn/g.assets./ 的请求，直接pass
                            if (prefix && (tpath.indexOf(tprefix) == -1)) {
                                return config;
                            }

                            config.host = 'localhost';
                            config.port = port;
                        }
                        var proxyHost = false;
                        proxyHosts.forEach(function (v, k) {
                            if (config.host.indexOf(v) >= 0) {
                                proxyHost = true;
                            }
                        });
                        if (proxyHost) {
                            config.port = port;
                            config.host = 'localhost';
                            config.path = prefix + config.path;
                            var alias_path = config.path;
                            for (var i in filter) {
                                var regex = new RegExp(i, 'i');
                                alias_path = alias_path.replace(regex, filter[i]);
                            }
                            if (alias_path != config.path) {
                                console.log(green('alias') + ' ' + yellow(config.path));
                                console.log(green('alias') + ' ' + blue(' => '));
                                console.log(green('alias') + ' ' + yellow(alias_path));
                                config.path = alias_path;
                            }
                        }
                    }

                    // 检查是否匹配HTML-Proxy中的某个URL RegExp
                    htmlProxy && (config = htmlProxy.exportConfigForRProxy(req, config));

                    return config;
                }
            });
        } else {
            // @changed by 首作，替换为o_o
            Oproxy().listen(proxyport);
        }
        http.createServer(function (req, res) {
            comboInst(req, res, function () {
                // get true path
                var parsedReqUrl = url.parse(req.url, true);
                var truePath = path.resolve(pwd, localPath, req.url.replace('http://' + req.headers.host, '').replace(prefix, '.'));
                truePath = truePath.replace(/\?.*$/, '');
                truePath = truePath.replace(/#.*$/, '').replace('http:/' + req.headers.host, '');
	            var removedPrefixPath = parsedReqUrl.pathname.replace(prefix, '');
                if (isDir(truePath)) {
                    if (!/\/$/.test(req.url)) {
                        res.writeHead(302, {'Content-Type': 'text/html'});
                        res.end('<script>window.location.href += "/";</script>');
                        return;
                    }
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    var r = getDirFiles(truePath);
                    r += '<style>' +
                        'p {' +
                        'font-family:Tahoma;' +
                        'font-size:1em;' +
                        'line-height:1em;' +
                        'margin:9px 10px' +
                        '}' +
                        '</style>';
                    res.end(r);
                } else if (isFile(truePath)) {
                    jayli
                        .deliver('.', req, res, truePath)
                        .before(function () {
                        })
                        .after(function (statCode, filePath, fileBuffer, encoding) {
                            log(statCode, req.url);
                            return fileBuffer;
                        });
                } else if (mockPathReg.test(removedPrefixPath)) {

                    // 响应mock请求
	                var requirePath = (pwd + removedPrefixPath).replace(/\.(\w)*$/, ''),    // 移除结尾的 ".do(action)"
                        requireMod,
                        utilLibs = {
                            mocker: Mocker,
                            _: _
                        };

                    // 加载mock模块
                    try {

                        // 清除require缓存
                        delete require.cache[require.resolve(requirePath)];
                        requireMod = require(requirePath);

                    } catch (e) {

                        log(404, req.url, 'Mock Interface not found');
                        res.writeHead(404, {'Content-Type': 'text/plain'});
                        res.end("Error 404: " + req.url + '::mock interface not found!');
                    }

                    /**
                     * mock返回结果的回调处理
                     * @param cbName {String} callback参数名，处理jsonp请求
                     * @param result {Object} mock 结果
                     */
                    var callbackFn = function (cbName, result) {

                        result = JSON.stringify(result, null, 4);

                        if (cbName) {
                            result = cbName + '(' + result + ')';
                            res.writeHead(200, {'Content-Type': 'text/plain'});
                        } else {
                            res.writeHead(200, {'Content-Type': 'application/json'});
                        }

                        res.end(result);

                        log(200, req.url, green('::mock result -> ' + result));
                    };

                    switch (req.method) {

                        case 'GET':

                            var params = parsedReqUrl.query;
                            callbackFn(params.callback, requireMod(req, params, utilLibs));

                            break;

                        case 'POST':

                            var form = new formidable.IncomingForm();

                            form.parse(req, function (err, fields, files) {

                                if (err) {

                                    res.writeHead(500, {'Content-Type': 'text/plain'});
                                    res.end("Error 500: " + error + '::form parse in mock interface failed!');
                                    return false;
                                }

                                fields.files = files;
                                callbackFn(fields.callback, requireMod(req, fields, utilLibs));

                                return true;

                            });

                            break;

                        default :
                            break;
                    }

                } else {
                    log(404, req.url, 'Not found');
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end("Error 404: " + req.url);
                }
            });
        }).listen(port, function () {
            // 从sudo降权，避免watch build后的文件为root权限
            if (process.setgid && process.setuid) {

                var env = process.env,
                    uid = parseInt(env['SUDO_UID'] || process.getuid(), 10),
                    gid = parseInt(env['SUDO_GID'] || process.getgid(), 10);

                process.setgid(gid);
                process.setuid(uid);

            }
        });
        console.log('\nPreview: ' + green('http://g.tbcdn.cn' + prefix + '/'));
        if (longPolling === false) {
            showProxyHosts(proxyHosts);
        }
        console.log('\nFlex Combo Server running at ' + blue('http://127.0.0.1:' + port));
        console.log('Reverse-Proxy running at ' + blue('http://127.0.0.1:' + proxyport));
        if (htmlProxy) {
            console.log('HTML-Proxy running at ' + blue('http://127.0.0.1:' + htmlProxy.port));
        }
        console.log('\nYou Can:');
        console.log('  Change Your Hosts file: 127.0.0.1 ' + green('a.tbcdn.cn') + ' ' + green('g.tbcdn.cn'));
        console.log(yellow('OR'));
	    var localIpAddr = getLocalIp();
	    console.log('  Configure Browser HTTP Proxy or Mobi Device HTTP Proxy: ' + green((localIpAddr ? localIpAddr : 'IP') + ':' + proxyport));
        console.log('\nHelp: ' + blue('https://npmjs.org/grunt-flexcombo'));

	    // 在 server 目标下打开系统浏览器
	    if ((that.target == 'server' || that.target == 'demo') && !!grunt.option('br') && proxyHosts[0]) {
		    open('http://' + proxyHosts[0] + ':' + port + '/');
	    }
    });

};

function showProxyHosts(proxyHosts) {
    if (typeof proxyHosts != 'object') {
        return;
    }
    for (var i = 0; i < proxyHosts.length; i++) {
        console.log('Preview: ' + green('http://' + proxyHosts[i] + '/'));
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

function isDir(dir) {
    if (fs.existsSync(dir)) {
        var stat = fs.lstatSync(dir);
        return stat.isDirectory();
    } else {
        return false;
    }
}

function isFile(dir) {
    if (fs.existsSync(dir)) {
        var stat = fs.lstatSync(dir);
        return stat.isFile();
    } else {
        return false;
    }
}


function inArray(val, arr) {
    return (arr.indexOf(val) > -1);
}


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
	return lookupIpAddress;
}