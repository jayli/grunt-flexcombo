# grunt-flexcombo

![](http://gtms01.alicdn.com/tps/i1/T1TgNqFB0bXXbX25fJ-346-77.png)

[flex-combo](https://npmjs.org/package/flex-combo)的grunt插件版本，[Grunt-Flexcombo 原理](https://speakerdeck.com/lijing00333/grunt-flexcombo)。

## Getting Started

依赖 Grunt 版本`~0.4.1`

安装grunt-flexcombo

```shell
npm install grunt-flexcombo --save-dev
```

安装后，在Gruntfile.js中载入任务

```js
grunt.loadNpmTasks('grunt-flexcombo');
```

## "flexcombo" 任务配置

### 步骤

在`grunt.initConfig()`中添加flexcombo的配置：

```js
grunt.initConfig({
	flexcombo:{
		main:{
			options: {
				target:'src',
				urls:'/group/project',// 匹配[ag].tbcdn.cn时的路径
				port:'80',// flexcombo服务端口
				proxyport:'8080',// 反向代理服务端口
				servlet:'?',//开启combo的字符串
				separator:',',//多文件分隔符
				charset:'utf8',//默认输出文件的编码
				proxyHosts:['a.com','b.com'],//本地服务的域名
				// 过滤参数
				filter:{ 
					'-min\\.js':'.js',
					// 当访问a.com/go/act/demo.php时，实际请求
					// a.com/demo.html
					'/go/act/\(.+\\.\)php':'/$1html'
				}
			}
		}
	}
});
```
options的更多配置请参照[flex-combo](https://npmjs.org/package/flex-combo)。

flexcombo将在本地启动两个服务

![](http://gtms01.alicdn.com/tps/i1/T1.ey8FnleXXcxFyEb-523-342.png)

启动服务后，可以直接通过`localhost`来预览本地文件

	http://localhost/group/project

若要模拟真实环境调试，两种方法（二者取其一），推荐第二种：

1. 将cdn配向开发机`127.0.0.1 g.tbcdn.cn a.tbcdn.cn`
1. 将浏览器或者设备HTTP代理配置到本机的反向代理服务的端口

比如在手机终端设置代理方法：

![](http://gtms01.alicdn.com/tps/i1/T1bePRFlVXXXXhb4nD-502-341.png)

## 说明

该服务添加了[jayli-server](https://npmjs.org/package/jayli-server)，支持标准格式的 SSI include

	<!--#include path="asdf.html" -->

## 使用案例1

[KISSY 组件如何调试线上代码](http://blog.kissyui.com/2013/11/29/%E5%A6%82%E4%BD%95%E5%BF%AB%E9%80%9F%E5%9C%A8%E7%BA%BF%E8%B0%83%E5%BC%8F%E4%BD%A0%E7%9A%84gallery%E7%BB%84%E4%BB%B6/)

## 使用案例2

KISSY项目构建工具和本地环境：[generator-clam](https://npmjs.org/package/generator-clam)一同使用，构建工具生成本地配置文件，形如：

	flexcombo:{
		debug:{
			options:{
				proxyHosts:'trip.taobao.com',
				target:'build/',
				proxyport:8080,
				urls:'/trip/proj/0.0.2',
				port:'80',
				servlet:'?',
				separator:',',
				charset:'utf8',
				filter:{
					'-min\\.js':'.js',
					'/go/act/\(.+\\.\)php':'/$1html',
				}
			}
		}
	}

执行任务

	task.run(['flexcombo']);
