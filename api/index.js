const fs = require('fs');                                                // 文件操作
const path = require('path');                                            // 路径操作
const codeAnalysis = require(path.join(__dirname, '../lib/index'));      // 核心入口

const analysis = async function(options){
    if(options){
        if(!options.scanSource || !Array.isArray(options.scanSource) || options.scanSource.length ==0){
            Promise.reject(new Error('error: scanSource参数不能为空'))
            return;
        }
        let isParamsError = false;
        let isCodePathError = false;
        let unExistDir = '';
        for (let i =0; i<options.scanSource.length; i++){
            if(!options.scanSource[i].name || !options.scanSource[i].path || !Array.isArray(options.scanSource[i].path) || options.scanSource[i].path.length ==0){
                isParamsError = true;
                break;
            }
            let innerBreak = false;
            const tempPathArr = options.scanSource[i].path;
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
        if(isParamsError){
            Promise.reject(new Error('error: scanSource参数选项必填属性不能为空'))
            return;
        }
        if(isCodePathError){
            Promise.reject(new Error(`error: 待分析文件目录${unExistDir}不存在`))
            return;
        }
        if(!options.analysisTarget){
            Promise.reject(new Error('error: analysisTarget参数不能为空'))
            return;
        }
    }else{
        Promise.reject(new Error('error: 缺少options'))
        return;
    }
    try{
        const report = await codeAnalysis(options);
        return Promise.resolve(report);
    }catch(e){
        return Promise.reject(e.stack);
    }
}

module.exports = analysis;