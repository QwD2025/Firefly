---
title: SPICE 网表解析器
published: 2026-06-07
pinned: false
tags: [Multisim]
category: 学习之路
update: 2026-06-07
draft: false
description: "Multisim 导出 `.cir` 文件，然后导入Matlab，直接转换成元胞数组描述电路拓扑。"
image: /assets/images/电路.png
---

# 让 MATLAB 读懂电路描述

## 背景

为了完成我的电路课设：MATLAB 实现改进节点分析法（MNA）的通用电路求解器。这个求解器的核心靠 MATLAB 元胞数组描述电路拓扑——每条支路写成 `{'R', n1, n2, 100}` 这样的格式，清晰归清晰，但每次都要手工翻译电路到数据结构，几十条支路写下来十分麻烦。  

所以我想到一个办法——**让matlab直接读 SPICE 网表**，然后转换成我想要的格式。

## SPICE 网表

SPICE（Simulation Program with Integrated Circuit Emphasis）自上世纪 70 年代诞生以来，其网表格式早已成为电路描述的事实标准。

```spice
* 这是一个注释行
R1 1 2 100        ; 电阻R1，连接节点1和2，阻值100Ω
V1 3 0 DC 5       ; 电压源V1，正端节点3，负端地，5V
I1 2 0 DC 0.01    ; 电流源I1，节点2流向地，10mA
G1 4 0 1 0 0.05   ; VCCS，输出4→0，控制电压V(1)-V(0)，gm=0.05S
E1 5 0 1 2 2.0    ; VCVS，输出5→0，控制电压V(1)-V(2)，增益=2
```

## 解析器

### 第一步：读文件，洗数据

```matlab
fid = fopen(filename, 'r');
raw_lines = {};
while ~feof(fid)
    line = strtrim(fgets(fid));
    if isempty(line) || line(1) == '*'
        continue;  % 跳过空行和注释
    end
    idx = find(line == '$' | line == ';', 1);  % 去行内注释
    if ~isempty(idx), line = strtrim(line(1:idx-1)); end
    raw_lines{end+1} = line;
end
fclose(fid);
```

### 第二步：建立节点映射

SPICE 网表里节点名是**任意字符串**（`1`、`in`、`n003`、`Vout`），而 MNA 求解器要求节点编号从 1 开始连续编号。我们需要一张映射表，而MATLAB 的 `containers.Map` 完美适配这个场景：

```matlab
node_map = containers.Map('0', 0);  % 0始终是地
node_count = 0;
for i = 1:length(raw_lines)
    tokens = strsplit(raw_lines{i});
    % 根据元件类型提取节点名
    % R/V/I: 节点在 tokens{2}, tokens{3}
    % G/E:   节点在 tokens{2}, tokens{3}, tokens{4}, tokens{5}
    for node = {n1, n2, cp, cn}
        n = node{1};
        if ~node_map.isKey(n)
            node_count = node_count + 1;
            node_map(n) = node_count;
        end
    end
end
```

### 第三步：逐元件翻译到 MNA 格式

```matlab
switch elem
    case 'R'
        n1 = node_map(tokens{2}); n2 = node_map(tokens{3});
        Rval = str2double(tokens{4});
        branches{end+1} = {'R', n1, n2, Rval};

    case 'V'
        n1 = node_map(tokens{2}); n2 = node_map(tokens{3});
        Vs = str2double(tokens{4});
        branches{end+1} = {'V', n1, n2, Vs};
        vs_name_to_branch(name) = length(branches);  

    case 'F'  % CCCS
        n1 = node_map(tokens{2}); n2 = node_map(tokens{3});
        Vctrl = tokens{4};  
        beta = str2double(tokens{5});
        cb = vs_name_to_branch(Vctrl);
        branches{end+1} = {'CCCS', n1, n2, cb, beta};
end
```

这里有个精妙的设计就是：**F 元件（CCCS）和 H 元件（CCVS）的控制量是电流**，而电流没法从节点直接获取。所以在处理 V 元件时，我们顺手把电压源名→支路索引的映射存进 `vs_name_to_branch`。后面遇到 `Fxxx n1 n2 Vctrl gain` 时，`Vctrl` 不是节点名而是电压源名——通过查表找到那条电压源在 branches 中的位置，MNA 求解器就能取出它的支路电流作为控制量。

## 支持的元件

| SPICE 元件 | 首字母 | 映射到 MNA | 参数 |
|-----------|--------|-----------|------|
| 电阻 | R | `{'R', n1, n2, val}` | 阻值 |
| 独立电压源 | V | `{'V', n1, n2, val}` | DC电压值 |
| 独立电流源 | I | `{'I', n1, n2, val}` | DC电流值 |
| VCCS | G | `{'VCCS', n1, n2, cp, cn, gm}` | 跨导 |
| VCVS | E | `{'VCVS', n1, n2, cp, cn, mu}` | 电压增益 |
| CCCS | F | `{'CCCS', n1, n2, cb, beta}` | 电流增益+控制源名 |
| CCVS | H | `{'CCVS', n1, n2, cb, r}` | 转移电阻+控制源名 |

