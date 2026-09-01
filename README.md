# pi-extensions

这是一个 Pi 扩展包示例，可直接用于在其他机器复用同一份配置。

## 内容

- `extensions/my-extension.ts`：示例扩展，提供 `/hello` 命令。
- `package.json`：以 Pi package 形式声明了扩展入口。

## 本地安装测试

```bash
cd ~/pi-extensions
pi -e ./extensions/my-extension.ts
```

在会话中执行：

```text
/hello
```

会显示提示：`Hello from ~/pi-extensions`

## 发布到 GitHub 后给其他机器安装

```bash
pi install git:github.com/ziyuenli/pi-extensions@v0.1.0
```

在项目 `.pi/settings.json` 或全局 `~/.pi/agent/settings.json` 中写：

```json
{
  "packages": ["git:github.com/ziyuenli/pi-extensions@v0.1.0"]
}
```
