const cluster = require("cluster");
const os = require("os")

// 设置子进程执行程序
cluster.setupMaster({
  exec: "./worker.js",
  slient: true
});

// 创建多进程执行任务
function run(tasks, context) {
  // 记录开始时间
  const startTime = Date.now();
  // 总数
  const totalCount = tasks.length;
  // cpu 核数
  const numCPUs = os.cpus().length;
  console.log('cpu num : ' + numCPUs)

  const workerNum = totalCount > numCPUs ? numCPUs : totalCount;
  // 当前已处理任务数
  let completedCount = 0;

  if (cluster.isMaster) {
    cluster.on("fork", function(worker) {
      console.log(`[master] : fork worker ${worker.id}`);
    });
    cluster.on("exit", function(worker, code, signal) {
      console.log(`[master] : worker ${worker.id} died`);
    });

    for (let i = 0; i < workerNum; i++) {
      const worker = cluster.fork();
      console.log('===333====')

      // 接收子进程数据
      worker.on("message", function(msg, taskName) {
        // 完成一个，记录并打印进度
        completedCount++;
        console.log(`process: ${completedCount}/${totalCount}`);

        const doneTask = tasks.find((item)=>{
            return item.name === taskName;
        })

        doneTask.result = msg;
        doneTask.status = 'done';

        if (completedCount >= totalCount) {
            cluster.disconnect();
            console.log(tasks);
            console.info(`任务完成，用时: ${Date.now() - startTime}ms`);
        }

        const task = tasks.find((item)=>{
            return item.status === 'todo'
        })

        if(task){
            nextTask(worker, task, context);
        }
      });
      tasks[i].ststus = 'doing';
      nextTask(worker, tasks[i], context);
    }
  } else {
    process.on("message", function(msg) {
      console.log('master process : ' + msg);
    });
  }
}

function nextTask(worker, task, context) {
    worker.send(task, context);
}

function analysis() {
    const context = {
        initval : '222',
        age: 4
    }
    const tasks = [
        {name:'taks1', result:'', status: 'todo'},
        {name:'taks2', result:'', status: 'todo'},
        {name:'taks3', result:'', status: 'todo'},
        {name:'taks4', result:'', status: 'todo'},
        {name:'taks5', result:'', status: 'todo'},
        {name:'taks6', result:'', status: 'todo'},
        {name:'taks7', result:'', status: 'todo'},
        {name:'taks8', result:'', status: 'todo'},
        {name:'taks9', result:'', status: 'todo'},
        {name:'taks10', result:'', status: 'todo'},
        {name:'taks11', result:'', status: 'todo'},
        {name:'taks12', result:'', status: 'todo'},
        {name:'taks13', result:'', status: 'todo'},
        {name:'taks14', result:'', status: 'todo'},
        {name:'taks15', result:'', status: 'todo'},
        {name:'taks16', result:'', status: 'todo'},
        {name:'taks17', result:'', status: 'todo'},
        {name:'taks18', result:'', status: 'todo'},
        {name:'taks19', result:'', status: 'todo'},
        {name:'taks20', result:'', status: 'todo'},
        {name:'taks21', result:'', status: 'todo'},
    ]
    run(tasks, context);
}

analysis()
