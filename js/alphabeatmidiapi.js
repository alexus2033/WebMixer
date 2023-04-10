{
	var inputs = [];
	var inputDev = null;
	var outputs = [];
	var outputDev = null;

	function initMIDI()
	{
		if (!log)
		log = document.getElementById("log");

		if (typeof navigator.requestMIDIAccess !== "function") {
			printInfo("MIDI not available");
			return; 
		}	

		navigator.permissions.query({ name: "midi", sysex: true }).then((result) => {
			if (result.state === "granted") {
				printInfo("Access granted.");
			} else if (result.state === "prompt") {
				printInfo("Please confirm permission request");
			} else {
				printInfo(result.state);
			}
		});
		
		navigator.requestMIDIAccess( { sysex: true } ).then( access, failure );
	}

	function access(midiAccess)
	{
		clearInfo();
		assignInputsAndOutputs(midiAccess);
		setDefault();

		midiAccess.onstatechange = (event) => {
			console.log("onstatechange");
			assignInputsAndOutputs(midiAccess);
			setDefault();
		};
		if(inputs.length + outputs.length == 0){
			printInfo("No MDI-Devices found");
		}
	}

	// set first available device as default
	function setDefault(){
		inputDev = null;
		outputDev = null;
		if(inputs.length > 0){
			inputDev = inputs[0];
			inputDev.onmidimessage = handleInputMessage;
			printInfo(`${inputDev.state} ${inputDev.type}: ${inputDev.name}`);
		}
		if(outputs.length > 0){
			outputDev = outputs[0];
			printInfo(`${outputDev.state} ${outputDev.type}: ${outputDev.name}`);
		}
	}

	function printInfo(value){
		if(log!=null){
			value += "\n";
			log.innerText += value;
		} else {
			console.log(value);
		}
	}

	function clearInfo(){
		if(log!=null){
			log.innerText = "";
		}
	}

	function failure(msg)
	{
		printInfo(`Failed to get MIDI access - ${msg}`);
	}

	function assignInputsAndOutputs(midiAccess) {
		if (typeof midiAccess.inputs === "function") {
			inputs=midiAccess.inputs();
			outputs=midiAccess.outputs();
		} else {
			var inputIterator = midiAccess.inputs.values();
			inputs = [];
			for (var o = inputIterator.next(); !o.done; o = inputIterator.next()) {
				inputs.push(o.value)
			}
	
			var outputIterator = midiAccess.outputs.values();
			outputs = [];
			for (var o = outputIterator.next(); !o.done; o = outputIterator.next()) {
				outputs.push(o.value)
			}
		}
	}
	
	function sendShortMsg(midiMessage) {
		//omitting the timestamp means send immediately.
		if(outputDev){
			outputDev.send(midiMessage); 
		}
	}

	function handleInputMessage( event ) {
		var str=null;
		if( event.data.length < 3)
			return;

		//handle Buttons
		if(event.data[0] == 0x80 && event.data[2] == 0x40){
			if(event.data[1] == 0x32){
				pausePlay(0);
			}
			if(event.data[1] == 0x33){
				pausePlay(1);
			}
			if(event.data[1] == 0x37){
				player[0].currentTime = 0;
			}
			if(event.data[1] == 0x38){
				player[1].currentTime = 0;
			}
			return;
		}
		//handle Fader
		if(event.data[0] == 0xb0){
			if(event.data[1] == 0x1f){
				player[0].volume = event.data[2]/128;
			}
			if(event.data[1] == 0x29){
				player[1].volume = event.data[2]/128;
			}
			return;
		}

		str ="data.length=" +event.data.length+ ":"+ " 0x" + event.data[0].toString(16) + ":";
		if(log!=null) log.innerText += str;

		for(var i=1,k=0; i<event.data.length; i++, k++){
			str =" 0x" + event.data[i].toString(16) + ":";
			if(log!=null) log.innerText += str;
			if(i%8==0){
				if(log!=null) log.innerText +="\n";
			}
		}
		str ="\n"; 
		if(log!=null) log.innerText += str;
	}
}

