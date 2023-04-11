{
    const msgEOM = 0x3a;
    const playLED = 0x01;
    var control = [];

    function createPlayerEvents(){
        player.toArray().forEach(function (item, id) {
            updatePlayerTime(item, id);
            startStopPlayer(item, id);
            playlistEnded(item, id);
            item.addEventListener("emptied", (event) => {
              pos[id].innerHTML = "";
            });
        });
    }

    // load file into next available player
    function loadLocalFile(file){
        var id = 0;
        if(control[0].active){
          id = 1;
        }
        control[id].loadFile(file);
        return id;
    }

    // start and stop player
	function pausePlay(id){
		if(playerInactive(id)){
			player[id].play();
			sendShortMsg([0x90,playLED+id,0x7f]);
		} else {
			player[id].pause();
			sendShortMsg([0x90,playLED+id,0x01]);
		}
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

    function updatePlayerTime(player, id){
        // Update Time-Displays
        player.addEventListener("timeupdate", (event) => {
            var remain = player.duration - player.currentTime;
            var mins = parseInt((remain/60)%60),
            secs = parseInt(remain%60),
            millis = remain.toFixed(2).slice(-2,-1);
            sendShortMsg([0x94+id, 0x16, millis]);
            if(prevSecs != secs){
                sendShortMsg([0x94+id, 0x15, secs]);
                prevSecs = secs;
            }
            if(prevMins != mins){
                sendShortMsg([0x94+id, 0x14, mins]);
                prevMins = mins;
            }
            if(remain < 21 && remain > 0 && control[id].EOM == false){
                control[id].EOM = true;
            }
            if(mins && outputs.length == 0){
                pos[id].innerHTML = `-${mins}:${secs.pad(2)}.${millis}`;
            }
        });
    }

    function startStopPlayer(player, id){
        // Player started
        player.addEventListener("play", (event) => {
        sendShortMsg([0x90,0x01+id,0x7f]);
        })
        // Player stopped
        player.addEventListener("pause", (event) => {
        sendShortMsg([0x90,0x01+id,0x01]);
        })
    }

    function playlistEnded(player, id){
        player.addEventListener("ended", (event) => {
            sendShortMsg([0x90,playLED+id,0x01]);
            control[id].EOM=false
        });
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
}