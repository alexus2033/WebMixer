{
	var inputs = [];
	var inputDev = null;
	var outputs = [];
	var outputDev = null;

	function MIDIinit()
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
		
		navigator.requestMIDIAccess().then( MIDIaccessRequest, failure );
	}

	function MIDIaccessRequest(midiAccess)
	{
		clearInfo();
		MIDIassignIO(midiAccess);
		MIDIsetDefault();

		midiAccess.onstatechange = (event) => {
			MIDIassignIO(midiAccess);
			MIDIsetDefault();
		};
		if(inputs.length + outputs.length == 0){
			printInfo("No MIDI-Devices found");
		}
	}

	// set first available device as default
	function MIDIsetDefault(){
		inputDev = null;
		outputDev = null;
		if(inputs.length > 0){
			inputDev = inputs[0];
			inputDev.onmidimessage = MIDIhandleInputMessage;
			printInfo(`${inputDev.state} ${inputDev.type}: ${inputDev.name}`);
		}
		if(outputs.length > 0){
			outputDev = outputs[0];
			printInfo(`${outputDev.state} ${outputDev.type}: ${outputDev.name}`);
		}
	}

	function failure(msg)
	{
		printInfo(`Failed to get MIDI access - ${msg}`);
	}

	function MIDIassignIO(midiAccess) {
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
	
	function MIDIsendShortMsg(message) {
		//omitting the timestamp means send immediately.
		if(outputDev){
			outputDev.send(message); 
		}
	}

	// handle received messaged
	function MIDIhandleInputMessage( event ) {
		if( event.data.length < 3)
			return;

		//handle Cue & Play buttons
		if(event.data[0] == 0x80 && event.data[2] == 0x40){
			if(event.data[1] == 0x32){
				control[0].togglePlay();
			}
			if(event.data[1] == 0x33){
				control[1].togglePlay();
			}
			if(event.data[1] == 0x37){
				control[0].movePosition(0);
			}
			if(event.data[1] == 0x38){
				control[1].movePosition(0);
			}
			return;
		}
		//select button
		if(event.data[0] == 0x90 && event.data[2] == 0x40){
			if(event.data[1] == 0x3a && fileList.selectedIndex >=0){
				UIloadSelectedEntry();
			}
			return;
		}

		//handle Fader & Encoder
		if(event.data[0] == 0xb0){
			if(event.data[1] == 0x1f){
				let newLevel = event.data[2]/128;
				control[0].setVolume(newLevel);
				updateSlider(0,newLevel*100);
			}
			if(event.data[1] == 0x29){
				let newLevel = event.data[2]/128;
				control[1].setVolume(newLevel);
				updateSlider(1,newLevel*100);
			}
			if(event.data[1] == 0x20 || event.data[1] == 0x2a){
				if(event.data[2] == 0x3f){ // go up
					fileList.selectedIndex --;
					UIlistChanged();
				}
				// go down
				if(event.data[2] == 0x41 && fileList.selectedIndex+1 != fileList.options.length){
					fileList.selectedIndex ++;
					UIlistChanged();
				}
			}
			if(event.data[1] == 0x21 || event.data[1] == 0x2b){
				if(event.data[2] == 0x3f){ //Decrement
					changeSpeed((event.data[1] == 0x21 ? 0 : 1),true);
				}
				if(event.data[2] == 0x41){ //Increment
					changeSpeed((event.data[1] == 0x21 ? 0 : 1),false);
				}
			}
			if(event.data[1] == 0x22 || event.data[1] == 0x2c){
				if(event.data[2] == 0x3f){ //Decrement
					changeFrequency((event.data[1] == 0x21 ? 0 : 1),true);
				}
				if(event.data[2] == 0x41){ //Increment
					changeFrequency((event.data[1] == 0x21 ? 0 : 1),false);
				}
			}
		}
	}

	function logMessage( event ){
		var str ="data.length=" +event.data.length+ ":"+ " 0x" + event.data[0].toString(16) + ":";
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

