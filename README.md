# grunt-flexcombo

> [flex-combo](https://npmjs.org/package/flex-combo)插件的grunt版本.

## Getting Started

依赖 Grunt 版本`~0.4.1`

安装

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
		options: {
			target:'src',
			urls:'/group/project',
			port:'80',
			servlet:'?',
			separator:',',
			charset:'utf8'
		},
		main:{}
	}
});
```

你的host指向开发机，访问http://host/group/projecct，浏览你的页面和assets文件

将cdn配向开发机
	
	127.0.0.1 g.tbcdn.cn

可以访问你的页面和asset文件

	http://g.tbcdn.cn/group/project

更多配置请参照[flex-combo](https://npmjs.org/package/flex-combo)。

## 说明

该服务添加了[jayli-server](https://npmjs.org/package/jayli-server)，支持标准格式的 SSI include

	<!--#include path="asdf.html" -->

## 使用

建议同[generator-clam](https://npmjs.org/package/generator-clam)一同使用，构建工具生成本地配置文件，形如：


	flexcombo:{
		options: {
			target:'src',
			urls:'/<%= pkg.group %>/<%= pkg.name %>',
			port:'<%= port %>',
			servlet:'?',
			separator:',',
			charset:'utf8'
		},
		main:{}
	}

执行任务

	task.run(['flexcombo']);
