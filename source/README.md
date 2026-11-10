# 霓虹旋转木马 · 梦幻夜曲

香槟金 · 暗夜玫瑰配色的三维旋转木马，现已升级为五层 Belle Époque 宫廷式冠顶。双击 [霓虹旋转木马-梦幻夜曲.html](../霓虹旋转木马-梦幻夜曲.html) 即可离线运行。Three.js、场景代码、程序生成的资源和背景音乐都包含在单个 HTML 文件中。浏览器需支持 WebGL 2。

## 交互

- 鼠标或单指拖拽可 360° 环绕观察。
- 滚轮或双指捏合可缩放。
- 移动鼠标可改变萤火虫的光流与拖尾方向。
- 开场镜头缓慢推进。按下画面或滚动可跳过开场。

## 宫廷式五层冠顶（本轮升级）

原来的简洁圆锥顶棚已重建为 Belle Époque 风格的五层冠顶。木马、底座、地面、星空、相机、鼠标交互与背景音乐均未改动。

1. **顶部皇冠**：三层金属圆环、十二道尖拱与十二支向上收束的冠尖、卷草托臂、倾斜光环、水晶球和尖顶，以及一圈暖金灯珠。
2. **穹顶主体**：24 条径向骨架、4 道环形加强带、72 块奶金色嵌板（24 分区 × 3 层）、24 件浮雕饰板，搭配金色卷草、交叉饰件和珠饰。
3. **外围雕花冠板**：20 个独立冠板分区、20 根立体壁柱、3 级重叠檐口和 80 个齿饰；每块冠板都有椭圆浮雕框、深酒红底衬、象牙/镜面嵌心、卷草和宝石点。
4. **帷幕**：20 幅短弧形垂幔、20 段连续波浪裙摆、10 幅深酒红长帘；配金色包边、金属流苏、垂坠链和珠串。
5. **灯光天花板**：6 道同心圆、24 根径向梁、48 个镜面/象牙嵌饰、6 × 24 组交汇玫瑰饰；中央环吊灯、4 盏外围小吊灯和三层共 72 条水晶链。

- **灯具规模**：1,177 颗独立灯珠、710 颗水晶垂饰；灯珠由 4 组 `InstancedMesh` 按不同呼吸相位呈现，灯座合并为 1 个 `InstancedMesh`，水晶为 1 个 `InstancedMesh`。没有为任何一颗灯珠单独创建 PointLight。
- **灯光结构**：24 条骨架灯带、4 道穹顶环灯带、外围檐口/冠板上下的连续灯带、6 道天花板环灯带、24 条径向梁灯带和冠顶灯带；另设 20 组外围弧形灯链、16 组天花板弧形灯链以及三层水晶链。
- **局部光源**：3 个代表性实际点光源（中央吊灯、冠顶点光、天花板补光）加原有顶棚聚光；其余完全由 Emissive/MeshBasic 灯珠与 Bloom 表现。
- **保护原场景**：木马模型、底座、地面、星空、相机、交互和音乐未改；冠顶由独立模块实现。后续的双环旋转修复只改 `carousel.js` 的木马分组、Pivot 和 update，不改模型。冠顶部件的平面尺寸按 0.93 缩放以适配原有移动端取景，相机和页面布局未改。
- **实测（冠顶升级阶段）**：1440 × 900、Chrome 157、Intel Arc 130T 的带窗实测中，原版约 34.0 fps / p95 43.7 ms，升级后约 31.9 fps / p95 42.7 ms；三角面约 2.22M → 3.46M，draw call 304 → 271。平均帧率约低 6%，p95 反而略好；更详细的冷/热采样、移动端与截图见[冠顶升级验收报告](冠顶升级验收报告.md)。

## 双环独立旋转（本轮修复）

建筑主体现在完全静止，只有内部两圈木马分别绕场景中心旋转。

- **静态主体**：冠顶、屋顶、灯带、灯链、帷幕、中央立柱、底座、地面、星空与镜面反射都不随木马旋转；场景根节点和主 carousel 组保持 0°。
- **外圈**：8 匹，半径 5.24；绕中心枢轴顺时针旋转，角速度 0.12 rad/s。
- **内圈**：4 匹，半径 3.18；绕中心枢轴逆时针旋转，角速度 0.15 rad/s。
- 两圈枢轴都是位于 (0, 0, 0) 的 Object3D，名称分别为 outerHorseRingPivot / innerHorseRingPivot；两圈速度独立配置。
- 原来的上下起伏、前后倾摆与速度/相位全部保留；支撑杆随所属环旋转，但不跟随木马做上下起伏。
- 木马、鞍布、缰绳和支撑杆的模型/材质/颜色没有改；木马按环重新拆分为独立的 InstancedMesh 组，避免每匹马单独 draw call。为让两环各自拥有真实父级，实例组从每姿态一组拆成每环每姿态一组，draw call 约 271 → 322；三角面、材质和灯光未变。
- 俯视验证约定：屏幕上方为 -Z、右侧为 +X；外圈角度递减，视觉为顺时针；内圈角度递增，视觉为逆时针。

已实际运行 30 秒以上；测试中 group.rotation.y 始终为 0，两圈独立转动，马匹起伏正常。截图与详细数据见[双环旋转验收报告](双环旋转验收报告.md)。

## 背景音乐

右下角有一个小型音乐控制条。首次打开默认暂停，需要点击播放，以遵守浏览器的自动播放限制。

