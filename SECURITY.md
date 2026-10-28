# Security / 安全反馈

This project handles user-supplied local files. Never include secrets, private catalog records, home-directory paths or user-specific data in public issues. If you find a path traversal, unsafe overwrite, or code execution risk, report the issue to the repository maintainer using GitHub's private vulnerability reporting **when enabled**. If it is not enabled, request a private contact channel without revealing exploit details publicly.

本项目会处理用户提供的本地文件。请勿在公开 Issue 中粘贴密钥、个人目录、私人影视记录或敏感路径。如果发现路径穿越、覆盖数据或代码执行风险，优先使用仓库启用后的 GitHub 私密漏洞反馈功能；如未开放，请先向维护者索取私密反馈途径，不要公开敏感漏洞细节。

The technical preview makes no claim of having completed a security audit. / 技术预览版尚未完成独立安全审计。
## Security scope / 安全范围

The repository's automated checks cover import conflicts, path handling, selected plugin behavior and packaging, but **are not an independent penetration test**. Do not open a public Issue containing a functioning exploit or personal information. Private vulnerability reporting can be used only if it is enabled in repository settings; this document does not assert it is currently enabled.

目前的自动化测试覆盖导入冲突、部分路径处理、插件行为和构建打包，并不等于完成独立安全渗透审计。私人漏洞通报功能需仓库管理员在设置中确认已开启；本说明不声称它已经开放。
