const fs = require('fs');                                                            // 文件操作
const path = require('path');                                                        // 路径操作
const { writeJsFile, writeJsonFile } = require(path.join(__dirname, './file'));      // 文件工具

// 输出分析报告
exports.writeReport = function (dir, content){
    try{
        // 创建目录
        fs.mkdirSync(path.join(process.cwd(),`/${dir}`),0777);
        // 复制文件
        fs.writeFileSync(path.join(process.cwd(), `/${dir}/jquery.min.js`), fs.readFileSync(path.join(__dirname, '../template/jquery.min.js')));
        fs.writeFileSync(path.join(process.cwd(), `/${dir}/index.html`), fs.readFileSync(path.join(__dirname, '../template/report.html')));
        // 分析结果写入文件
        writeJsFile('var report=', content, `${dir}/index`); 
        writeJsonFile(content, `${dir}/index`);
    }catch(e){
        throw e;
    }
}