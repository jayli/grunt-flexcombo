### 0.1.36

- [+] `html-proxy` 引入，支持远程页面区块代理
- [+] `server` 模式下启动本地服务后自动打开本地浏览器
- [!] 清除本地 `mock` 时，`require` 的缓存，避免修改 `mock` 接口需重启服务才能刷新

### 0.1.37
- [!] bugfix for https://github.com/jayli/grunt-flexcombo/blob/master/tasks/flexcombo.js#L73，掉了个 `req` 参数传递进去
- [!] `server` 模式下启动本地服务后自动打开本地浏览器优化，带上 `-br` 启动浏览器

### 0.1.42
- [!] 启动日志显示本机 IP，方便 debug
- [!] mock 路径去除结尾的 ".do/action" 等，现在可以方便地 mock mtop 接口请求了
- [!] `demo`/`server` 模式下通过后缀 `--br` 自动打开浏览器优化

### 0.1.43
- [!] bugfix for `getLocalIp()`

### 0.2.0
- [!] 替换 reverse-proxy 为 [anyproxy](web.npm.alibaba-inc.com/package/anyproxy)
- [+] 增加 weinre 支持

### 0.2.1
- [!] 移除 `open` 支持，加入 weinre 安装检测
- [!] 移除 `--br` 打开浏览器功能

### 0.2.2
- [!] 移除遗留的 `grunt` 模块依赖（`grunt`依赖模块众多导致安装慢）

### 0.2.3
- [!] 升级 anyproxy 依赖，支持端口号可配置

### 0.2.4
- [!] 更新 `anyproxy-rule.js` 文件 `replaceRequestOption`，符合代理域名规则下的请求转发到 `flex-combo` 先做本地检查，避免本地没有导致请求 404

### 0.2.5
- [!] 更新启动提示信息，展示所有使用中的端口号

### 0.2.8
- [!] 兼容 anyproxy API 变更：`replaceServerResData` => `replaceServerResDataAsync`
- [!] 请求转发到 flexcombo 的 hostname 由 `127.0.0.1` 改为 `utils.js` 里读取本机 IP 的方法，修复移动端挂代理起 `grunt demo` 访问本机页面阻塞
- [!] Less/Sass 解析 bugfix 修复 `isUtf8` 引用

### 0.2.9
- <s>[!] 对匹配 cdn 资源判断请求 url 中是否包含 `urls` 字符串，避免代理不应该代理的线上资源</s>，有bug
- [!] 加入 anyproxy 兼容 https 请求的配置，支持 https 请求的监控

### 0.2.10
- [!] https 监控加配置项打开

### 0.2.11
- [!] bugfix for  0.2.9 prefix 判断

### 0.2.14
- [!] bugfix for mocker，修复`replaceServerResDataAsync`方法中接口 mock 回调 bug
- [!] bugfix for 空 target 时代理失效

### 0.2.15
- [!] bugfix for mocker，处理非 UTF-8 编码接口返回 bug
- [!] flex-combo 限定依赖 0.6.4

### 0.2.16
- [!] bugfix for flex-combo 转发
- [!] 加入 `?debug` 模式支持，将代理的 `-min.js` 资源请求替换为 `.js` 请求方便调试

### 0.2.17
- [!] bugfix for compatible with latest flex-combo

### 0.2.19
- [!] 加入 livereload 支持

### 0.2.20
- [!] bugfix for compatible with latest flex-combo
