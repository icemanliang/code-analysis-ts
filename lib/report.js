const fs = require('fs');                                                                                                    // 文件操作
const path = require('path');                                                                                                // 路径操作
const { writeJsFile, writeJsonFile } = require(path.join(__dirname, './file'));                                              // 文件工具
const { TEMPLATEDIR, REPORTFILENAME, REPORTJSPRE, DIAGNOSISREPORTFILENAME } = require(path.join(__dirname, './constant'));   // 常量模块

// 输出分析报告
exports.writeReport = function (dir, content, templatePath=''){
    try{
        // 创建目录
        fs.mkdirSync(path.join(process.cwd(),`/${dir}`),0777);
        // 复制报告模版
        if(templatePath && templatePath!=''){
            fs.writeFileSync(path.join(process.cwd(), `/${dir}/${REPORTFILENAME}.html`), fs.readFileSync(path.join(process.cwd(), `${templatePath}`)));
        }else{
            fs.writeFileSync(path.join(process.cwd(), `/${dir}/${REPORTFILENAME}.html`), fs.readFileSync(path.join(__dirname, `../${TEMPLATEDIR}/${REPORTFILENAME}.html`)));
        }
        // 分析结果写入文件
        writeJsFile(REPORTJSPRE, content, `${dir}/${REPORTFILENAME}`); 
        writeJsonFile(content, `${dir}/${REPORTFILENAME}`);
    }catch(e){
        throw e;
    }
}
// 输出诊断报告
exports.writeDiagnosisReport = function (dir, content) {
    try{
        writeJsonFile(content, `${dir}/${DIAGNOSISREPORTFILENAME}`);
    }catch(e){
        throw e;
    }
}