#!/usr/bin/env node
const program = require('commander');                                                           // 命令行交互
const path = require('path');                                                                   // 路径操作
const fs = require('fs');                                                                       // 文件操作
const chalk = require('chalk');                                                                 // 美化输出
const { writeReport, writeDiagnosisReport } = require(path.join(__dirname, '../lib/report'));   // 报告模块
const { REPORTDEFAULTDIR, VUETEMPTSDIR } = require(path.join(__dirname, '../lib/constant'));    // 常量模块
const { mkDir, rmDir } = require(path.join(__dirname, '../lib/file'));                          // 文件工具
const codeAnalysis = require(path.join(__dirname,'../lib/index'));                              // 分析入口

program
    .command('analysis')
    .description('analysis code and echo report')
    .action(async () => {
        try{
            const configPath =path.join(process.cwd(),'./analysis.config.js');
            const isConfig =fs.existsSync(configPath);
            if(isConfig){
                let config =require(configPath);
                if(config.scanSource && Array.isArray(config.scanSource) && config.scanSource.length>0){
                    let isParamsError = false;
                    let isCodePathError = false;
                    let unExistDir = '';
                    for (let i =0; i<config.scanSource.length; i++){
                        if(!config.scanSource[i].name || !config.scanSource[i].path || !Array.isArray(config.scanSource[i].path) || config.scanSource[i].path.length ==0){
                            isParamsError = true;
                            break;
                        }
                        let innerBreak = false;
                        const tempPathArr = config.scanSource[i].path;
                        for (let j =0; j<tempPathArr.length; j++){
                            const tempPath = path.join(process.cwd(), tempPathArr[j]);
                            if(!fs.existsSync(tempPath)){
                                isCodePathError = true;
                                unExistDir = tempPathArr[j];
                                innerBreak = true;
                                break;
                            }
                        }
                        if(innerBreak)break;
                    }
                    if(!isParamsError){
                        if(!isCodePathError){
                            if(config && config.analysisTarget){
                                try{
                                    // 如果分析报告目录已经存在，则先删除目录
                                    rmDir(config.reportDir || REPORTDEFAULTDIR);
                                    // 如果temp目录已经存在，则先删除目录
                                    rmDir(VUETEMPTSDIR);
                                    // 如果需要扫描vue文件，创建temp目录
                                    if(config.isScanVue){
                                        mkDir(VUETEMPTSDIR);
                                    }
                                    // 分析代码
                                    const { report, diagnosisInfos } = await codeAnalysis(config);
                                    // 输出分析报告
                                    writeReport(config.reportDir || 'report', report);
                                    // 输出诊断报告
                                    writeDiagnosisReport(config.reportDir || 'report', diagnosisInfos);
                                    // 删除temp目录
                                    rmDir(VUETEMPTSDIR);
                                    // 代码告警/正常退出
                                    if(config.scorePlugin && config.alarmThreshold && typeof(config.alarmThreshold) ==='number' && config.alarmThreshold >0){
                                        if(report.scoreMap.score && report.scoreMap.score < config.alarmThreshold){
                                            console.log(chalk.red('\n' + '代码得分：' + report.scoreMap.score + ', 不合格'));      // 输出代码分数信息
                                            if(report.scoreMap.message.length >0){                                              // 输出代码建议信息
                                                console.log(chalk.yellow('\n' + '优化建议：'));                           
                                                report.scoreMap.message.forEach((element, index) => {
                                                    console.log(chalk.yellow((index+1) + '. ' + element));
                                                });
                                            }
                                            console.log(chalk.red('\n' + '=== 触发告警 ===' + '\n'));                          // 输出告警信息
                                            process.exit(1);                                                                  // 触发告警错误并结束进程
                                        }else{
                                            console.log(chalk.green('\n' + '代码得分：' + report.scoreMap.score));              // 输出代码分数信息
                                            if(report.scoreMap.message.length >0){                                            // 输出代码建议信息
                                                console.log(chalk.yellow('\n' + '优化建议：'));                           
                                                report.scoreMap.message.forEach((element, index) => {
                                                    console.log(chalk.yellow((index+1) + '. ' + element));
                                                });
                                            }
                                        }
                                    }else if(config.scorePlugin){
                                        console.log(chalk.green('\n' + '代码得分：' + report.scoreMap.score));          // 输出代码分数信息
                                        if(report.scoreMap.message.length >0){                                               // 输出代码建议信息
                                            console.log(chalk.yellow('\n' + '优化建议：'));                           
                                            report.scoreMap.message.forEach((element, index) => {
                                                console.log(chalk.yellow((index+1) + '. ' + element));
                                            });
                                        }            
                                    }
                                }catch(e){
                                    // 删除temp目录
                                    rmDir(VUETEMPTSDIR);
                                    console.log(chalk.red(e.stack));        // 输出错误信息
                                    process.exit(1);                        // 错误退出进程
                                }
                            }else{
                                console.log(chalk.red('error: 配置文件中缺少必填配置项analysisTarget'));
                            }
                        }else{
                            console.log(chalk.red(`error: 配置文件中待分析文件目录${unExistDir}不存在`));
                        }
                    }else{
                        console.log(chalk.red('error: scanSource参数选项必填属性不能为空'));
                    }
                }else{
                    console.log(chalk.red('error: 配置文件中必填配置项scanSource不能为空'))
                }
            }else{
                console.log(chalk.red('error: 缺少analysis.config.js配置文件'));
            }
        }catch(e){
            console.log(chalk.red(e.stack));
        }
    })

program.parse(process.argv)
