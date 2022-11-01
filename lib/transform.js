// apiMap数据转换处理
exports.transformApiMap =function(map, imports, blackApis = []) {
    let result = {};
    Object.keys(imports).forEach(element => {
      result[element] = {};
    });
    Object.keys(map).forEach(melement => {
      const temp = melement.split('.');
      if(temp.length>1){
        Object.keys(result).forEach(relement => {
          if (temp[0] == relement) {
            if (temp.length == 2) {
              if (!result[relement][temp[1]]) {
                result[relement][temp[1]] = {};
                result[relement][temp[1]].callNum = map[melement].callNum;
                result[relement][temp[1]].callOrigin = map[melement].callOrigin;
                if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
                  result[relement][temp[1]].isBlack = true;
                }
              } else {
                result[relement][temp[1]].callNum = map[melement].callNum;
                result[relement][temp[1]].callOrigin = map[melement].callOrigin;
                if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
                  result[relement][temp[1]].isBlack = true;
                }
              }
            } else {
              if (!result[relement][temp[1]]) {
                result[relement][temp[1]] = {};
                result[relement][temp[1]].children = {};
                result[relement][temp[1]].children[temp[2]] = {};
                result[relement][temp[1]].children[temp[2]].callNum = map[melement].callNum;
                result[relement][temp[1]].children[temp[2]].callOrigin = map[melement].callOrigin;
                if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
                  result[relement][temp[1]].children[temp[2]].isBlack = true;
                }
              } else {
                if (!result[relement][temp[1]].children) {
                  result[relement][temp[1]].children = {};
                  result[relement][temp[1]].children[temp[2]] = {};
                  result[relement][temp[1]].children[temp[2]].callNum = map[melement].callNum;
                  result[relement][temp[1]].children[temp[2]].callOrigin = map[melement].callOrigin;
                  if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
                    result[relement][temp[1]].children[temp[2]].isBlack = true;
                  }
                } else {
                  result[relement][temp[1]].children[temp[2]] = {};
                  result[relement][temp[1]].children[temp[2]].callNum = map[melement].callNum;
                  result[relement][temp[1]].children[temp[2]].callOrigin = map[melement].callOrigin;
                  if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
                    result[relement][temp[1]].children[temp[2]].isBlack = true;
                  }
                }
              }
            }
          }
        });
      }else{
        result[melement] = map[melement];
        result[melement].noDeep = true;
        if(blackApis.length>0 && blackApis.includes(melement)){   // 标记黑名单
          result[melement].isBlack = true;
        }
      }
    });
    Object.keys(result).forEach(element => {
      if (JSON.stringify(result[element]) === '{}') {
        delete result[element];
      }
    });
    return result;
}