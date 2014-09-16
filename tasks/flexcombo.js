/**
 * grunt-flexcombo
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var fs = require('fs');
var path = require('path');
var http = require('http');
var url = require('url');

var flexCombo = require('flex-combo');
var jayli = require('jayli-server');
var open = require('open');
var iconv = require('iconv-lite');
var proxy = require("anyproxy");
require('shelljs/global');

var ProxyRule = require('./lib/anyproxy-rule');
var utils = require('./lib/utils');

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('flexcombo', 'Start FlexCombo.', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options();

        var that = this;
        var pwd = process.cwd();
        var port = options.port || '80';
        var proxyport = options.proxyport || 8090;
	    var weinrePort = options.weinrePort || 9090;
        var prefix = options.urls;
	    var target = options.target;
        var localPath = options.target;
        var filter = options.filter || {};
	    var localIpAddr = utils.getLocalIp();


	    // 从 grunt prompt 任务读取选项：
	    // 是否打开 anyproxy 监控页面
	    var openMonitor = grunt.config('openMonitor');

	    // 是否启动 weinre
	    var startWeinre = grunt.config('startWeinre');
	    // 是否打开 weinre 控制面吧
	    var openWeinre = grunt.config('openWeinre');

	    // 代理接口和页面的默认配置
	    var proxyIfPageConfig = options.proxy || {
		    interface: {
			    hosts: [],
			    script: 'proxy/interface.js'
		    },
		    webpage: {
			    urls: [],
			    script: 'proxy/webpage.js'
		    }
	    };

		// 代理主机配置项
        var proxyHosts = [];
        if (typeof options.proxyHosts === 'object') {
            proxyHosts = options.proxyHosts;
        } else if (typeof options.proxyHosts === 'string') {
            proxyHosts = [options.proxyHosts];
        }

	    // 初始化 flex-combo
        var obj = {};
        obj[options.urls] = options.target;
        for (var i in obj) {
            obj[i] = path.resolve(pwd, obj[i]);
        }
        var comboInst = flexCombo(process.cwd(), obj, options);

		// 初始化 anyproxy
	    new proxy.proxyServer({
		    type     : "http",
		    port     : proxyport,
		    hostname : "localhost",
		    rule     : ProxyRule({
			    prefix: prefix,
			    filter: filter,
			    port: port,
			    proxyHosts: proxyHosts,
			    target: target,
			    proxy: proxyIfPageConfig,
			    pwd: pwd
		    })
	    });

	    // 启动本地服务
	    http.createServer(function (req, res) {
		    comboInst(req, res, function () {

			    /**
			     * flex-combo 请求未匹配上时的额外处理
			     */
			    // get true path
			    var parsedReqUrl = url.parse(req.url, true);
			    var truePath = path.resolve(pwd, localPath, req.url.replace('http://' + req.headers.host, '').replace(prefix, '.'));
			    truePath = truePath.replace(/\?.*$/, '');
			    truePath = truePath.replace(/#.*$/, '').replace('http:/' + req.headers.host, '');
			    var removedPrefixPath = parsedReqUrl.pathname.replace(prefix, '');
			    if (utils.isDir(truePath)) {

				    /**
				     * 如果请求的是目录路径，展示该目录下的文件和文件夹列表
				     */

				    if (!/\/$/.test(req.url)) {
					    res.writeHead(302, {'Content-Type': 'text/html'});
					    res.end('<script>window.location.href += "/";</script>');
					    return;
				    }
				    res.writeHead(200, {'Content-Type': 'text/html'});
				    var r = utils.getDirFiles(truePath);
				    r += '<style>' +
					    'p {' +
					    'font-family:Tahoma;' +
					    'font-size:1em;' +
					    'line-height:1em;' +
					    'margin:9px 10px' +
					    '}' +
					    '</style>';
				    res.end(r);
			    } else if (utils.isFile(truePath)) {

				    /**
				     * 如果请求的是其他文件，转入 jayli-server 静态文件服务
				     * 对于页面（html）提供 ssi、juicer mock、php 语法兼容等服务
				     */
				    jayli
					    .deliver('.', req, res, truePath)
					    .before(function () {
					    })
					    .after(function (statCode, filePath, fileBuffer, encoding) {
						    utils.log(statCode, req.url);

						    // inject weinre
						    if(startWeinre) {
							    var decodedFileContent = iconv.decode(fileBuffer, encoding);

							    // inject weinre script
							    var weinreScriptPath = "http://" + localIpAddr + ":" + weinrePort
								    + "/target/target-script-min.js#anonymous";

							    decodedFileContent = decodedFileContent.replace('</body>', '<script src="' + weinreScriptPath + '"></script></body>');
							    fileBuffer = iconv.encode(decodedFileContent, encoding);
						    }

						    return fileBuffer;
					    });
			    } else {
				    utils.log(404, req.url, 'Not found');
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

	    console.log('\nFlex Combo Server running at ' + utils.blue('http://127.0.0.1:' + port));

	    // 打开 weiner
	    if(startWeinre) {
		    exec('weinre --boundHost ' + localIpAddr + ' --httpPort ' + weinrePort,
			    function(code, output) {
				    console.log(arguments);
			    });
		    if(openWeinre) {
			    open('http://' + localIpAddr + ':' + weinrePort + '/client/#anonymous');
		    }
	    }

	    // 打开 anyproxy 监控网络请求
	    if(openMonitor) {
		    open('http://localhost:8002');
	    }

	    console.log('\n  请为你的浏览器或移动设备配置 HTTP 代理: '
		    + utils.green('127.0.0.1(浏览器) / ' + localIpAddr + '(移动设备)' + ' : ' + proxyport));
	    console.log('\nHelp: ' + utils.blue('https://npmjs.org/grunt-flexcombo'));

	    utils.showProxyHosts(proxyHosts);

	    // 在 server 目标下打开系统浏览器
	    if ((that.target == 'server' || that.target == 'demo') && !!grunt.option('br') && proxyHosts[0]) {
		    open('http://' + proxyHosts[0] + ':' + port + '/');
	    }
    });

};