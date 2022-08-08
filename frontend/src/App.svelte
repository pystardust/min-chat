<script lang="ts">

import { onSignalError } from "./signalling";
import { makeCall, pcHook, pcHookOnStart, onConnect} from "./webrtc";


// reload when channel changed
addEventListener('hashchange', ()=>{location.reload()})

let connected = false;

// Local Stream
let localVidStream: MediaStream;
let myVideo: HTMLVideoElement;
$: if (localVidStream && myVideo.srcObject !== localVidStream) {
	myVideo.srcObject = localVidStream
}

let remoteVidStream: MediaStream;
let theirVideo: HTMLVideoElement;
$: if (remoteVidStream && theirVideo.srcObject !== remoteVidStream) {
	theirVideo.srcObject = remoteVidStream
} 

let remoteAudStream: MediaStream;
let theirAudio: HTMLAudioElement;
$: if (remoteAudStream && theirAudio.srcObject !== remoteAudStream) {
	theirAudio.srcObject = remoteAudStream
}

let localAudStream: MediaStream;


// Chat
let chatBuffer = "";
let recvDataChannel: RTCDataChannel;
let sendDataChannel: RTCDataChannel;
let chatMessages: string[] = [];
function addMsg(msg: string) {
	chatMessages = [...chatMessages, msg]
}

// Video Stop
const audRtcsenders: RTCRtpSender[] = [];
function removeAudMediaStreams() {
	if (localAudStream) {
		localAudStream.getTracks().forEach(trk=>{
			trk.stop()
		})
	}
	pcHook(async (pc)=>{
		audRtcsenders.forEach(sender=>{
			pc.removeTrack(sender)
		})}
	)
}

// Video Stop
const vidRtcsenders: RTCRtpSender[] = [];
function removeVidMediaStreams() {

	if (localVidStream) {
		localVidStream.getTracks().forEach(trk=>{
			trk.stop()
		})
	}

	pcHook(async (pc)=>{
		vidRtcsenders.forEach(sender=>{
			pc.removeTrack(sender)
		})}
	)
}


// DATACHANNEL HOOK
pcHookOnStart(async (pc) => {
	// recv data channel
	pc.ondatachannel = ({channel}) => {
		channel.onopen = () => {
			console.log("[webrtc] data channel open (recv)")
			if(channel.label !== 'chat') return
			recvDataChannel = channel;
			recvDataChannel.onmessage = ({data}) => {
				addMsg("<them> " + data)
			}
		}
	};

	// recv stream
	pc.addEventListener('track', (trkev)=>{
		const track = trkev.track;
		console.log('Got remote track', track)
		switch (track.kind) {
			case 'audio':
				remoteAudStream = trkev.streams[0];
				break;
			case 'video':
				remoteVidStream = trkev.streams[0];
				break;
		}



		// trkev.streams[0].onremovetrack =  ()=> {
		// 	// remove video element when stopped
		// 	const div = document.getElementById("video");
		// 	div.childNodes.forEach(val=>div.removeChild(val))
		// }

		// 
		// const div = document.getElementById("video");
		// div.childNodes.forEach(val=>div.removeChild(val))
		// const vid = document.createElement("video");
		// vid.srcObject = trkev.streams[0];
		// console.log("Updating video");
		// vid.width = 500;
		// vid.controls= true;
		// vid.play();
		// div.appendChild(vid);
	});


	pc.addEventListener('iceconnectionstatechange', ()=> {
		if(pc.iceConnectionState === 'disconnected') {
			location.reload()
		}
	})

	pcHook(async (pc) => {
		// sending data channel
		const channel = pc.createDataChannel('chat');
		channel.onopen = () => {
			// Indicating that the connection has been made
			connected = true;
			console.log("[webrtc] data channel open")
			sendDataChannel = channel;
		}
	})

});

function addAudio() {
	// VIDEO HOOK
	removeAudMediaStreams()
	pcHook(async (pc) => {

		// sending stream
		try {
			localAudStream = await navigator.mediaDevices.getUserMedia({'video':false,'audio':true});
		} catch(error) {
			console.error('Error accessing media devices.', error);
			return
		}

		localAudStream.getTracks().forEach((trk)=>{
			console.log('adding track to pc:', trk);
			audRtcsenders.push(pc.addTrack(trk, localAudStream));
		});
	});
}

function addVideo() {
	// VIDEO HOOK
	removeVidMediaStreams()
	pcHook(async (pc) => {

		// sending stream
		try {
			localVidStream = await navigator.mediaDevices.getUserMedia({'video':true,'audio':false});
		} catch(error) {
			console.error('Error accessing media devices.', error);
			return
		}


		localVidStream.getTracks().forEach((trk)=>{
			console.log('adding track to pc:', trk);
			vidRtcsenders.push(pc.addTrack(trk, localVidStream));
		});
	});
}

function addScreen() {
	// VIDEO HOOK
	removeVidMediaStreams()
	pcHook(async (pc) => {

		// sending stream
		try {
			localVidStream = await navigator.mediaDevices.getDisplayMedia({video:true, audio:true})
		} catch(error) {
			console.error('Error accessing media devices.', error);
			return
		}


		localVidStream.getTracks().forEach((trk)=>{
			console.log('adding track to pc:', trk);
			vidRtcsenders.push(pc.addTrack(trk, localVidStream));
		});


	});
}

let signalError = false;
onSignalError(()=>{
	signalError = true;
})

</script>
<p>Channel: <b>{location.hash}</b></p>

{#if signalError === true}
<p style="color: red"><b>Cannot connect to room. Room maybe be full</b></p>
{/if}

{#if connected === false}
<button  on:click={()=>{makeCall()}}>Connect</button>
<p><small>Connection will be made if there is another user on this page and any of you press the connect button.</small></p>
{:else}

<button on:click={addAudio}>Share Audio</button>
<button on:click={removeAudMediaStreams}>Stop Sharing Audio</button>
<button on:click={addVideo}>Share Video</button>
<button on:click={addScreen}>Share Screen</button>
<button on:click={removeVidMediaStreams}>Stop Sharing Video</button>
<ul>
{#each chatMessages as msg}
<li>{msg}</li>
{/each}
</ul>

<form on:submit|preventDefault={()=>{
	if (chatBuffer === "")
		return;
	sendDataChannel.send(chatBuffer)
	addMsg("<you>  " + chatBuffer)
	chatBuffer = "";
}}>
<input type="text" bind:value={chatBuffer}>
</form>
<hr>

<audio width="500" bind:this={theirAudio} autoplay controls></audio>
<h4>Their Video</h4>
<video width="500" bind:this={theirVideo} autoplay controls></video>
<hr>

<h4>Your Video</h4>
<video width="200" bind:this={myVideo} autoplay controls></video>
{/if}
