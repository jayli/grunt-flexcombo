### 0.1.36

- [+] `html-proxy` 引入，支持远程页面区块代理
- [+] `server` 模式下启动本地服务后自动打开本地浏览器
- [!] 清除本地 `mock` 时，`require` 的缓存，避免修改 `mock` 接口需重启服务才能刷新

### 0.1.37
- [!] bugfix for https://github.com/jayli/grunt-flexcombo/blob/master/tasks/flexcombo.js#L73，掉了个 `req` 参数传递进去
- [!] `server` 模式下启动本地服务后自动打开本地浏览器优化，带上 `-br` 启动浏览器