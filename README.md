[![npm version](https://badge.fury.io/js/code-analysis-ts.svg)](https://www.npmjs.com/package/code-analysis-ts)
[![Downloads](https://img.shields.io/npm/dm/code-analysis-ts.svg)](https://www.npmjs.com/package/code-analysis-ts)
# code-analysis-ts

[code-analysis-ts](https://www.npmjs.com/package/code-analysis-ts)是一款TS代码扫描分析工具，可用于生成代码分析报告，实现代码评分，代码告警，“脏”代码拦截等功能。支持CLI/API两种使用模式，通过npm script可以快速集成到业务CI自动化流程中。

## Install

```javascript
npm install code-analysis-ts --save-dev
// or
yarn add code-analysis-ts --dev    
```
## Config

新建 analysis.config.js 配置文件:
```javascript
const { execSync } = require('child_process');                        // 子进程操作
const DefaultBranch = 'master';                                       // 默认分支常量
function getGitBranch() {                                             // 获取当然分支
    try{
        const res = execSync('git branch');
        return res.toString("utf8").replace('*','').trim();
    }catch(e){
        return DefaultBranch;
    }
}

module.exports = {
    scanSource: [{                                                    // 必须，待扫描源码的配置信息
        name: 'Market',                                                    // 必填，项目名称
        path: ['src'],                                                     // 必填，需要扫描的文件路径
        httpRepo: `https://gitlab.xxx.com/xxx/-/blob/${getGitBranch()}/`   // 可选，项目gitlab/github url的访问前缀，用于点击行信息跳转，不填则不跳转
    }],                                                                 
    analysisTarget: 'framework',                                      // 必须，要分析的目标依赖名
    blackApis: ['app.localStorage.set'],                              // 可选，需要标记的黑名单api，默认为空数组
    browserApis: ['window','document','history','location'],          // 可选，要分析的BrowserApi，默认为空数组
    reportDir: 'report',                                              // 可选，生成代码分析报告的目录，默认为report
    reportTitle: 'Market代码分析报告',                                  // 可选，代码分析报告标题，默认为'代码分析报告'
    isScanVue: true,                                                  // 可选，是否要扫描分析vue中的ts代码，默认为false
    scorePlugin: 'default',                                           // 可选，评分插件: Function|'default'|null, default表示运行默认插件，null表示不评分
    thresholdScore: 90                                                // 可选，开启代码告警及阈值分数(0-100)，默认为null即关闭告警逻辑 (CLI模式生效)
}
```
## Mode
### 1. cli

```javascript
// package.json 片段，添加bin command到npm script
...
"scripts": {
    "analysis": "ca analysis"
}
...

$ npm run analysis
// or
$ yarn analysis        
```
### 2. api

```javascript
const analysis = require('code-analysis-ts');

async function scan() {
    try{
        const codeReport = await analysis({
            scanSource: [{                                                // 必须，待扫描源码的配置信息
                name: 'Market',                                                // 必填，项目名称
                path: ['src'],                                                 // 必填，需要扫描的文件路径
                httpRepo: `https://gitlab.xxx.com/xxx/-/blob/${xxx}/`          // 可选，项目gitlab/github url的访问前缀，用于点击行信息跳转，不填则不跳转
            }],                                                                 
            analysisTarget: 'framework',                                  // 必须，要分析的目标依赖名
            blackApis: ['app.localStorage.set'],                          // 可选，需要标记的黑名单api，默认为空数组
            browserApis: ['window','document','history','location'],      // 可选，要分析的BrowserApi，默认为空数组
            reportDir: 'report',                                          // 可选，生成代码分析报告的目录，默认为report
            reportTitle: 'Market代码分析报告',                              // 可选，代码分析报告标题，默认为'代码分析报告'
            isScanVue: true,                                              // 可选，是否要扫描分析vue中的ts代码，默认为false
            scorePlugin: 'default'                                        // 可选，评分插件: Function|'default'|null, default表示运行默认插件，null表示不评分
        });                                                                          
        console.log(codeReport);
    }catch(e){
        console.log(e);
    }
};

scan();
```
## Demo

[code-demo](https://github.com/liangxin199045/code-demo)演示如何使用code-analysis-ts的demo项目,使用github pages部署代码分析报告

## scorePlugin说明
配置文件中的scorePlugin配置项属于“函数插件”，使用者可以自定义代码评分插件来消费分析产物，开发插件需要对分析产物数据结构及属性有一定理解。下面是一个demo:
```javascript
// score.js
exports.myScoreDeal = function (codeObj){                           // 入参是代码分析结果数据对象上下文
    const { 
        apiMap,                                                     // 引入api分析结果
        typeMap,                                                    // 引入Type分析结果
        noUseMap,                                                   // 引入但未调用分析结果
        parseErrorFiles,                                            // 解析失败文件分析结果
        browserApiMap                                               // browserapi分析结果
    } = codeObj;
    
    let score = 100;                                                // 初始分数
    let message =[];                                                // 代码建议

    // 黑名单api扣分处理
    Object.keys(apiMap).forEach((fitem)=>{
        if(apiMap[fitem].noDeep){
            if(apiMap[fitem].isBlack){
                score = score - 5;
                message.push(fitem + ' 属于黑名单api，请勿使用');
            }
        }else{
            Object.keys(apiMap[fitem]).forEach((sitem)=>{
                if(apiMap[fitem][sitem].children){
                    Object.keys(apiMap[fitem][sitem].children).forEach((titem)=>{
                        const temp =apiMap[fitem][sitem].children[titem];
                        if(temp.isBlack){
                            score = score - 5;
                            message.push(fitem + '.' + sitem + '.' + titem + ' 属于黑名单api，请勿使用');
                        }
                    })
                }else{
                    const temp = apiMap[fitem][sitem];
                    if(temp.isBlack){
                        score = score - 5;
                        message.push(fitem + '.' + sitem + ' 属于黑名单api，请勿使用');
                    }
                }
            })
        }
    })
    // 最低0分处理
    if(score <0)score =0;

    // return返回一个带有score属性，message属性的对象(必须)
    return {                                   
        score: score,                          // number
        message: message                       // string[]
    }
}

//analysis.config.js
const { myScoreDeal } = require('./score.js');            // 自定义评分插件

module.exports = {
    ...
    scorePlugin: myScoreDeal,
    ...
}

```
scorePlugin 为null表示不评分，为'default'表示运行默认评分插件。
