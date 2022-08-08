import {SignalingChannel} from "./signalling"


let onConnectFns: ((pc: RTCPeerConnection)=>void)[] = [];
export async function onConnect(fn: (pc:RTCPeerConnection)=>void) {
	onConnectFns.push(fn)
}

type PeerHookFn = (pc:RTCPeerConnection)=>Promise<void>;
let pcHookOnStartFns: PeerHookFn[] = [];

export async function pcHookOnStart(fn: PeerHookFn) {
	pcHookOnStartFns.push(fn)
}

export async function pcHook(fn: PeerHookFn) {
	await fn(await getRTCPeer())
}

const signalingChannel = new SignalingChannel();
signalingChannel.connect();


let _myPeer: RTCPeerConnection

async function getRTCPeer() {
	console.log("cached peer", _myPeer)
	if (_myPeer !== undefined) {
		console.log("using existing peer")
		return _myPeer
	}

	console.warn("creating peer")
	const pc = new RTCPeerConnection({
	  iceServers: [
		{
		  urls: "stun:openrelay.metered.ca:80",
		},
		{
		  urls: "turn:openrelay.metered.ca:443",
		  username: "openrelayproject",
		  credential: "openrelayproject",
		},
	  ],
	});
	_myPeer = pc;

	// initator
    signalingChannel.onData(async message => {
        if (message.answer) {
			console.log("[webrtc] recv answer")
			onConnectFns.forEach(fn=>{fn(pc)})
            const remoteDesc = new RTCSessionDescription(message.answer);
            await pc.setRemoteDescription(remoteDesc);
        }
    });

	for (const fn of pcHookOnStartFns) {
		await fn(pc)
	}

	peerICEHook(pc);
	return pc
}



export async function makeCall() {
	if (signalingChannel.connected === false) {
		throw Error("Not connected to room. Reasons: room full or invalid")
	}

	const peerConnection = await getRTCPeer();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingChannel.send({'offer': offer});
	console.log("[webrtc] sending offer")
}


// Receiver
signalingChannel.onData(async message => {
    if (message.offer) {
		const peerConnection = await getRTCPeer();
		console.log("[webrtc] refv offer")
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
		onConnectFns.forEach(fn=>{fn(peerConnection)})
        signalingChannel.send({'answer': answer});
    }
});

function peerICEHook(pc: RTCPeerConnection) {
	// Listen for local ICE candidates on the local RTCPeerConnection
	pc.addEventListener('icecandidate', event => {
		if (event.candidate && event.candidate.candidate.length > 0) {
			signalingChannel.send({iceCandidate: event.candidate});
		}
	});

	// Listen for remote ICE candidates and add them to the local RTCPeerConnection
	signalingChannel.onData(async message => {
		if (message.iceCandidate) {
			try {
				console.log(`[webrtc] ICE recv candidate`)
				await pc.addIceCandidate(message.iceCandidate);
			} catch (e) {
				console.error('Error adding received ice candidate', e);
			}
		}
	});

	// DEBUG
	pc.addEventListener('icegatheringstatechange', ()=>{
		console.log(`[webrtc] ICE gathering state ${pc.iceGatheringState}`)
	});
	pc.addEventListener('iceconnectionstatechange', ()=>{
		console.log(`[webrtc] ICE conn state ${pc.iceConnectionState}`)
	});

	// Listen for connectionstatechange on the local RTCPeerConnection
	pc.addEventListener('connectionstatechange', ()=>{
		console.log(`[webrtc] Connection state ${pc.connectionState}`)
	});

	pc.addEventListener('negotiationneeded', ()=>{
		makeCall();
	});


}
