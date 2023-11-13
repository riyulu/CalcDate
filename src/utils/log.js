if (!import.meta.env.PROD) {
  // 重写 console.log 方法
  const log = console.log;
  console.log = (...args) => {
    // 在输出文本前添加前缀
    // 调用原始 console.log 方法输出文本
    return log.apply(console, ['CalcDate: ', ...args]);
  };
}