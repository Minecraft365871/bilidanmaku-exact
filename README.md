# B 站弹幕数（无回退版）

一个用于 Bilibili 的 Tampermonkey/Greasemonkey 用户脚本，用于显示当前分 P 视频的精确弹幕数量。

## 功能特点

- **精确显示当前分 P 弹幕数**：显示当前播放分 P 的弹幕数量，多 P 视频返回 0 则显示 0，不再回退到总数
- **优先读取播放器 UI 数据**：直接从 B 站播放器界面获取已渲染的弹幕数，响应更快
- **备用 XML 接口**：当 UI 数据不可用时，自动回退到 B 站官方 XML 接口获取弹幕数据
- **支持"万"单位显示**：自动处理 "1.2 万" 等格式的弹幕数显示
- **实时更新**：定时检查 URL 变化和 UI 更新，切换分 P 时自动刷新
- **兼容性好**：支持新旧版 B 站播放器界面

## 安装方法

### 前置要求

1. 安装浏览器扩展：
   - [Tampermonkey](https://www.tampermonkey.net/)（推荐）
   - 或 [Greasemonkey](https://www.greasespot.net/)

### 一键安装

点击以下链接直接安装：

- [安装脚本](https://raw.githubusercontent.com/Minecraft365871/bilidanmaku-exact/main/BiliDanmaku-Exact.user.js)
- [元数据文件](https://raw.githubusercontent.com/Minecraft365871/bilidanmaku-exact/main/BiliDanmaku-Exact.meta.js)

### 手动安装

1. 下载 `BiliDanmaku-Exact.user.js` 文件
2. 在浏览器中打开 Tampermonkey 管理面板
3. 点击"创建新脚本"
4. 将下载的文件内容复制粘贴到编辑器中
5. 保存并启用

## 使用效果

安装后访问任意 B 站视频页面（`https://www.bilibili.com/video/*`），脚本会在播放器控制栏附近显示：

```
已装填 XXX 条弹幕
```

其中数字部分以蓝色高亮显示。

## 技术实现

### 核心逻辑

1. **UI 优先读取**：尝试从以下选择器获取弹幕数：
   - `.bpx-player-ctrl-danmaku-num`
   - `.bpx-player-video-info-danmaku-num`
   - `.bilibili-player-video-info-danmaku-number`
   - `.bpx-player-ctrl-btn-danmaku .bpx-player-ctrl-btn-icon-text`

2. **API 备用方案**：当 UI 数据不可用时：
   - 调用 `https://api.bilibili.com/x/web-interface/view` 获取视频信息
   - 根据当前分 P 获取对应的 `cid`
   - 请求 `https://api.bilibili.com/x/v1/dm/list.so?oid={cid}` 统计弹幕数量

3. **智能缓存**：相同 BVID 和分 P 时优先使用缓存数据

### 更新机制

- 初始加载延迟 2 秒执行
- 每 2 秒检查一次 URL 变化和 UI 更新
- 检测到分 P 切换时自动刷新数据

## 开发信息

- **作者**：Minecraft_365871
- **版本**：4.0
- **许可证**：[GPL-3.0](LICENSE)
- **仓库**：https://github.com/Minecraft365871/bilidanmaku-exact

## 更新日志

### v4.0
- 优化弹幕数获取逻辑，优先读取播放器 UI 数据
- UI 读取失败时回退到 XML 接口
- 改进多 P 视频处理，不再错误显示总数

### v3.x 及更早版本
- 基础功能实现
- 支持分 P 弹幕数统计

## 注意事项

- 本脚本仅在 B 站视频播放页面生效
- 需要浏览器允许跨域请求（Tampermonkey 默认支持）
- 弹幕数据来源于 B 站官方接口，准确性取决于 B 站数据

## 贡献与反馈

如有问题或建议，欢迎前往 [GitHub 仓库](https://github.com/Minecraft365871/bilidanmaku-exact) 提交 Issue。

## 许可证

本项目采用 GNU General Public License v3.0 许可证。详见 [LICENSE](LICENSE) 文件。
