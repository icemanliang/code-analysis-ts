const fs =require('fs');                                                // 文件操作
const path =require('path');                                            // 路径操作
const codeAnalysis = require(path.join(__dirname, '../lib/index'));     // 核心入口

const analysis = async function(options){
    if(options){
        if(!options.scanPath || !Array.isArray(options.scanPath) || options.scanPath.length ==0){
            Promise.reject(new Error('error: scanPath参数有误'))
            return;
        }
        let isCodePath = true;
        let unExistDir = '';
        for (let i =0; i<options.scanPath.length; i++){
            const scanPath = path.join(process.cwd(), options.scanPath[i]);
            if(!fs.existsSync(scanPath)){
                isCodePath = false;
                unExistDir = options.scanPath[i];
                break;
            }
        }
        if(!isCodePath){
            Promise.reject(new Error(`error: 待分析文件目录${unExistDir}不存在`))
            return;
        }
        if(!options.target){
            Promise.reject(new Error('error: target参数不能为空'))
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