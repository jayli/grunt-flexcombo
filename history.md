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