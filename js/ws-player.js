// Wavesurfer player script V0.8
{
    var control = [];

    const pHead = WaveSurfer.playhead.create({
        returnOnPause: false,
        moveOnSeek: true,
        draw: true
    });
    var pOps = {
        normalize: true,
        scrollParent: true,
        autoCenterImmediately: true,
        backgroundColor: '#f5f5f5',
        waveColor: 'grey',
        progressColor: 'hsla(200, 100%, 30%, 0.5)',
        barWidth: 3,
        cursorColor : 'red',
        plugins: [ pHead ]
    };

    function initPlayers(){
        deck.toArray().forEach(function (item, id) {
            WScreatePlayer(item, id);
        });
    }

    function WScreatePlayer(container, id){
        pOps.container = container;
        player[id] = WaveSurfer.create(pOps);
        player[id].on('loading', function(e) {
            if(!player[id].isPlaying() && e<100){
                posDisplay[id].innerText = `loading ${e}%`;
            }
         });
        control[id] = new Wrapper(id,player[id]);
        player[id].on('waveform-ready', function(e) { displayTime(id) });
        player[id].on('audioprocess', function(e) { displayTime(id) });
        player[id].on('ready', function(e) {
            control[id].duration = player[id].getDuration();
            displayTime(id);  
            player[id].playhead.setPlayheadTime(0); });
        player[id].on('play', function(e) { control[id].playing = true; });
        player[id].on('pause', function(e) { control[id].playing = false; });
        player[id].on('finish', function(e) {
            control[id].playing = false; 
            autoLoader(id);
        });
        return player[id];
    }

    function WSReadFileMetadata(id,file){
        var info = file.name;
        if(window.jsmediatags){
            window.jsmediatags.read(file, {
            onSuccess: function(result) {
                if(result.tags.artist && result.tags.title){
                    info=result.tags.artist + " - " + result.tags.title;
                }
                playerInfo[id].innerText = info;
                extraInfo[id].innerText = result.tags.genre ? result.tags.genre : "";
            }
            });
        }
        playerInfo[id].innerHTML = info;
    }

    // slow down or speed up playback
    function changeSpeed(id,speedDown){
        const step = 0.01;

        var currentRate = player[id].getPlaybackRate(); 
        if(speedDown){ //Decrement
            currentRate = currentRate - step;
        } else { //Increment
            currentRate = currentRate + step;
        }
        if(currentRate >= 0.5 && currentRate <= 2){
            player[id].setPlaybackRate(currentRate);
        } else {
            console.log("invalid speed");
        }
        extraInfo[id].innerText = `Speed: x ${currentRate.pad(2)}`;
    }

    function displayTime(id){
        var curPos = player[id].getCurrentTime(),
            remain = player[id].getDuration() - curPos;
        control[id].position = curPos;
        if(remain < 21 && remain > 0){
           player[id].setWaveColor('red');
           blinker = true;
        } else if (blinker){
           player[id].setWaveColor(pOps.waveColor);
           blinker = false;
        }
     }

    // cleanup
    function killPlayer()
	{
		if(player){
            player.toArray().forEach(function (item, id) {
                item.stop();
                sendShortMsg([0x94+id, 0x16, 0x00]);
                sendShortMsg([0x94+id, 0x15, 0x00]);
                sendShortMsg([0x94+id, 0x14, 0x00]);
            });
		}
	}

    (async () => {  //permission for "speaker-selection" not supported yet
        try {
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
        } catch(e) {
            printInfo("Speaker-selection disabled.");
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
                printInfo((out1.length > 1) ? out1.length + " Audio-Outputs detected" : "Audio-Output detected");               
                })
            .catch(function(err) {
                console.log(err.name + ": " + err.message);
            });            
         }

      })().catch( console.error );
}