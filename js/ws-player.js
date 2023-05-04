// Wavesurfer player script V0.8
{
    const msgEOM = 0x3a;
    const playLED = 0x01;
    var control = [];

    var pHead = WaveSurfer.playhead.create({
        returnOnPause: false,
        moveOnSeek: true,
        draw: true
    });
    var pOps = {
        scrollParent: true,
        waveColor: '#3B8686',
        progressColor: '#A8DBA8', 
        backend: 'MediaElement',
        cursorColor : 'red',
        plugins: [ pHead ]
    };

    function initPlayers(){
        deck.toArray().forEach(function (item, id) {
            //control[id] = new Wrapper(id);
            pOps.container = item;
            player[id] = WaveSurfer.create(pOps);
            player[id].on('loading', function(e) {
                pos[id].innerText = `loading ${e-1}%`;
             });
            player[id].on('waveform-ready', function(e) { displayTime(id) });
            player[id].on('audioprocess', function(e) { displayTime(id) });
            player[id].on('ready', function(e) { player[id].playhead.setPlayheadTime(0); });
        });
    }

    // load file into next available player
    function loadLocalFile(file,autoplay = false){
        var id = 0,
            info = file.name;
        if(control[0].playing){
          id = 1;
        }
        control[id].loadFile(file);
        if(autoplay){
            control[id].play();
        }
        if(window.jsmediatags){
            window.jsmediatags.read(file, {
            onSuccess: function(result) {
                if(result.tags.artist && result.tags.title){
                    info=result.tags.artist + " - " + result.tags.title;
                }
                if(result.tags.genre){
                    info+="<br>"+result.tags.genre;
                }
                playerInfo[id].innerHTML = info;
            }
            });
        }
        playerInfo[id].innerHTML = info;
    }

    // slow down or speed up playback
    function changeSpeed(id,speedDown){
        const step = 0.01;
        var currentRate = player[id].playbackRate; 
        if(speedDown){ //Decrement
            currentRate = currentRate - step;
        } else { //Increment
            currentRate = currentRate + step;
        }
        if(currentRate >= 0.5 && currentRate <= 2){
            player[id].playbackRate = currentRate;
        } else {
            console.log("invalid speed");
        }
        pos[id].innerHTML = `Speed: x ${currentRate.pad(2)}`;
    }

    function displayTime(id){
        var remain = player[id].getDuration() - player[id].getCurrentTime();
        var mins = parseInt((remain/60)%60),
            secs = parseInt(remain%60),
            millis = remain.toFixed(2).slice(-2,-1);
        pos[id].innerText = `-${mins}:${secs.pad(2)}.${millis}`;
        if(remain < 21 && remain > 0){
           player[id].setWaveColor('red');
           blinker = true;
        } else if (blinker){
           player[id].setWaveColor('#3B8686');
           blinker = false;
        }
     }

    // cleanup
    function killPlayer()
	{
		if(player){
            player.toArray().forEach(function (item, id) {
                item.stop();
                sendShortMsg([0x90,msgEOM+id,0x01]);
                sendShortMsg([0x94+id, 0x16, 0x00]);
                sendShortMsg([0x94+id, 0x15, 0x00]);
                sendShortMsg([0x94+id, 0x14, 0x00]);
            });
		}
	}

    (async () => {  //permission for "speaker-selection" not supported yet
         const query = await navigator.permissions.query( { name: "microphone" } );
         switch( query.state ) {
            case "prompt":
               await queryUserMedia();
               await listOutputDevices();
               clearInfo();
               break;
            case "granted":
               await listOutputDevices();
         }

         function queryUserMedia() {
            printInfo("prompt for permission to select audio-devices...");
            return navigator.mediaDevices.getUserMedia( { audio: true } );
         }

         navigator.mediaDevices.ondevicechange = function(event) {
            listOutputDevices();
         }

         async function listOutputDevices() {
            $(".selectOut").empty();
            navigator.mediaDevices.enumerateDevices()
            .then(function(devices) {
                devices.filter(({ kind }) => kind === "audiooutput").forEach(function(dev, index) {
                    const name = dev.label || ('audio out ' + (index+1)); 
                    out1.append(new Option(name, dev.deviceId));
                    out2.append(new Option(name, dev.deviceId));
                    if(index > 0){
                        $(".selectOut").show();
                    }
                });
                out1.onchange = e => player[0].setSinkId(out1.value);
                out2.onchange = e => player[1].setSinkId(out2.value);
                printInfo(out1.length + " Devices detected");               
                })
            .catch(function(err) {
                console.log(err.name + ": " + err.message);
            });            
         }

      })().catch( console.error );
}