- 播放 / 暂停、静音、音量调节（默认 30%）；金色电平条在播放时轻微起伏。
- 播放淡入约 2 秒，暂停淡出约 1 秒；单个 `<audio>` 元素循环播放，避免重复实例。
- 页面切换到后台时暂停音乐并释放播放负担；回到前台后自动恢复（若浏览器允许）。
- 音频以 160 kbps MP3 的 data URI 内嵌在 HTML 中；无外部音乐服务器、无运行时网络请求。
- 播放失败（如浏览器拒绝、解码失败）只会在控制条显示“音乐不可用/点击重试”，不会影响 Three.js 场景。

### 曲目与许可证

- 曲目：**Frost Waltz**，Kevin MacLeod（incompetech.com），2008。
- 来源：[incompetech 曲目页](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100516) · [Wikimedia Commons 录音文件](https://commons.wikimedia.org/wiki/File:Frost_Waltz_(ISRC_USUAN1100516).mp3)
- 许可证：[Creative Commons Attribution 3.0 Unported（CC BY 3.0）](https://creativecommons.org/licenses/by/3.0/)。署名必须保留；版权归 Kevin MacLeod。
- 本页改动：约 -16.5 LUFS 响度归一化、首尾淡入淡出、160 kbps MP3 编码、循环播放；保留完整 135 秒录音。
- 页内音乐控制条的 ⓘ 按钮展示署名和许可证；原始下载、许可证全文和元数据保存在 `assets/music-src/`。
- 选择说明：检索过 CC0/公版与 CC 授权的旋转木马/音乐盒类录音；可用的卡罗斯尔主题候选多为 CC BY-NC-ND 或来源不明，最终选用这首明确允许改编和嵌入、且节拍（约 99 BPM 华尔兹）与钟琴/钢片琴/弦乐编制最贴近场景的 CC BY 3.0 录音。

## 场景与渲染

- 暗夜紫黑星空与淡雾紫星云衬托五层宫廷冠顶和暗古铜底座。香槟金细饰、象牙白嵌板、深酒红丝绒与少量灰玫瑰粉马饰形成层次。
- 12 匹木马采用连续的实体雕塑网格。两套骑乘姿态共享象牙白烤漆、深色鬃尾、灰玫瑰鞍布与香槟金马具，鞍座套环接合原有垂直支撑杆。
- 6,200 个萤火虫沿用原来的 GPU 运动逻辑，粒子主体与两级拖尾通过一次实例化绘制。保留平面镜像、体积光和动态烟雾。
- 线性 HDR 中执行 GTAO 和 Bloom，最终通过 ACES 色调映射和 sRGB 转换输出。PCF 阴影和镜面分帧刷新，页面隐藏时暂停绘制。

## 预览与验收

- [木马正面](horse-previews/front.png) · [木马侧面](horse-previews/side.png) · [木马 45°](horse-previews/three-quarter.png)
- [旋转木马整体截图](horse-previews/carousel.png)
- [木马建模与性能报告](木马建模报告.md)
- **历史版本备份**：双环旋转前、冠顶前、加音乐前的 HTML/源码备份保留在本地交付中，未随 GitHub 源码包上传；当前根目录 HTML 与完整的本地交付保持对应。
- [双环旋转验收报告](双环旋转验收报告.md)
- 双环旋转截图：[修改前](rotation-previews/01_before.png) · [修改后初始](rotation-previews/02_after_initial.png) · [运行 15 秒](rotation-previews/03_after_15s.png) · [运行 30 秒](rotation-previews/04_after_30s.png) · [俯视初始](rotation-previews/05_top_initial.png) · [俯视 15 秒](rotation-previews/06_top_15s.png)
- [冠顶升级验收报告](冠顶升级验收报告.md)
- 冠顶截图：[夜景整体](canopy-previews/01_night_overall.png) · [正面远景](canopy-previews/02_front_far.png) · [正面近景](canopy-previews/03_front_close.png) · [仰视天花板](canopy-previews/04_under_ceiling.png) · [45° 侧面](canopy-previews/05_side_45.png) · [冠顶细节](canopy-previews/06_crown_detail.png) · [冠板/帷幕细节](canopy-previews/07_frieze_detail.png) · [移动端](canopy-previews/08_mobile.png)
- [音乐功能验收报告](音乐功能验收报告.md)
- 音乐界面：[桌面待播放](music-previews/desktop-idle.png) · [桌面播放中](music-previews/desktop-playing.png) · [版权信息](music-previews/credits.png) · [移动端播放中](music-previews/mobile-playing.png)
- [上轮调色验收报告](验收报告.md)

## 开发

源码位于 `src/`。木马的解剖网格、面部与鬃尾、马具及材质分别位于 `horse-anatomy.js`、`horse-detail.js`、`horse-tack.js` 和 `horse-model.js`。宫廷冠顶的几何、材质、灯光与灯具实例位于 `ornate-canopy.js`；`carousel.js` 负责冠顶挂接、两圈木马 Pivot 和每帧更新。双环旋转逻辑只改 `carousel.js` 中的木马分组与 update，没有修改马匹模型。音乐控制逻辑位于 `music-ui.js`，原始/授权音频及许可证资料位于 `assets/music-src/`，处理后的可嵌入音频为 `assets/music.mp3`。依赖 `three` 与 `esbuild`；在本目录执行 `npm install` 后运行以下命令，重新生成开发包和上一级的离线 HTML。

```sh
node build.mjs --standalone
```

仅运行 `node build.mjs` 可更新开发入口 `index.html` 引用的 `bundle.js`。`--standalone` 会把场景包、`music-ui.js` 和 160 kbps MP3（Base64 data URI）一起写入单文件 HTML。改动音乐后，请先准备新的 `assets/music.mp3`，并同步更新 `assets/music-src/CREDITS.md` 与页内署名。
