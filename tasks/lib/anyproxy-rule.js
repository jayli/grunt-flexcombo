/**
 * Created by 弘树<tiehang.lth@alibaba-inc.com> on 14-9-13.
 * rule for anyproxy
 */
var url = require('url');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var mockjs = require('mockjs');
var cheerio = require('cheerio');
var formidable = require('formidable');
var dnsSync = require('dns-sync');
var iconv = require('iconv-lite');
var utils = require('./utils');
var sass = require('node-sass');
var less = require('less');

/**
 * 检查请求的 host 是否需要本地接口 Mock
 * @param proxyIfHosts {Array}
 * @param reqHost {String}
 * @returns {Boolean}
 * @private
 */
function _isNeedIfProxy(proxyIfHosts, reqHost) {
	// 如果该请求的 host 在需要代理的接口列表里，并且该接口的主机无法访问，则从本地接口模拟取响应
	return !_.isEmpty(proxyIfHosts) && _.contains(proxyIfHosts, reqHost) && !dnsSync.resolve(reqHost);
}

module.exports = function (globalConfig) {

	return {

		/*
		 These functions will overwrite the default ones, write your own when necessary.
		 Comments in Chinese are nothing but a translation of key points. Be relax if you dont understand.
		 致中文用户：中文注释都是只摘要，必要时请参阅英文注释。欢迎提出修改建议。
		 */
		summary: function () {
			return 'Proxy Assets By Flex-Combo & Static Contents By Jayli-Server & Data Mock & HTML';
		},

		//=======================
		//when getting a request from user
		//收到用户请求之后
		//=======================

		//是否在本地直接发送响应（不再向服务器发出请求）
		//whether to intercept this request by local logic
		//if the return value is true, anyproxy will call dealLocalResponse to get response data and will not send request to remote server anymore
		shouldUseLocalResponse: function (req, reqBody) {


			var reqHost = req.headers.host;
			if (_isNeedIfProxy(globalConfig.proxy.interface.hosts, reqHost)) {
				console.log(utils.yellow('[DNS Resolve Failed]: ' + reqHost));
				console.log(utils.yellow('\t Get Repsponse From Local Interface Mock'));
				return true;
			}

			var pwd = globalConfig.pwd;
            var absPath = path.normalize(path.join(pwd,'src',req.url.replace(/\?.+/i,'').replace(/^http:\/\/[^\/]+/i,'')));
			var isCSS = /\.css$/i.test(absPath);

			if(!isCSS){
				return false;
			}

			if(!fs.existsSync(absPath) && fs.existsSync(absPath.replace(/\.css$/i,'.scss'))){
				return true;
			}

			if(!fs.existsSync(absPath) && fs.existsSync(absPath.replace(/\.css$/i,'.less'))){
				return true;
			}

			return false;
		},

		//如果shouldUseLocalResponse返回true，会调用这个函数来获取本地响应内容
		//you may deal the response locally instead of sending it to server
		//this function be called when shouldUseLocalResponse returns true
		//callback(statusCode,resHeader,responseData)
		//e.g. callback(200,{"content-type":"text/html"},"hello world")
		dealLocalResponse: function (req, reqBody, callback) {

			var pwd = globalConfig.pwd;
			var ifProxyConfig = globalConfig.proxy.interface;

			// added by jayli，处理sass 和less文件解析
            var absPath = path.normalize(path.join(pwd,'src',req.url.replace(/\?.+/i,'').replace(/^http:\/\/[^\/]+/i,'')));
			var isCSS = /\.css$/i.test(absPath);

			if(isCSS && !fs.existsSync(absPath) && fs.existsSync(absPath.replace(/\.css$/i,'.scss'))){
				var r_css = sass.renderSync({
					file: absPath.replace(/\.css$/i,'.scss'),
					success: function (css, map) {
					}
				});
				callback(200, {'Content-Type': 'text/css'}, r_css);
				return;
			}

			if(isCSS && !fs.existsSync(absPath) && fs.existsSync(absPath.replace(/\.css$/i,'.less'))){
				var buff = fs.readFileSync(absPath.replace(/\.css$/i,'.less'));
				var charset = isUtf8(buff) ? 'utf8' : 'gbk';
				var fContent = iconv.decode(buff, charset);
				var r_css = new(less.Parser)({
					processImports:false
				}).parse(fContent,function(e,tree){
					return tree.toCSS();
				});    
				callback(200, {'Content-Type': 'text/css'}, r_css);
				return;
			}

			// 处理MockJS
			if (_isNeedIfProxy(ifProxyConfig.hosts, req.headers.host)) {

				var execScriptPath = path.join(pwd, ifProxyConfig.script);
				var execScript;

				// 加载 proxy 脚本
				try {

					// 清除require缓存
					delete require.cache[require.resolve(execScriptPath)];
					execScript = require(execScriptPath);

				} catch (e) {

					utils.log(404, req.url, '::Mock Script not found');
					callback(404, {'Content-Type': 'text/html'}, "<h4>Error 404: " + req.url + '::Mock Script not found at ' + execScriptPath + '!</h4>' + '<code>' + JSON.stringify(e) + '</code>');
				}

				/**
				 * mock返回结果的回调处理
				 * @param cbName {String} callback参数名，处理jsonp请求
				 * @param result {Object} mock 结果
				 */
				var callbackFn = function (cbName, result) {

					result = JSON.stringify(result, null, 4);

					utils.log(200, req.url, utils.green('::Mock Result => \r\n' + result));

					if (cbName) {
						result = cbName + '(' + result + ')';
						callback(200, {'Content-Type': 'text/plain'}, result);
					} else {
						callback(200, {'Content-Type': 'application/json'}, result);
					}

				};

				switch (req.method) {

					case 'GET':

						var params = url.parse(req.url, true).query;

						callbackFn(params.callback, execScript(req.url, params, null, {
							_: _,
							mockjs: mockjs
						}));

						break;

					case 'POST':

						var form = new formidable.IncomingForm();

						form.parse(req, function (err, fields, files) {

							if (err) {
								callback(500, {'Content-Type': 'text/html'}, "<h4>Error 500: " + req.url + '::Execute Mock Script Error at form parse!</h4>' + '<code>' + JSON.stringify(error) + '</code>');
								return false;
							}

							fields.files = files;

							callbackFn(fields.callback, execScript(req.url, fields, null, {
								_: _,
								mockjs: mockjs
							}));

							return true;

						});

						break;

					default :
						break;
				}
			}

			//callback(statusCode,resHeader,responseData)
			callback(200, {'Content-Type': 'text/html'}, 'dealLocalResponse Empty');
		},

		//=======================
		//when ready to send a request to server
		//向服务端发出请求之前
		//=======================

		//替换向服务器发出的请求协议（http和https的替换）
		//replace the request protocol when sending to the real server
		//protocol : "http" or "https"
		replaceRequestProtocol: function (req, protocol) {
			var newProtocol = protocol;
			return newProtocol;
		},

		//替换向服务器发出的请求参数（option)
		//req is user's request which will be sent to the proxy server, docs : http://nodejs.org/api/http.html#http_http_request_options_callback
		//you may return a customized option to replace the original option
		//you should not write content-length header in options, since anyproxy will handle it for you
		replaceRequestOption: function (req, option) {
			var newOption = option;
			var hostname = option.hostname;
			var isMatchCdnHost = _.contains(['a.tbcdn.cn', 'g.tbcdn.cn', 'g.assets.daily.taobao.net'], hostname);
			var isCSS = /\.css$/i.test(req.url.replace(/\?.+/i,''));
			var isMatchProxyHosts = _.contains(globalConfig.proxyHosts, hostname);
			var isLocalPathExists = true;

			if (isMatchProxyHosts) {
				// 匹配上需代理的域名了，先处理一下 filter

				var alias_path = path.join(globalConfig.prefix, newOption.path);
				var filters = globalConfig.filter;
				for (var i in filters) {
					var regex = new RegExp(i, 'i');
					alias_path = alias_path.replace(regex, filters[i]);
				}

				// 根据请求拼接出的映射到本地访问路径

				// 将请求路径转换为相对文件目录路径
				var realAliasPath = alias_path.split('?')[0].replace(globalConfig.prefix, '');

				// 根据 pwd 和 target 拼接成绝对文件目录路径
				var localPath = path.join(globalConfig.pwd, globalConfig.target, realAliasPath);

				// 检查该路径在本地是否存在
				isLocalPathExists = fs.existsSync(localPath);

				if ((alias_path != newOption.path) && isLocalPathExists) {

					console.log(utils.red('[Proxy Request] ') + ' ' + utils.yellow(newOption.path));
					console.log(utils.green('\t=>  ' + alias_path));
					newOption.path = alias_path;
				}
			}


			// 如果请求域名为 assets cdn，或者为代理域名并且访问路径在本地 target 下存在，转发到 flex-combo 服务
			if (isMatchCdnHost || (isMatchProxyHosts && isLocalPathExists)) {
				newOption.hostname = '127.0.0.1';
				newOption.port = globalConfig.port;
			}

			return newOption;
		},

		//替换请求的body
		//replace the request body
		replaceRequestData: function (req, data) {
			return data;
		},


		//=======================
		//when ready to send the response to user after receiving response from server
		//向用户返回服务端的响应之前
		//=======================

		//替换服务器响应的http状态码
		//replace the statusCode before it's sent to the user
		replaceResponseStatusCode: function (req, res, statusCode) {

			var newStatusCode = statusCode;
			return newStatusCode;
		},

		//替换服务器响应的http头
		//replace the httpHeader before it's sent to the user
		//Here header == res.headers
		replaceResponseHeader: function (req, res, header) {

			var newHeader = header;
			return newHeader;
		},

		//替换服务器响应的数据
		//replace the response from the server before it's sent to the user
		//you may return either a Buffer or a string
		//serverResData is a Buffer, you may get its content by calling serverResData.toString()
		replaceServerResData: function (req, res, serverResData) {

			var reqUrl = req.url;
			var parsedRequest = url.parse(reqUrl, true);

			var execScriptPath,
				execScript;

			// 检查 webpage proxy
			var contentType = res.headers['content-type'];
			if (contentType && /text\/html/i.test(contentType)) {

				var isMatchAnyPageUrl = false;

				var webPageProxyConfig = globalConfig.proxy.webpage,
					webPageProxyUrls = webPageProxyConfig.urls,
					webPageProxyScriptPath = webPageProxyConfig.script;

				if (!_.isEmpty(webPageProxyUrls)) {

					webPageProxyUrls.forEach(function (proxyUrl) {

						// 遍历页面代理的 url，处理字符串和正则两种情况比对是否匹配
						if ((_.isString(proxyUrl) && (reqUrl.indexOf(proxyUrl) != -1)) ||
							(_.isRegExp(proxyUrl) && proxyUrl.test(reqUrl))) {

							console.log(utils.green('[Webpage Proxy] Matched: ' + reqUrl + '=>' + proxyUrl));

							isMatchAnyPageUrl = true;
						}
					});

					if (isMatchAnyPageUrl) {

						// 如果匹配上了，执行 HTML 代理

						// 先检查代理脚本是否存在
						execScriptPath = path.join(globalConfig.pwd, webPageProxyScriptPath);
						execScript;

						// 加载 proxy 脚本
						try {

							// 清除require缓存
							delete require.cache[require.resolve(execScriptPath)];
							execScript = require(execScriptPath);

						} catch (e) {

							console.log(utils.yellow('[Webpage Proxy] Load Script Failed: ' + execScriptPath
								+ '\r\n' + JSON.stringify(e)));
							return serverResData;
						}


						if(execScript) {

							/**
							 * 编码处理
							 */
							var responseCharset = 'utf-8';
							// 检测是否响应体为 utf-8 编码，便于后面转码处理
							var charsetMatch = contentType.match(/charset=([\w-]+)/ig);
							if (charsetMatch && (charsetMatch.length != 0)) {
								responseCharset = charsetMatch[0].split('=')[1];
							}
							// iconv-lite 不支持 gb2312，https://www.npmjs.org/package/iconv-lite#readme
							if (responseCharset.toUpperCase() == 'GB2312') {
								// 兼容为 GBK 处理
								responseCharset = 'GBK';
							}

							// 根据响应头指定的编码进行解码
							var pageContent = iconv.decode(serverResData, responseCharset);
							// 执行页面DOM操作
							var $ = cheerio.load(pageContent);

							execScript(reqUrl, parsedRequest.query, $, {
								_ : _,
								mockjs: mockjs
							});

							var replacedWebPage = $.html();

							// 转回响应头指定的编码
							var encodedWebPage = iconv.encode(replacedWebPage, responseCharset);

							return encodedWebPage;
						}

					}

				}

			}

			// 检查 interface proxy
			var reqHost = req.headers.host;
			var ifProxyConfig = globalConfig.proxy.interface;
			if (_.contains(ifProxyConfig.hosts, reqHost)) {

				execScriptPath = path.join(globalConfig.pwd, ifProxyConfig.script);

				// 加载 proxy 脚本
				try {

					// 清除require缓存
					delete require.cache[require.resolve(execScriptPath)];
					execScript = require(execScriptPath);

				} catch (e) {

					utils.log(404, req.url, '::Proxy Script not found, skipped.');
				}

				if(execScript && _.isFunction(execScript)) {

					var reqQueryParams = parsedRequest.query;
					var callbackName = reqQueryParams.callback;

					var parsedJsonpResponse = utils.parseJsonp(serverResData.toString().trim());

					console.log(parsedJsonpResponse);

					var result = JSON.stringify(execScript(reqUrl, reqQueryParams, parsedJsonpResponse, {
						_: _,
						mockjs: mockjs
					}));

					return callbackName ? (callbackName + '(' + result + ')') : result;

				}

			}

			return serverResData;
		},

		//在请求返回给用户前的延迟时间
		//add a pause before sending response to user
		pauseBeforeSendingResponse: function (req, res) {
			var timeInMS = 1; //delay all requests for 1ms
			return timeInMS;
		},


		//=======================
		//https config
		//=======================

		//是否截获https请求
		//should intercept https request, or it will be forwarded to real server
		shouldInterceptHttpsReq: function (req) {
			return false;
		}
	}
};
