# code-analysis-ts

[code-analysis-ts](https://www.npmjs.com/package/code-analysis-ts)是一款ts代码分析工具，支持命令行/API模式两种模式调用，生成代码分析报告。可用于实现代码评分，代码告警，防止“脏”代码合入分支等功能，集成到CI可实现自动化。

## (1) 以命令行形式使用

1. 安装 npm install code-analysis-ts

2. 创建 analysis.config.js 配置文件

3. 执行 ca analysis 

analysis.config.js配置demo:

```javascript
module.exports ={
    scanPath: 'src',                                                            // 必须，需要分析的目录名
    target: 'framework',                                                        // 必须，需要分析的依赖包名
    blackApis: ['app.localStorage.set'],                                        // 可选, api黑名单，默认为空数组
    browserApis: ['window','document','history','location'],                    // 可选，要分析的browserapi，默认为空数组
    reportDir: 'report',                                                        // 可选，生成代码分析报告的目录，默认为code_report
    isScanVue: true,                                                            // 可选，是否要扫描分析vue中的ts代码，默认为false
    scoreFun: null,                                                             // 可选，自定义代码评分函数，默认为null即采用默认评分函数
    thresholdScore: 90                                                          // 可选，开启代码告警及设置合格阈值分数，默认为null即关闭告警逻辑
}
```
## (2) 以API模式调用

使用demo:

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
