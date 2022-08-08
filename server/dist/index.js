"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const httpServer = (0, http_1.createServer)();
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*'
    }
});
io.on("connection", (socket) => {
    let room = "default";
    console.log(`IN  ${socket.id}`);
    socket.on("disconnect", () => {
        console.log(`OUT ${socket.id}`);
    });
    socket.on("signal", (data) => {
        console.log(`SIGNALLING FROM ${socket.id}`);
        io.in(room).except(socket.id).emit("signal", data);
    });
    socket.on("room", (roomName, callBack) => __awaiter(void 0, void 0, void 0, function* () {
        room = roomName;
        const sockslist = yield io.in(room).allSockets();
        if (sockslist.size >= 2) {
            callBack(false);
        }
        socket.join(room);
        callBack(true);
    }));
});
console.log("starting Socketio server");
io.listen(3000);
