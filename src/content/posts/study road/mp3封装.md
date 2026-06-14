---
title: MP3和VTT封装成MKV
published: 2026-06-14
pinned: false
tags: [MP3]
category: 学习之路
update: 2026-06-14
draft: false
description: "原来MP3是没有字幕的。。。"
---


# MP3外挂VTT字幕 → MKV封装方案

## 困境

一开始被ai骗了以为MP3可以挂字幕，而且我下载的资源也是MP3和配套VTT，但是经过尝试发现这个VTT不管用手机自带播放器还是VLC等都没有办法挂上，导致我十分混沌是这个vtt不行还是软件不识别，后来才知道MP3挂不了字幕。有两种方法解决一个是封装成一个mkv，二是写个html文件，浏览器打开，我选择了第一种。

## 做法

```
mp3 + vtt → ffmpeg → mkv（黑底视频 + 音频 + 软字幕）
```

具体做法：
- 用`color`滤镜生成1fps、640x360的纯黑静态画面作为视频轨
- 音频轨`-c copy`无损复制，音质不变
- 字幕轨`-c copy`原样保留，可在播放器中开关
- 黑底视频用`ultrafast`预设 + `crf 51`编码

### 工具化

做了一键脚本 `一键封装.bat`：把`.mp3`和同名`.vtt`丢进文件夹 → 双击bat → 所有MKV自动生成到`输出MKV/`子目录。

核心命令：
```bash
ffmpeg -f lavfi -i "color=c=black:s=640x360:r=1" \
  -i audio.mp3 -i subtitle.vtt \
  -map 0:v -map 1:a -map 2:s \
  -c:v libx264 -preset ultrafast -crf 51 \
  -c:a copy -c:s copy -shortest \
  output.mkv
```

## 效果

VLC Android可正常显示字幕，字幕可自由开关切换。
