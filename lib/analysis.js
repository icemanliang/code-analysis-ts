const path = require('path');                                                                                 // 路径处理
const tsCompiler = require('typescript');                                                                     // TS编译器
const chalk = require('chalk');                                                                               // 美化输出
const processLog = require('single-line-log');                                                                // 单行输出
const { scanFileTs, scanFileVue, getJsonContent } = require(path.join(__dirname, './file'));                  // 读写模块
const { parseVue, parseTs } = require(path.join(__dirname, './parse'));                                       // 解析模块
const { defaultScorePlugin } = require(path.join(__dirname, './score'));                                      // 评分模块
const { CODEFILETYPE } = require(path.join(__dirname, './constant'));                                         // 常量模块
const { methodPlugin } =require(path.join(__dirname, '../plugins/methodPlugin'))                              // method分析插件
const { typePlugin } =require(path.join(__dirname, '../plugins/typePlugin'))                                  // type分析插件
const { defaultPlugin } =require(path.join(__dirname, '../plugins/defaultPlugin'))                            // default分析插件
const { browserPlugin } =require(path.join(__dirname, '../plugins/browserPlugin'))                            // browser分析插件

// 代码分析基础类
class CodeAnalysis {
  constructor(options) {
    // 私有属性
    this._scanSource = options.scanSource;                                             // 扫描源配置信息       
    this._analysisTarget = options.analysisTarget;                                     // 要分析的目标依赖配置           
    this._blackList = options.blackList || [];                                         // 需要标记的黑名单API配置        
    this._browserApis = options.browserApis || [];                                     // 需要分析的BrowserApi配置         
    this._isScanVue = options.isScanVue || false;                                      // 是否扫描Vue配置    
    this._scorePlugin = options.scorePlugin || null;                                   // 代码评分插件配置
    this._analysisPlugins = options.analysisPlugins || [];                             // 代码分析插件配置
    // 公共属性
    this.pluginsQueue = [];                                                            // Targer分析插件队列
    this.browserQueue = [];                                                            // Browser分析插件队列
    this.importItemMap = {};                                                           // importItem统计Map     
    // this.apiMap = {};                                                               // 未分类API统计Map            
    // this.typeMap = {};                                                              // 类型API统计Map
    // this.methodMap = {};                                                            // 方法API统计Map               
    // this.browserMap = {};                                                           // BrowserAPI统计Map
    this.versionMap = {};                                                              // 目标依赖安装版本信息    
    this.parseErrorInfos = [];                                                         // 解析异常信息
    this.diagnosisInfos = [];                                                          // 诊断日志信息           
    this.scoreMap = {};                                                                // 评分及建议Map          
  }
  // API黑名单标记
  _blackTag(queue) {
    if(queue.length>0){
      queue.forEach((item)=>{
        Object.keys(this[item.mapName]).forEach((apiName)=>{
          if(this._blackList.length>0 && this._blackList.includes(apiName)){          // 标记黑名单
            this[item.mapName][apiName].isBlack = true;
          }
        })
      })
    }
  }
  // 注册插件
  _installPlugins(plugins) {
    if(plugins.length>0){
      plugins.forEach((item)=>{                                   // install 自定义Plugin
        this.pluginsQueue.push(item(this));
      })
    }
    this.pluginsQueue.push(methodPlugin(this));                  // install methodPlugin
    this.pluginsQueue.push(typePlugin(this));                    // install typePlugin
    this.pluginsQueue.push(defaultPlugin(this));                 // install defaultPlugin
    if(this._browserApis.length>0){
      this.browserQueue.push(browserPlugin(this));               // install browserPlugin
    }
  }
  // 链式调用检查，找出链路顶点node
  _checkPropertyAccess(node, index =0, apiName='') {
    if(index>0){
      apiName = apiName + '.' + node.name.escapedText;
    }else{
      apiName = apiName + node.escapedText;
    }
    if(tsCompiler.isPropertyAccessExpression(node.parent)){
      index++;
      return this._checkPropertyAccess(node.parent, index, apiName);
    }else{                                                                                                                         
      return {
        baseNode :node, 
        depth: index,
        apiName: apiName
      };                                                                                                
    }
  }
  // 执行Target分析插件队列中的checkFun函数
  _runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line) {
    if(this.pluginsQueue.length>0){
      for(let i=0; i<this.pluginsQueue.length; i++){
        const checkFun = this.pluginsQueue[i].checkFun;
        if(checkFun(this, tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line)){
          break;
        }
      }
    }
  }
  // 执行Target分析插件队列中的afterHook函数
  _runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName, httpRepo, baseLine) {
    if(this.pluginsQueue.length>0){
      for(let i=0; i<this.pluginsQueue.length; i++){
        const afterHook = this.pluginsQueue[i].afterHook;
        if(afterHook && typeof afterHook ==='function'){
          afterHook(this, this.pluginsQueue[i].mapName, importItems, ast, checker, filePath, projectName, httpRepo, baseLine);
        }
      }
    }
  }
  // 执行Browser分析插件队列中的检测函数
  _runBrowserPlugins(tsCompiler, baseNode, depth, apiName, filePath, projectName, httpRepo, line) {
    if(this.browserQueue.length>0){
      for(let i=0; i<this.browserQueue.length; i++){
        const checkFun = this.browserQueue[i].checkFun;
        if(checkFun(this, tsCompiler, baseNode, depth, apiName, filePath, projectName, httpRepo, line)){
          break;
        }
      }
    }
  }
  // 分析import引入
  _findImportItems(ast, filePath, baseLine = 0) {
    let importItems = {};
    let that = this;

    // 处理imports相关map
    function dealImports(temp){
      importItems[temp.name] = {};
      importItems[temp.name].origin = temp.origin;
      importItems[temp.name].symbolPos = temp.symbolPos;
      importItems[temp.name].symbolEnd = temp.symbolEnd;
      importItems[temp.name].identifierPos = temp.identifierPos;
      importItems[temp.name].identifierEnd = temp.identifierEnd;
      
      if (!that.importItemMap[temp.name]) {
        that.importItemMap[temp.name] = {};
        that.importItemMap[temp.name].callOrigin = temp.origin;
        that.importItemMap[temp.name].callFiles = [];
        that.importItemMap[temp.name].callFiles.push(filePath);
      } else {
        that.importItemMap[temp.name].callFiles.push(filePath);
      }
    }

    // 遍历AST寻找import节点
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
      
      // 分析引入情况
      if(tsCompiler.isImportDeclaration(node)){
        // 命中target
        if(node.moduleSpecifier && node.moduleSpecifier.text && node.moduleSpecifier.text == that._analysisTarget){
          // 存在导入项
          if(node.importClause){  
            // default直接引入场景
            if(node.importClause.name){
              let temp = {
                name: node.importClause.name.escapedText,
                origin: null,
                symbolPos: node.importClause.pos,
                symbolEnd: node.importClause.end,
                identifierPos: node.importClause.name.pos,
                identifierEnd: node.importClause.name.end,
                line: line
              };
              dealImports(temp);
            }
            if(node.importClause.namedBindings){
              // 拓展引入场景，包含as情况
              if (tsCompiler.isNamedImports(node.importClause.namedBindings)) {   
                if(node.importClause.namedBindings.elements && node.importClause.namedBindings.elements.length>0) {
                  // console.log(node.importClause.namedBindings.elements);
                  const tempArr = node.importClause.namedBindings.elements;
                  tempArr.forEach(element => {
                    if (tsCompiler.isImportSpecifier(element)) {
                      let temp = {
                        name: element.name.escapedText,
                        origin: element.propertyName ? element.propertyName.escapedText : null,
                        symbolPos: element.pos,
                        symbolEnd: element.end,
                        identifierPos: element.name.pos,
                        identifierEnd: element.name.end,
                        line: line
                      };
                      dealImports(temp);
                    }
                  });
                }
              }
              // * 全量导入as场景
              if (tsCompiler.isNamespaceImport(node.importClause.namedBindings) && node.importClause.namedBindings.name){
                let temp = {
                  name: node.importClause.namedBindings.name.escapedText,
                  origin: '*',
                  symbolPos: node.importClause.namedBindings.pos,
                  symbolEnd: node.importClause.namedBindings.end,
                  identifierPos: node.importClause.namedBindings.name.pos,
                  identifierEnd: node.importClause.namedBindings.name.end,
                  line: line
                };
                dealImports(temp);
              }
            }
          }
        }
      }
    }
    walk(ast);
    // console.log(importItems);
    return importItems;
  }
  // AST分析
  _dealAST(importItems, ast, checker, filePath, projectName, httpRepo, baseLine = 0) {
    const that = this;
    const importItemNames = Object.keys(importItems);
    
    // 遍历AST
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;

      // target analysis
      if(tsCompiler.isIdentifier(node) && node.escapedText && importItemNames.length>0 && importItemNames.includes(node.escapedText)) {                                     // 命中Target Api Item Name
        const matchImportItem = importItems[node.escapedText];
        // console.log(matchImportItem);
        if(node.pos !=matchImportItem.identifierPos && node.end !=matchImportItem.identifierEnd){                                               // 排除importItem Node自身
          const symbol = checker.getSymbolAtLocation(node);
          // console.log(symbol);
          if(symbol && symbol.declarations && symbol.declarations.length>0){    // 存在上下文声明
            const nodeSymbol = symbol.declarations[0];
            if(matchImportItem.symbolPos == nodeSymbol.pos && matchImportItem.symbolEnd == nodeSymbol.end){                                     // 上下文声明与import item匹配, 符合API调用
              if(node.parent){
                const { baseNode, depth, apiName } = that._checkPropertyAccess(node);                                                           // 获取基础分析节点信息
                that._runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName, httpRepo, line);         // 执行分析插件                                              // 执行分析插件
              }else{
                // Identifier节点如果没有parent属性，说明AST节点语义异常，不存在分析意义
              }
            }else{
              // 上下文非importItem API但与其同名的Identifier节点
            }
          }
        }
      }
      // browser analysis
      if(tsCompiler.isIdentifier(node) && node.escapedText && that._browserApis.length>0 && that._browserApis.includes(node.escapedText)) {                                     // 命中Browser Api Item Name
        const symbol = checker.getSymbolAtLocation(node);
        // console.log(symbol);
        if(symbol && symbol.declarations){
          if(symbol.declarations.length>1 || ( symbol.declarations.length==1 && symbol.declarations[0].pos >ast.end)){                            // 在AST中找不到上下文声明，证明是Bom,Dom对象
            const { baseNode, depth, apiName } = that._checkPropertyAccess(node);
            if(!(depth>0 && node.parent.name && node.parent.name.pos ==node.pos && node.parent.name.end ==node.end)){                             // 排除作为属性的场景
              that._runBrowserPlugins(tsCompiler, baseNode, depth, apiName, filePath, projectName, httpRepo, line);
            }
          }
        }
      }
    }

    walk(ast);
    // 执行afterhook
    this._runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName, httpRepo, baseLine);
  }
  // 扫描文件
  _scanFiles(scanSource, type) {
    let entrys = [];
    scanSource.forEach((item)=>{
      const entryObj = {
        name: item.name,
        httpRepo: item.httpRepo
      }
      let parse = [];
      let show = [];
      const scanPath = item.path;
      scanPath.forEach((sitem)=>{
        let tempEntry = [];
        if(type === CODEFILETYPE.VUE){
          tempEntry = scanFileVue(sitem);
        }else if(type === CODEFILETYPE.TS){
          tempEntry = scanFileTs(sitem);
        }
        let tempPath = tempEntry.map((titem)=>{
          if(item.format && typeof(item.format) ==='function'){
            return item.format(titem.substring(titem.indexOf(sitem)));
          }else{
            return titem.substring(titem.indexOf(sitem));
          }
        })
        parse = parse.concat(tempEntry);
        show = show.concat(tempPath);
      })
      entryObj.parse = parse;
      entryObj.show = show;
      entrys.push(entryObj);
    })
    // console.log(entrys);
    return entrys;
  }
  // 扫描文件，分析代码
  _scanCode(scanSource, type) {
    let entrys = this._scanFiles(scanSource, type);
    // console.log(entrys);
    entrys.forEach((item)=>{
      const parseFiles = item.parse;
      if(parseFiles.length>0){
        parseFiles.forEach((element, eIndex) => {
          const showPath = item.name + '&' + item.show[eIndex];
          try {
            if(type === CODEFILETYPE.VUE){
              const { ast, checker, baseLine } = parseVue(element);                                               // 解析vue文件中的ts script片段,将其转化为AST
              const importItems = this._findImportItems(ast, showPath, baseLine);                                 // 从import语句中获取导入的需要分析的目标API
              // console.log(importItems);
              if(Object.keys(importItems).length>0 || this._browserApis.length>0){
                this._dealAST(importItems, ast, checker, showPath, item.name, item.httpRepo, baseLine);           // 递归分析AST，统计相关信息
              }
            }else if(type === CODEFILETYPE.TS){
              const { ast, checker } = parseTs(element);                                                          // 解析ts文件代码,将其转化为AST
              const importItems = this._findImportItems(ast, showPath);                                           // 从import语句中获取导入的需要分析的目标API
              // console.log(importItems);
              if(Object.keys(importItems).length>0 || this._browserApis.length>0){
                this._dealAST(importItems, ast, checker, showPath, item.name, item.httpRepo);                     // 递归分析AST，统计相关信息
              }
            }
          } catch (e) {
            const info = {
              projectName: item.name,
              httpRepo: item.httpRepo + item.show[eIndex],
              file: item.show[eIndex],
              stack: e.stack
            }
            this.parseErrorInfos.push(info);
            this.addDiagnosisInfo(info);
          }
          processLog.stdout(chalk.green(`\n${item.name} ${type}分析进度: ${eIndex+1}/${parseFiles.length}`));
        });
      }
    })
  }
  // 目标依赖安装版本收集
  _targetVersionCollect(scanSource, analysisTarget) {
    scanSource.forEach((item)=>{
      if(item.packageFile && item.packageFile !=''){
        try{
          const lockInfo = getJsonContent(item.packageFile);
          // console.log(lockInfo);
          const temp = Object.keys(lockInfo.dependencies);
          if (temp.length > 0) {
            temp.forEach(element => {
              if (element == analysisTarget) {
                const version = lockInfo.dependencies[element];
                if (!this.versionMap[version]) {
                  this.versionMap[version] = {};
                  this.versionMap[version].callNum = 1;
                  this.versionMap[version].callSource = [];
                  this.versionMap[version].callSource.push(item.name);
                } else {
                  this.versionMap[version].callNum++;
                  this.versionMap[version].callSource.push(item.name);
                }    
              }
            });
          }
        }catch(e){
          // console.log(e);
        }
      }
    })
  }
  // 记录诊断日志
  addDiagnosisInfo(info) {
    this.diagnosisInfos.push(info);
  }
  // 入口函数
  analysis() {
    // 注册插件
    this._installPlugins(this._analysisPlugins);
    // 扫描分析Vue
    if(this._isScanVue){
      this._scanCode(this._scanSource, CODEFILETYPE.VUE);
    }
    // 扫描分析TS
    this._scanCode(this._scanSource, CODEFILETYPE.TS);
    // 黑名单标记
    this._blackTag(this.pluginsQueue);
    this._blackTag(this.browserQueue);
    // 目标依赖安装版本收集
    this._targetVersionCollect(this._scanSource, this._analysisTarget);
    // 代码评分
    if(this._scorePlugin){
      if(typeof(this._scorePlugin) ==='function'){
        this.scoreMap = this._scorePlugin(this);
      }
      if(this._scorePlugin ==='default'){
        this.scoreMap = defaultScorePlugin(this);
      }
    }else{
      this.scoreMap = null;
    }
    // console.log(this.apiMap);
    // console.log(this.methodMap);
    // console.log(this.typeMap);
    // console.log(this.browserMap);
    // console.log(this.versionMap);
    // console.log(this.parseErrorInfos);
    // console.log(this.diagnosisInfos);
    // console.log(this.scoreMap);
  }
}

module.exports = CodeAnalysis;
