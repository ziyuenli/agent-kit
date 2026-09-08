# Pi 工作回撤协议

_用于在允许本地脚本、测试、依赖安装和 Git 操作后，快速恢复研究代码项目_

---

## 1. 开始任务前建立 checkpoint

在目标 Git 仓库中执行：

```bash
git status --short
git add -A
git commit -m "checkpoint: before Pi task"
git rev-parse HEAD
```

记录最后一条命令输出的 commit SHA，例如：

```text
CHECKPOINT=<commit-sha>
```

如果当前工作包含不应提交的内容，先保存为 stash：

```bash
git stash push --include-untracked -m "before Pi task"
```

然后记录当前 HEAD：

```bash
git rev-parse HEAD
```

## 2. 正常完成任务后的检查

```bash
git status --short
git diff --stat
git diff --check
```

确认：

- 没有意外修改项目外的文件
- 没有凭证、`.env` 或临时文件进入 Git
- 测试和类型检查通过
- 依赖变更符合预期
- 远程操作的目标、参数和输出已单独检查

## 3. 回撤 Pi 对仓库的修改

先人工确认 `CHECKPOINT` 正确，然后执行：

```bash
git diff --stat "$CHECKPOINT"
git log --oneline --decorate -5
```

确认无误后恢复已跟踪文件：

```bash
git reset --hard "$CHECKPOINT"
```

清理 Pi 在 checkpoint 之后创建的未跟踪文件前，先预览：

```bash
git clean -fdn
```

确认列表正确后再执行：

```bash
git clean -fd
```

如果任务前使用了 stash，最后恢复原有未提交工作：

```bash
git stash list
git stash pop
```

## 4. 已放行但不能依赖本地回撤的操作

按当前 Pi 权限配置，以下命令可以直接执行，但它们没有可靠的本地完整回撤路径，必须在任务前确认目标和参数：

- `ssh`、`scp` 以及远程 shell 命令
- `curl`、`wget` 网络请求和下载
- Docker/Podman 的 `run`、`exec`、`rm`、`prune`
- 删除或修改远程 Zotero、数据库、云服务内容
- 发送邮件、提交表单、购买或发布操作

以下操作仍然被权限系统拒绝：

- `git push`
- 删除凭证、数据集、原始实验数据或唯一文件
- `sudo`、`doas`、磁盘管理和系统关机命令

## 5. 重要限制

Git checkpoint 只能完整恢复 Git 仓库中的文件状态。它不能自动恢复：

- 已发送的网络请求
- 已删除的外部文件
- 数据库或 Zotero 的远程修改
- 已安装的软件或系统配置
- 运行脚本产生的外部副作用
- 被程序覆盖且未纳入 checkpoint 的文件

因此，允许 `python`、`node`、测试和包安装命令并不等于获得了沙箱保护。重要研究数据仍应使用副本、独立 Git worktree、容器或虚拟机处理。
