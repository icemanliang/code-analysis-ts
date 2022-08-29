#!/usr/bin/env node
const program = require('commander');                                   // 美化命令行交互
const { execSync } = require('child_process');                          // 子进程操作
const path = require('path');                                           // 路径操作
const fs =require('fs');                                                // 文件操作
const chalk = require('chalk');                                         // 美化命令行输出
const codeAnalysis =require(path.join(__dirname,'../lib/index'));       // 核心入口
const { writeReport } = require(path.join(__dirname, '../lib/file'));   // 文件操作工具方法

program
    .command('analysis')
    .description('analysis code and echo report')
    .action(async () => {
        try{
            const configPath =path.join(process.cwd(),'./analysis.config.js');
            const isConfig =fs.existsSync(configPath);
            if(isConfig){
                let config =require(configPath);
                const scanPath =path.join(process.cwd(), config.scanPath);
                const isCodePath =fs.existsSync(scanPath);
                if(isCodePath){
                    if(config && config.target){
                        // 如果分析报告目录已经存在，则先删除目录
                        const reportPath =path.join(process.cwd(),`./${config.reportDir}`);
                        const isReport =fs.existsSync(reportPath);
                        if(isReport){
                            execSync(`rm -rf ${reportPath}`, {
                                stdio: 'inherit',
                            });
                        }
                        try{
                            // 分析代码
                            const report = await codeAnalysis(config);
                            // 输出分析报告
                            writeReport(config.reportDir, report);
                            // 代码告警/正常退出
                            if(config.thresholdScore && typeof(config.thresholdScore) ==='number' && config.thresholdScore >0){
                                if(report.scoreMap.score && report.scoreMap.score < config.thresholdScore){
                                    console.log(chalk.red('\n' + '代码得分：' + report.scoreMap.score + ', 不合格'));      // 输出代码分数信息
                                    if(report.scoreMap.message.length >0){                                  // 输出代码建议信息
                                        console.log(chalk.yellow('\n' + '优化建议：'));                           
                                        report.scoreMap.message.forEach((element, index) => {
                                            console.log(chalk.yellow((index+1) + '. ' + element));
                                        });
                                    }
                                    process.exit(1);                                     // 触发告警错误主动退出当前进程
                                }else{
                                    console.log(chalk.green('\n' + '代码得分：' + report.scoreMap.score));     // 输出代码分数信息
                                    if(report.scoreMap.message.length >0){                                  // 输出代码建议信息
                                        console.log(chalk.yellow('\n' + '优化建议：'));                           
                                        report.scoreMap.message.forEach((element, index) => {
                                            console.log(chalk.yellow((index+1) + '. ' + element));
                                        });
                                    }
                                }
                            }else{
                                console.log(chalk.green('\n' + '代码得分：' + report.scoreMap.score + '\n'));         // 输出代码分数信息
                                if(report.scoreMap.message.length >0){                                  // 输出代码建议信息
                                    console.log(chalk.yellow('\n' + '优化建议：'));                           
                                    report.scoreMap.message.forEach((element, index) => {
                                        console.log(chalk.yellow((index+1) + '. ' + element));
                                    });
                                }            
                            }
                        }catch(e){
                            console.log(chalk.red(e.stack));        // 输出错误信息
                            process.exit(1);                        // 错误主动退出当前进程
                        }
                    }else{
                        console.log(chalk.red('error: analysis.config.js配置文件缺少必填配置项target'));
                    }
                }else{
                    console.log(chalk.red('error: 待分析文件目录不存在'));
                }
            }else{
                console.log(chalk.red('error: 缺少analysis.config.js配置文件'));
            }
        }catch(e){
            console.log(chalk.red(e.stack));
        }
    })

program.parse(process.argv)
