/**
 * grunt-flexcombo
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var path = require('path');
var http = require('http');
var url = require('url');

var flexCombo = require('flex-combo');
var jayli = require('jayli-server');
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
        var proxyport = options.proxyport || 8080;

	    // anyproxy 端口配置
	    var webConfigPort = options.webConfigPort || 8082;
	    var webPort = options.webPort || 8002;
	    var socketPort = options.socketPort || 8003;

	    // 是否启动 weinre
	    var startWeinre = options.startWeinre;
	    var weinrePort = options.weinrePort || 9090;
        var prefix = options.urls;
	    var target = options.target;
        var localPath = options.target;
        var filter = options.filter || {};
	    var needHttps = options.needHttps;      // 是否需要启用 https 监控
	    var localIpAddr = utils.getLocalIp();

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

	    if(needHttps) {
		    //create cert when you want to use https features
		    //please manually trust this rootCA when it is the first time you run it
		    !proxy.isRootCAFileExists() && proxy.generateRootCA();
	    }

		// 初始化 anyproxy
	    new proxy.proxyServer({
		    type          : "http",
		    port          : proxyport,
		    // port for web interface
		    webPort       : webPort,
		    // internal port for web socket, replace this when it is conflict with your own service
		    socketPort    : socketPort,
		    // internal port for web config(beta), replace this when it is conflict with your own service
		    webConfigPort : webConfigPort,
		    hostname      : "localhost",
		    rule          : ProxyRule({
							    prefix: prefix,
							    filter: filter,
							    port: port,
							    proxyHosts: proxyHosts,
							    target: target,
							    proxy: proxyIfPageConfig,
			                    needHttps: needHttps,
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
			    var truePath = path.resolve(pwd, localPath, req.url.replace('http://' + req.headers.host, '').replace(prefix, './'));
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

	    console.log('\nAnyproxy web config service running at ' + utils.blue('http://127.0.0.1:' + webConfigPort));
	    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('webConfigPort') + ' 更改端口号');
	    console.log('\nAnyproxy web monitor service running at ' + utils.blue('http://127.0.0.1:' + webPort));
	    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('webPort') + ' 更改端口号');
	    console.log('\nAnyproxy web socket service running at ' + utils.blue('http://127.0.0.1:' + socketPort));
	    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('socketPort') + ' 更改端口号');
	    console.log('\nFlex Combo Server running at ' + utils.blue('http://127.0.0.1:' + port));
	    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('port') + ' 更改端口号');

	    console.log('\n 请为你的浏览器或移动设备配置 HTTP 代理: '
		    + utils.green('127.0.0.1(浏览器) / ' + localIpAddr + '(移动设备)' + ' : ' + proxyport));
	    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('proxyport') + ' 更改端口号');

	    console.log('\nHelp: ' + utils.blue('http://groups.alidemo.cn/trip-tools/clam-doc/intro/dev-debug.html'));

	    utils.showProxyHosts(proxyHosts);

	    console.log('请访问以下链接查看 anyproxy 网络监控：');
	    console.log('    ' + utils.green('http://localhost:' + webPort + ''));

	    // 打开 weiner
	    if(startWeinre) {

		    var checkWeinre = exec('weinre -h', {silent:true});
		    if(checkWeinre.code === 127) {
			    // weinre 未安装
			    console.log(utils.yellow('您尚未安装 weinre，可执行 tnpm install -g weinre 安装 weinre'));
		    } else {
			    console.log('请访问以下链接查看 weinre 控制面板：');
			    console.log('    ' + utils.green('http://' + localIpAddr + ':' + weinrePort + '/client/#anonymous'));
			    console.log('\n Weinre service running at ' + utils.blue('http://127.0.0.1:' + weinrePort));
			    console.log('  > 可通过 flexocombo 配置项 ' + utils.yellow('weinrePort') + ' 更改端口号');

			    exec('weinre --boundHost ' + localIpAddr + ' --httpPort ' + weinrePort, function(code, output) {

			    });
		    }

	    }
	    console.log(utils.yellow('如遇到 Error: listen EADDRINUSE 报错提示，请检查以上端口号是否被占用。'));

    });

};
