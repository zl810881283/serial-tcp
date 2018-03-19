let SerialPort = require("serialport")
let Rx = require("rxjs")

var port = new SerialPort('/dev/tty.usbmodem1421', {
  baudRate: 9800
});

dirMatrix=[
  [Infinity,0,1,Infinity],
  [1,Infinity,Infinity,0],
  [0,Infinity,Infinity,1],
  [Infinity,1,0,Infinity]
]
Rx.Observable.fromEvent(port,"data")
  .map(i=>{
    let raw = i.toString("hex",4)
    return raw
  })
  .map(raw=>{
    let d = parseInt(raw[1],16) & 0x03
    let b = parseInt(raw[1],16) >> 2
    let u = parseInt(raw[3],16) & 0x03
    let r = parseInt(raw[3],16) >> 2
    let f = parseInt(raw[5],16) & 0x03
    let l = parseInt(raw[5],16) >> 2
    let res = [f,b,r,l,u,d].join(" ")
    return res
  })
  .pairwise()
  .filter( arr => arr[0] != arr[1])
  .map(arr=>{
    let prev = arr[0].split(" ")
    let curr = arr[1].split(" ")
    let i = 0
    let dir = 0
    for(;i<6;i++){
      if(prev[i]!=curr[i]){
        dir=dirMatrix[prev[i]][curr[i]]
        break
      }
    }
    return dir ? "fbrlud"[i] : "fbrlud"[i].toLocaleUpperCase()
  })
  .subscribe(i=>{
    console.log(i)
  })