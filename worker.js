function fibonacci(n) {
    if (n == 0 || n == 1) {
      return n;
    } else {
      return fibonacci(n - 1) + fibonacci(n - 2);
    }
  }
  
// 接收主线程发送过来的任务，并开始查找斐波那契数
process.on("message", (task, context) => {
    const n = ParseInt(Math.random()*5 + context.age);
    var res = fibonacci(n);
    // 查找结束后通知主线程，以便主线程再度进行任务分配
    process.send(res, task.name);
});