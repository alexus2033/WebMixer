// Wavesurfer player script V0.9
{
    var control = [];
    // Create a canvas gradient
    const ctx = document.createElement('canvas').getContext('2d'),
        greyGard = ctx.createLinearGradient(0, 0, 0, 150);
        greyGard.addColorStop(0, 'rgb(199, 199, 199)')
        greyGard.addColorStop(0.7, 'rgb(100, 100, 100)')
        greyGard.addColorStop(1, 'rgb(0, 0, 0)')

    const pHead = WaveSurfer.playhead.create({
        returnOnPause: false,
        moveOnSeek: true,
        draw: true
    });
    var pOps = {
        normalize: true,
        scrollParent: true,
        autoCenterImmediately: true,
        waveColor: greyGard,
        progressColor: '#ff5501',
        barWidth: 2,
        cursorColor : 'red',
        plugins: [ pHead ]
    };
    
    function WSPlayersInit(){
        deck.toArray().forEach(function (item, id) {
            WScreatePlayer(item, id);
        });
    }

    function WScreatePlayer(container, id){
        pOps.container = container;
        player[id] = WaveSurfer.create(pOps);
        player[id].on('loading', function(e) {
            if(!player[id].isPlaying()){
                posDisplay[id].innerText = e<100 ? `loading ${e}%` : `loading` ;
            }
         });
        control[id] = new Wrapper(id,player[id]);
        player[id].on('waveform-ready', function(e) {posDisplay[id].innerText = ""; });
        player[id].on('audioprocess', function(e) { displayTime(id) });
        player[id].on('ready', function(e) {
            control[id].duration = player[id].getDuration();
            control[id].displaySongInfo();
            displayTime(id);
            player[id].playhead.setPlayheadTime(control[id].start);
        });
        player[id].on('play', function(e) { control[id].playing = true; });
        player[id].on('pause', function(e) { control[id].playing = false; });
        player[id].on('finish', function(e) {
            control[id].playing = false;
            control[id].finished = true;
            autoLoader(id);
        });
        return player[id];
    }

    function WSFileReadMetadata(file,id){
        if(window.jsmediatags){
            window.jsmediatags.read(file, {
            onSuccess: function(result) {
                const meta = result.tags,
                      newTitle = new DBtitle([id, meta.title, meta.artist, meta.picture, meta.genre]);
                newTitle.insert();
                updateListEntry(id, createLabel(meta.artist, meta.title));
            },
            onError: function() {
                const zu = file.name.replace(/\.[^/.]+$/, ""),
                      label = zu.split(" - "),
                      newTitle = new DBtitle(id,label[0],(label.length == 1) ? "" : label[1]);
                newTitle.insert();
              }
            });
        }
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
           //player[id].setWaveColor('red');
           blinker = true;
        } else if (blinker){
           //player[id].setWaveColor(pOps.waveColor);
           blinker = false;
        }
     }

    // cleanup
    function killPlayer()
	{
		if(player){
            player.toArray().forEach(function (item, id) {
                item.stop();
                MIDIsendShortMsg([0x94+id, 0x16, 0x00]);
                MIDIsendShortMsg([0x94+id, 0x15, 0x00]);
                MIDIsendShortMsg([0x94+id, 0x14, 0x00]);
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