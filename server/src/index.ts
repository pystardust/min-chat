import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

io.on("connection", (socket) => {
	let room = "default";
	console.log(`IN  ${socket.id}`);

	socket.on("disconnect", ()=>{
		console.log(`OUT ${socket.id}`);
	});

	socket.on("signal", (data)=>{
		console.log(`SIGNALLING FROM ${socket.id}`)
		io.in(room).except(socket.id).emit("signal", data);
	});

	socket.on("room", async (roomName, callBack)=> {
		room = roomName;
		const sockslist = await io.in(room).allSockets()
		if(sockslist.size >= 2) {
			callBack(false)
		}
		socket.join(room);
		callBack(true)
	});
});

console.log("starting Socketio server")
io.listen(3000);
