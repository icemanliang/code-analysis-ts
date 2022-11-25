// 默认评分插件
exports.defaultScorePlugin = function (analysisContext){
    // console.log(analysisContext);
    const { pluginsQueue, browserQueue, importItemMap, parseErrorInfos } = analysisContext;
    const mapNames = pluginsQueue.map(item=>item.mapName).concat(browserQueue.map(item=>item.mapName));
    
    let score = 100;            // 初始分数
    let message =[];            // 代码建议

    // 黑名单API扣分处理
    if(mapNames.length>0){
        mapNames.forEach((item)=>{
            Object.keys(analysisContext[item]).forEach((sitem)=>{
                if(analysisContext[item][sitem].isBlack){
                    score = score - 5;
                    message.push(sitem + ' 属于黑名单api，请勿使用');
                }
            })
        })
    }
    // ImportItem扣分处理
    Object.keys(importItemMap).forEach((item)=>{
        if(importItemMap[item].callOrigin =='*'){
            score = score - 2;
            message.push('import * as ' + item + ' 属于非建议导入方式，建议修改');
        }
    })
    // BrowserAPI扣分处理
    if(mapNames.includes('browserMap')){
        // browserapi使用建议
        Object.keys(analysisContext['browserMap']).forEach((item)=>{
            let keyName = '';
            if(item.split('.').length>0){
                keyName = item.split('.')[0];
            }else{
                keyName = item;
            }
            if(keyName ==='window'){
                message.push(item + ' 属于全局类型api，建议请评估影响慎重使用');
            }
            if(keyName ==='document'){
                message.push(item + ' 属于Dom类型操作api，建议评估影响慎重使用');
            }
            if(keyName ==='history'){
                score = score - 2;
                message.push(item + ' 属于路由类操作，请使用框架提供的Router API代替');
            }
            if(keyName ==='location'){
                score = score - 2;
                message.push(item + ' 属于路由类操作，请使用框架提供的Router API代替');
            }
        })
    }
    // 解析AST失败或执行分析触发异常的扣分处理
    if(parseErrorInfos.length >0){
        score = score - 3*parseErrorInfos.length;
        let tempMessage ='';
        tempMessage = parseErrorInfos.length + ' 个文件解析&分析AST时发生错误，请修复';
        message.push(tempMessage);
    }

    // 最低0分
    if(score <0)score =0;

    return {
        score: score,
        message: message
    }
}