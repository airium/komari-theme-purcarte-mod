// 配置类型定义
export interface ConfigOptions {
  isShowConfigEditButtonInLogined: boolean; // 是否在登录时显示配置编辑按钮
  mainWidth: number; // 主内容宽度百分比
  backgroundImage: string; // 桌面端背景图片URL
  backgroundImageMobile: string; // 移动端背景图片URL
  enableVideoBackground: boolean; // 是否启用视频背景
  videoBackgroundUrl: string; // 桌面端视频背景URL
  videoBackgroundUrlMobile: string; // 移动端视频背景URL
  backgroundAlignment: string; // 背景对齐方式
  blurValue: number; // 磨砂玻璃模糊值
  blurBackgroundColor: string; // 磨砂玻璃背景颜色
  enableTransparentTags: boolean; // 是否启用标签透明背景
  tagDefaultColorList: string; // 标签默认颜色列表
  selectThemeColor: ColorType; // 默认主题颜色
  enableLogo: boolean; // 是否启用Logo
  logoUrl: string; // Logo图片URL
  enableTitle: boolean; // 是否启用标题
  titleText: string; // 标题文本
  enableSearchButton: boolean; // 是否启用搜索按钮
  enableAdminButton: boolean; // 是否启用管理员按钮
  enableJsonRPC2Api: boolean; // 是否启用 JSON-RPC2 API 适配
  defaultSelectedGroup: string; // 默认选择展示分组
  pingChartTimeInPreview: number; // 预览详情的延迟图表时间范围，单位为小时
  enableInstanceDetail: boolean; // 是否启用实例详情
  enablePingChart: boolean; // 是否启用延迟图表
  enableConnectBreaks: boolean; // 是否启用连接断点
  pingChartMaxPoints: number; // 延迟图表最大点数
  isShowHWBarInCard: boolean; // 是否在卡片中显示硬件信息栏
  enableListItemProgressBar: boolean; // 是否启用列表视图进度条
  customTexts: string; // 自定义UI文本
}

// 默认配置值
export const DEFAULT_CONFIG: ConfigOptions = {
  isShowConfigEditButtonInLogined: true,
  mainWidth: 85,
  backgroundImage: "/assets/Moonlit-Scenery.webp",
  backgroundImageMobile: "",
  enableVideoBackground: false,
  videoBackgroundUrl: "/assets/LanternRivers_1080p15fps2Mbps3s.mp4",
  videoBackgroundUrlMobile: "",
  backgroundAlignment: "cover,top",
  blurValue: 10,
  blurBackgroundColor: "rgba(0, 0, 0, 0.5)",
  enableTransparentTags: true,
  tagDefaultColorList:
    "ruby,gray,gold,bronze,brown,yellow,amber,orange,tomato,red",
  selectThemeColor: "violet",
  enableLogo: false,
  logoUrl: "/assets/logo.png",
  enableTitle: true,
  titleText: "Komari",
  enableSearchButton: true,
  enableAdminButton: true,
  enableJsonRPC2Api: false,
  defaultSelectedGroup: "",
  pingChartTimeInPreview: 1,
  enableInstanceDetail: true,
  enablePingChart: true,
  enableConnectBreaks: false,
  pingChartMaxPoints: 1440,
  isShowHWBarInCard: true,
  enableListItemProgressBar: true,
  customTexts: "",
};
// 定义颜色类型
export type ColorType =
  | "ruby"
  | "gray"
  | "gold"
  | "bronze"
  | "brown"
  | "yellow"
  | "amber"
  | "orange"
  | "tomato"
  | "red"
  | "crimson"
  | "pink"
  | "plum"
  | "purple"
  | "violet"
  | "iris"
  | "indigo"
  | "blue"
  | "cyan"
  | "teal"
  | "jade"
  | "green"
  | "grass"
  | "lime"
  | "mint"
  | "sky";
export const allColors: ColorType[] = [
  "ruby",
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
];

export type SiteStatus =
  | "public"
  | "private-unauthenticated"
  | "private-authenticated"
  | "authenticated";

