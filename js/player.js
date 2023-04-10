
{
    const msgEOM = 0x3a;
    const playLED = 0x01;
    var eom = [false,false];

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

    function playerInactive(n){
		if(!player[n].currentTime){
		  return true;
		}
		return player[n].paused;
	}

    // load file into next available player
    function loadTitle(file){
        var url = URL.createObjectURL(file);
        var id = 0;
        if(!playerInactive(0)){
          id = 1;
        }
        player[id].setAttribute('src', url);
        player[id].load();
        info[id].innerText = file.name;
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
            if(remain < 21 && remain > 0 && eom[id] == false){
                sendShortMsg([0x90,msgEOM+id,0x7f]);
                eom[id] = true;
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
            if(eom[id]==true){
                sendShortMsg([0x90,msgEOM+id,0x01]);
                eom[id] = false;
            }
        });
    }

    function killPLayer()
	{
		if(player){
			player[0].stop();
			player[1].stop();
		}
		sendShortMsg([0x90,msgEOM+id,0x01]);
	}
    
    // format number
    Number.prototype.pad = function(size) {
		var s = String(this);
		while (s.length < (size || 2)) {s = "0" + s;}
		return s;
	}
}