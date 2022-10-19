# code-analysis-ts

[code-analysis-ts](https://www.npmjs.com/package/code-analysis-ts)是一款ts代码扫描分析工具，支持命令行/API调用两种模式。可用于生成代码分析报告，实现代码评分，代码告警，“脏”代码合入拦截等功能，可通过npm script非常方便的集成到业务的CI自动化流程中。

# Install

1. npm install code-analysis-ts
# Config

2. 创建 analysis.config.js 配置文件

配置demo:
```javascript
module.exports ={
    scanPath: 'src',                                                            // 必须，需要分析的文件目录名
    target: 'framework',                                                        // 必须，需要分析的依赖名
    blackApis: ['app.localStorage.set'],                                        // 可选, api黑名单，默认为空数组
    browserApis: ['window','document','history','location'],                    // 可选，要分析的browserapi，默认为空数组
    reportDir: 'report',                                                        // 可选，生成代码分析报告的目录，默认为code_report
    isScanVue: true,                                                            // 可选，是否要扫描分析vue中的ts代码，默认为false
    scoreFun: null,                                                             // 可选，自定义代码评分函数，默认为null即采用工具默认评分函数
    thresholdScore: 90                                                          // 可选，开启代码告警及设置合格阈值分数，默认为null即关闭告警逻辑
}
```
# Mode
## (1) cli 模式

```javascript
ca analysis         // 建议添加到npm script
```
## (2) api 模式

demo:

```javascript
import analysis from 'code-analysis-ts';

function async start(){
    try{
        const code_report = await analysis(options);                           // options配置等同于analysis.config.js配置文件
    }catch(e){
        console.log(e);
    }
}
start();
```
# Demo

[code-demo](https://github.com/liangxin199045/code-demo)用于演示如何使用code-analysis-ts代码扫描分析工具的demo项目,使用了github pages来部署代码分析报告
