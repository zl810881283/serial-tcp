let SerialPort = require("serialport")
let Rx = require("rxjs")
let net = require("net")

//let serialPortName = 'COM3' // windows
let serialPortName = '/dev/tty.usbmodem1421' // macbook pro 
let port = '8080'
let host = '0.0.0.0'
let throttleMs = 200
let flushMs = 50

var serial = new SerialPort(serialPortName, {
  baudRate: 9800
});

dirMatrix = [
  [Infinity, 0, 1, Infinity],
  [1, Infinity, Infinity, 0],
  [0, Infinity, Infinity, 1],
  [Infinity, 1, 0, Infinity]
]
let interval = Rx.Observable.interval(flushMs);

let rotateFlow = Rx.Observable.fromEvent(serial, "data")
  .map(i => i.toString("hex"))
  // 过滤非 "fe fe fe 7f" 开头的数据
  .filter(i => i.slice(0,4) == "fefefe7f")
  // 取后三个 byte
  .map(i => i.slice(4))
  .map(raw => {
    let u = parseInt(raw[1], 16) & 0x03
    let l = parseInt(raw[1], 16) >> 2
    let d = parseInt(raw[3], 16) & 0x03
    let f = parseInt(raw[3], 16) >> 2
    let r = parseInt(raw[5], 16) & 0x03
    let b = parseInt(raw[5], 16) >> 2
    let res = [f, b, r, l, u, d].join(" ")
    return res
  })
  // 窗口 group max 滤波
  .window(interval)
  .flatMap(i => {
    return i.groupBy(str => str).flatMap(type =>
      Rx.Observable.zip(type.take(1), type.count, (state, count) => ({ state, count })
      ).max(i, j => i.count - j.count).map(i => i.state)
    )
  })
  // 窗口 group max 滤波结束
  .pairwise()
  .filter(arr => arr[0] != arr[1])
  .map(arr => {
    let prev = arr[0].split(" ")
    let curr = arr[1].split(" ")
    let i = 0
    let dir = 0
    for (; i < 6; i++) {
      if (prev[i] != curr[i]) {
        dir = dirMatrix[prev[i]][curr[i]]
        break
      }
    }
    return dir ? "fbrlud"[i] : "fbrlud"[i].toLocaleUpperCase()
  })
  .throttleTime(throttleMs)

rotateFlow.subscribe(i => console.log(i))

net.createServer(socket => {
  console.log('客户端已连接')
  socket.on("error", () => console.log("客户端出错"))

  let rotateFlowSubscriber = rotateFlow.subscribe(i => {
    socket.write(i)
  })
  socket.on("close", () => {
    console.log("关闭连接")
    rotateFlowSubscriber.unsubscribe()
  })
}).listen(port, host, () => { console.log("服务器启动成功！！") })