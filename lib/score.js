// 默认的代码评分逻辑
exports.scoreDefaultDeal = function (codeObj){
    const { apiMap, noUseMap,  parseErrorFiles, browserApiMap } = codeObj;
    let score = 100;            // 初始分数
    let message =[];            // 代码建议

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
    // browserapi使用建议
    Object.keys(browserApiMap).forEach((fitem)=>{
        Object.keys(browserApiMap[fitem]).forEach((sitem)=>{
            if(fitem ==='window'){
                message.push(fitem+'.'+sitem+' 属于全局类型api，建议请评估影响慎重使用');
            }
            if(fitem ==='document'){
                message.push(fitem+'.'+sitem+' 属于Dom类型操作api，建议评估影响慎重使用');
            }
            if(fitem ==='history'){
                score = score - 2;
                message.push(fitem+'.'+sitem+' 属于路由类操作api，请使用Router相关api代替');
            }
            if(fitem ==='location'){
                score = score - 2;
                message.push(fitem+'.'+sitem+' 属于路由类操作api，请使用Router相关api代替');
            }
        })
    })
    // 引入但未调用扣分处理
    Object.keys(noUseMap).forEach((fitem)=>{
        if(noUseMap[fitem].callNum >0 && noUseMap[fitem].callOrigin.length >0){
            score = score - 2;
            let tempMessage ='';
            noUseMap[fitem].callOrigin.forEach((item)=>{
                tempMessage = tempMessage + item;
                tempMessage = tempMessage + ', ';
            })
            tempMessage = tempMessage + noUseMap[fitem].callNum + '个文件中引入' + fitem + '但未使用，请修复';
            message.push(tempMessage);
        }
    })
    // 解析AST失败或执行分析触发异常的扣分处理
    if(parseErrorFiles.length >0){
        score = score - 3*parseErrorFiles.length;
        let tempMessage ='';
        tempMessage = parseErrorFiles.length + '个文件解析AST或执行分析异常，建议修复';
        message.push(tempMessage);
    }

    // 最低0分
    if(score <0)score =0;

    return {
        score: score,
        message: message
    }
}