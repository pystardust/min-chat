import { io, Socket } from "socket.io-client";

let onSignalErrorFns: (()=>void)[] = [];
export async function onSignalError(fn: ()=>void) {
	onSignalErrorFns.push(fn)
}

export class SignalingChannel {

	socket: Socket;
	roomName: string;
	connected: boolean;

	constructor(socketioURL = SOCKET_URL) {
		this.socket = io(socketioURL, {path: "/socketio_webrtc/socket.io", autoConnect: false});
	}

	connect() {
		this.socket.connect();
		this.socket.on('connect', ()=> {
			this.roomName = location.hash === "" ? "default" : location.hash;

			this.socket.emit('room', this.roomName, (joinSuccess: boolean)=>{
				if (!joinSuccess) {
					onSignalErrorFns.forEach(fn=>{fn()})
					throw Error("Room full");
				}
				this.connected = true
			});
		})
	}

	close() {
		this.socket.close();
	}

	onData(fn: (data: any)=>void) {
		this.socket.on("signal", fn);
	}

	send(data: any) {
		this.socket.emit("signal", data);
	}
}
