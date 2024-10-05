{
	var inputs = [];
	var inputDev = null;
	var outputs = [];
	var outputDev = null;
	const dLen = 12;

	const DenonMsg = {time:0xB0, mins: 0x42, secs: 0x43, mills: 0x44, percent: 0x48, EOM: 0x21 };
	const AlphaMsg = {time:0x94, mins: 0x14, secs: 0x15, mills: 0x16, percent: 0x48, EOM: 0x3a };

	const DenonLED = {eject: 0x02, playlist: 0x04, jogm_g: 0x05, jogm_o: 0x06, 
		pitch_g: 0x07, pitch_o: 0x08, tap_g: 0x09, tap_o: 0x0A, efx1_r: 0x0B, 
		efx1_g: 0x0C, efx2_r: 0x0D, efx2_g: 0x0E, efx3_r: 0x0F, efx3_g: 0x10, 
		hot1: 0x11, hot1_d: 0x12, hot2: 0x13, hot2_d: 0x14, hot3: 0x15, hot3_d: 0x16, 
		hot4: 0x17, hot4_d: 0x18, hot5: 0x19, hot5_d: 0x1A, param: 0x1E, a1: 0x24, 
		a1_d: 0x3C, a2: 0x25, a2_d: 0x3D, cue: 0x26, play: 0x27, jogw: 0x3B, 
	};

	const DenonVFD = {tdot: 0x01, remain: 0x02, elapsed: 0x03, /* TIME MODE */
		cont: 0x04, single: 0x05, /* PLAY MODE */
		bpm: 0x06, minute: 0x07, second: 0x08, frame: 0x09, /* BPM, TIME */
		pdotr: 0x0A, pdotc: 0x0B, pdotl: 0x0C, /* PITCH DOT POSITION */
		mp3: 0x10, wav: 0x11, kb: 0x13, keyadj: 0x14, memo: 0x15, /* FILE INFO */
		a1_lb: 0x16, a2_lb: 0x17, a1_rb: 0x18, a2_rb: 0x19, a1: 0x1A, a2: 0x1B, b_a1: 0x1C, b_a2: 0x1D,	/* LOOP */
		sring_out: 0x1E, sring_in: 0x1F, stouch: 0x20, /* SCRATCH RING (out side / in side / touch dot) */
		pos_blink: 0x21
	};

	var midiMSG = AlphaMsg;

	/* VFD Segment Display */
	const DenonSegment = {
		1: {	/* first line */
			msb: [0x01,0x02,0x03,0x04,0x05,0x07,0x08,0x09,0x0A,0x0B,0x0C,0x0D],	/* Segment 1-1 to 1-12 MSB */
			lsb: [0x21,0x22,0x23,0x24,0x25,0x27,0x28,0x29,0x2A,0x2B,0x2C,0x2D]	/* Segment 1-1 to 1-12 LSB */
		},
		2: {	/* second line */
			msb: [0x0E,0x0F,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19],	/* Segment 2-1 to 2-12 MSB */
			lsb: [0x2E,0x2F,0x30,0x31,0x32,0x33,0x34,0x35,0x36,0x37,0x38,0x39]	/* Segment 2-1 to 2-12 LSB */
		}
	}


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

	//	Set VFD status
	function DenonSetVFD(deck, vfd, status) {
		let vfdStatus;
		switch (status) {
			case true:
			case 1:	vfdStatus = 0x4D; break;	// ON
			case 2:	vfdStatus = 0x4F; break;	// BLINK
			case false:
			case 0:
			default:	vfdStatus = 0x4E; break;	// OFF
	}
	MIDIsendShortMsg([0xB0+deck-1,vfdStatus,DenonVFD[vfd]]);
}
	//	Set LED status
	function DenonSetLED(deck, led, status) {
		let ledStatus;
		switch (status) {
			case true:
			case 1:	ledStatus = 0x4A; break;	// ON
			case 2:	ledStatus = 0x4C; break;	// BLINK
			case false:
			case 0:
			default:	ledStatus = 0x4B; break;	// OFF
		}
		MIDIsendShortMsg([0xB0+deck-1,ledStatus,DenonLED[led]]);
	}

	// set first available device as default
	function MIDIsetDefault(){
		inputDev = null;
		outputDev = null;
		if(inputs.length > 0){
			inputDev = inputs[0];
			if(inputDev.manufacturer.indexOf("Denon")){
				inputDev.onmidimessage = MIDIhandleDenonInputMsg;
				midiMSG = DenonMsg;
				setTimeout(() => {
					control.forEach(ctrl => {
						DenonSetLED(ctrl.id+1, 'param', 1);	/* parameter knob */
						DenonSetVFD(ctrl.id+1, 'minute', 1);
						DenonSetVFD(ctrl.id+1, 'second', 1);
						DenonSetVFD(ctrl.id+1, 'remain', 1);
					});
				}, 999);  
			} else {
				inputDev.onmidimessage = MIDIhandleAlphaInputMsg;
				midiMSG = AlphaMsg;
			}
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
		if(outputDev){
			try{
				outputDev.send(message);
			} catch(error){
				console.error(error);
				console.log(message);
			}
		}
	}

	function MIDIhandleDenonInputMsg( event ) {

		let deck = event.data[0] - 0x90;
		//handle Cue & Play buttons
		if(event.data[2] == 0x40){
			if(event.data[1] == 0x42){
				control[deck].movePosition(0);
				return;
			}
			if(event.data[1] == 0x43){
				control[deck].togglePlay();
				return;
			}
		}
		//select button
		if(event.data[2] == 0x0){
			if(event.data[1] == 0x28 && fileList.selectedIndex >=0){
				UIloadSelectedEntry();
				return;
			}
		}

		//handle Fader & Encoder
		if(event.data[1] == 0x54){
			if(event.data[2] == 0x7f){ // go up
				fileList.selectedIndex --;
				UIlistChanged();
			}
			// go down
			if(event.data[2] == 0x00 && fileList.selectedIndex+1 != fileList.options.length){
				fileList.selectedIndex ++;
				UIlistChanged();
			}
		}
			if(event.data[0] == 0xE0 && event.data[1] == 0x54){
				if(event.data[2] == 0x7f){ //Decrement
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

	// handle received messaged
	function MIDIhandleAlphaInputMsg( event ) {
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

	function DenonDisplay(deckNr, artist, title){
		let part = title.split("-").map(s => s.trim());
		if(!artist){
			artist = "";
			if(part.length > 1){
				title = part[0];
				artist = part[1];
			}
			if(artist == ""){
				artist = title.substr(0,dLen);
				title = title.substr(dLen).trim();
			}
		} else if(part.length > 1){ //avoid duplicates
			if(part[0].includes(artist)){
				title = part[1];
			}
			else if(part[1].includes(artist)){
				title = part[0];
			}
		}
		if(artist.length > dLen){
			artist = artist.compress();	
		} 
		if(title.length > dLen) {
			title = title.compress();
		}
		DenonDisplayLine(deckNr, 1,artist);
		DenonDisplayLine(deckNr, 2,title);
	}

	//	display one line of text
	function DenonDisplayLine(deckNr, line, text) {
		if (line<1 || line >2) return;	//	displays have two lines
		if (text.length > dLen) text = text.substr(0,dLen);	//	and 12 chars each
		var charArray = text.toInt();	//	convert string to integer array
		var i, msb, lsb;
		for (i=0;i<12;i++) {	//	each segment of this line
			if (i < charArray.length) {
				msb	= (charArray[i] >> 4) & 0x0F;
				lsb	= charArray[i] & 0x0F;
			} else {	//	0x20 = " " (space char / empty segment)
				msb = 0x02;
				lsb = 0x00;
			}
			MIDIsendShortMsg([0xB0+deckNr-1, DenonSegment[line]["msb"][i], msb]);
			MIDIsendShortMsg([0xB0+deckNr-1, DenonSegment[line]["lsb"][i], lsb]);
		}
	}

//	clear display of specified deck
function DenonDisplayClear(deckNr) {
	for (i=0;i<12;i++) {	//	each col
		MIDIsendShortMsg(0xB0+deckNr-1, DenonSegment[1]["msb"][i], 0x02);	//	first line msb
		MIDIsendShortMsg(0xB0+deckNr-1, DenonSegment[1]["lsb"][i], 0x00);	//	first line lsb
		MIDIsendShortMsg(0xB0+deckNr-1, DenonSegment[2]["msb"][i], 0x02);	//	second line msb
		MIDIsendShortMsg(0xB0+deckNr-1, DenonSegment[2]["lsb"][i], 0x00);	//	second line lsb
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

