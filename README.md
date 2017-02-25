# pomelo-node-tcp-client

Node.js TCP client library for Pomelo framework.

## Instructions

Install with ```npm install pomelo-node-tcp-client```

Usage:

```javascript
var Pomelo = require("pomelo-node-tcp-client")

pomelo.init("127.0.0.1", 3010,{}, function() {
  console.log('success');
  pomelo.request("connector.entryHandler.entry", {}, onEntry);
});

function onEntry(object){
  console.log("got it: " + object);
}

pomelo.notify("gameManager.gameHandler.startGame", {});

pomelo.on("gameManager.gameHandler.gameEvent", handleGameEvents);

function handleGameEvents(event){
  console.log("handle: " + util.inspect(event));
  switch(event.gameEvent.type){
    case "myEvent_01":
      console.log("let's do something with it");
      break;
    case "gameStart":
      console.log("game has started");
      break;
      ...
  }
}
```
