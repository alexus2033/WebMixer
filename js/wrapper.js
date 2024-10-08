"use strict"

const playLED = 0x01;
const playedSecs = 20;
const startSecs = 4;

function availableDeck(){
    var nextDeck = 0;
    if(control[0].playing == true || (control[0].duration > 0 && control[1].url == null)){
        nextDeck = 1;
    }
    return nextDeck;
}

function initAutoLoader(){
    var nextDeck = availableDeck();
    autoLoader(nextDeck);
    if(nextDeck == 0 && control[1].url == null){
        autoLoader(1); //load empty deck
    }
}

function autoLoader(id){
    var checkBox = document.getElementById("autoLoad"),
        selectedIdx = fileList.selectedIndex;
    if (checkBox.checked == true && selectedIdx >=0){
        var audioItem = fileList.options[selectedIdx].value;
        if(control[0].url === audioItem ||
           control[1].url === audioItem){ //move to next entry
            audioItem = fileList.options[selectedIdx+1].value;
            fileList.selectedIndex = selectedIdx+1;
        }
        control[id].load(audioItem);
    }
}

//start available player with next song
function autoPlayer(id){
    var nextDeck = (id == 0) ? 1 : 0,
        checkBox = document.getElementById("autoPlay");
    if (checkBox.checked == true && control[nextDeck].markPlayed == false){
        if(control[nextDeck].widget && control[nextDeck].playing == true){
            //SC-Player only: check widget state again
            control[nextDeck].widget.isPaused(function(paused) {
                if(paused){
                    control[nextDeck].play();
                }
            });
        } else if(control[nextDeck].playing == false){
            console.log("autoPlayer","PLAY!");
            control[nextDeck].play();
            //MIDIsendMsg(id,'autoplay')
        }
    }
}

class Wrapper {
    #eom;
    #active;
    #played;
    #playing;
    #startMarker;
    #position;
    #prev;
    #pos;
    #remain;

    constructor(id, newPlayer) {
        this.id = id;
        this.player = newPlayer;
        this.duration = 0;
        this.url = null;
        this.finished = false;
        this.#remain = 0;
        this.#eom = false;
        this.#played = false;
        this.#playing = false;
        this.#active = false;
        this.widget = null;
        this.tme = new HelpMakeStruct("millis, sec, mins, hours, percent");
        this.#pos = new this.tme(0,0,0,0);
        this.#prev = new this.tme(0,0,0,0);
    }

    /**
     * @param {string} newTitle
     */
    set title(newTitle){}

    /**
     * @param {boolean} newState
     */
    set active(newState) {
        this.#active = newState;
        this.playing = false;
        if(newState == false){
            this.EOM = false; //stop blinker
        }
    }

    get active(){
        if(this.widget)
            return this.#active;
        
        if(!this.player.currentTime)
            return false;
        
        return !this.player.paused;
    }

    /**
     * @param {int} newValue
     */
    set position(newValue){
        this.#position = newValue;
        this.#remain = this.duration - newValue;
        this.#pos.mins = parseInt((this.#remain/60)%60);
        this.#pos.secs = parseInt(this.#remain%60);
        //this.#pos.millis = newValue.toFixed(2).slice(-2,-1);
        this.#pos.millis = Math.floor((this.#remain - Math.floor(this.#remain)) * 100);
        this.#pos.Percent = Math.round(newValue/this.duration*100);

        const adr = midiMSG.time + this.id;

        if(this.finished){
            //posDisplay[this.id].innerHTML = "0:00.0";
            posDisplay[this.id].innerHTML = "0:00.00";
            MIDIsendShortMsg([adr, midiMSG.mills, 0]);
            return; //skip display update
        }
        if(this.#prev.percent != this.#pos.Percent){
            MIDIsendShortMsg([adr, midiMSG.percent, this.#pos.Percent]);
            this.#prev.percent = this.#pos.Percent; 
        }
        if(this.#prev.mins != this.#pos.mins){
            MIDIsendShortMsg([adr, midiMSG.mins, this.#pos.mins]);
            this.#prev.mins = this.#pos.mins
        }
        if(this.#prev.secs != this.#pos.secs){
            MIDIsendShortMsg([adr, midiMSG.secs, this.#pos.secs]);
            this.#prev.secs = this.#pos.secs;
            if(this.#remain > 0 && this.#remain < startSecs){
                autoPlayer(this.id);
            }
            if(this.position > playedSecs){
                this.markPlayed = true;
            }
        }
        if(this.#prev.millis != this.#pos.millis){
            MIDIsendShortMsg([adr, midiMSG.mills, this.#pos.millis]);
            this.#prev.millis = this.#pos.millis;
            //update Time Display
            posDisplay[this.id].innerHTML = `-${this.#pos.mins}:${this.#pos.secs.pad(2)}.${this.#pos.millis.pad(2)}`;
        }
        if(this.playing && this.#remain < 21 && this.#remain > 0 && this.EOM == false){
            this.EOM = true; //start blinker
        }
    }
    get position(){
        return this.#position;
    }

    /**
     * @param {boolean} newState
     */
    set markPlayed(newState) {
        if(newState == this.#played)
            return; //nothing changed
        
        console.log("markPlayed: "+this.url);
        this.#played = newState;
        var songInfo = {
            id: this.url,
            played: new Date().getTime()
        }
        DBupdateTitle(songInfo);
        if(this.listEntry){
            this.listEntry.addClass("played");
        }
    }

    get markPlayed() {
        return this.#played;
    }

    get listEntry() {
        return $("#fileList option[value='"+ this.url +"']");
    }

    /**
     * @param {boolean} newState
     */
    set EOM(newState) {
        if(newState == this.#eom)
            return; //nothing changed
            
        this.#eom = newState;
        if(newState == true){
            MIDIsendShortMsg([0x90,midiMSG.EOM+this.id,0x7f]);
            if(this.widget && this.url.startsWith("users/")){
                SCgetPlaylist(this.widget,this.id); //reload playlist
            }
        } else {
            MIDIsendShortMsg([0x90,midiMSG.EOM+this.id,0x01]);
        }
    }

    get EOM() {
        return this.#eom;
    }

    /**
     * @param {boolean} newState
     */
    set playing(newState) {
        if(newState == false){
            this.EOM = false; //stop blinker
        }
        if(newState == this.#playing)
            return; //nothing changed

        this.#playing = newState;
        const listEntry = $("#fileList option[value='"+ this.url +"']");
        if(newState == true){
            if(listEntry){
                listEntry.addClass("playing");
            }
            this.finished = false;
            DenonSetLED(this.id+1, 'param', 1);	/* parameter knob */
            DenonSetLED(this.id+1, 'play', 1);
            MIDIsendShortMsg([0x90,playLED+this.id,0x7f]);
            $(".playstop")[this.id].value = " Stop ";
        } else {
            if(listEntry){
                listEntry.removeClass("playing");
            }
            DenonSetLED(this.id+1, 'play', 0);
            MIDIsendShortMsg([0x90,playLED+this.id,0x01]);
            $(".playstop")[this.id].value = " Play ";
        }
    }

    get playing() {
        return this.#playing;
    }

    get start() {
        return this.#startMarker;
    }

    setVolume(newLevel){
        if(!this.widget){
            this.player.setVolume(newLevel);
        } else {
            this.widget.setVolume(newLevel*100);
        }
    }

    movePosition(newPos){
        this.EOM = false; //reset blinker
        if(!this.widget){
            this.player.seekTo(newPos);
        } else {
            this.widget.seekTo(newPos*1000);
        }
    }

    setStart(){
        if(!this.widget){
            this.#startMarker = SCPlayerPosition[this.id];
        } else {
            this.#startMarker = this.player.playhead.playheadTime;
        }
    }

    load(mediaEntry, autoplay=false) {
        this.url = mediaEntry;
        this.finished = false;
        this.#played = false;
        this.#playing = false;
        console.log("loading",this.id,this.url);
        playerInfo[this.id].innerText = "";
        extraInfo[this.id].innerText = "";
        if(mediaEntry.startsWith("file/")){
            var x = mediaEntry.substring(5);
            this.loadFile(fileStore[x-1], autoplay);
        } else if (mediaEntry.startsWith("audius/")){
            this.loadAudius(mediaEntry, autoplay);
        } else {     // Soundcloud
            const [trackURL, settings] = SCGetTrackURL(mediaEntry,autoplay);
            this.loadSCTrack(trackURL,settings);
        }
        this.#prev = new this.tme(-1,-1,-1,0); //force disp update
        if(autoplay==true) this.player.play();
    }

    loadFile(file) {
        this.displaySCPlayer(false);
        const src = URL.createObjectURL(file);
        this.player.load(src);
    }

    async loadAudius(trackURL){
        this.displaySCPlayer(false);
        var url = AudiusStreamURL(trackURL),
            song = new Audio(url),
            songInfo = await DBreadTitle(trackURL);

        this.player.load(song);
        if(songInfo.length<4){
            var meta = await AudiusReadMetadata(trackURL);
            AudiusSaveMetadata(trackURL,meta);
            this.duration = meta.duration;
        } else {
            this.displaySongInfo();
        }
    }

    loadSCTrack(trackURL,settings) {
        this.displaySCPlayer(true);
        if(!this.widget){
            SCPlayerCreate(this.id,trackURL);
        } else {
            this.widget.load(trackURL,settings);
        }
        setTimeout(() => {
            this.widget.getCurrentSound((x) => {
                this.#prev = new this.tme(-1,-1,-1,0); //force disp update
                this.duration = x.duration/1000;
                this.position = 0;
                console.log(x);
                let meta = x.publisher_metadata,
                    artist = meta.artist ? meta.artist : x.artist,
                    title = meta.release_title ? meta.release_title : x.title;
                DenonDisplay(this.id+1 ,artist ,title);
            });
        }, 999);                    
    }

    async displaySongInfo(){
        const meta = await DBreadTitle(this.url);
        let label = createLabel(meta.artist, meta.name,"");
        playerInfo[this.id].innerText = label;
        if (typeof meta.genre !== 'undefined'){    
            extraInfo[this.id].innerText = meta.genre;
        }
    }

    displaySCPlayer(showSC){
        if(showSC == true && !this.player.isDestroyed){
            this.player.stop();
            this.player.destroy();
            deck[this.id].innerHTML = "";
        } else if(showSC == false) {
            if(this.widget){
                this.widget = null;
                SCPlayerDestroy(this.id);
            }
            if(this.player.isDestroyed){
                this.player = WScreatePlayer(deck[this.id],this.id);
            }
            this.player.setWaveColor(pOps.waveColor);
        }
    }

    play() {
        if(this.widget){
            this.widget.play();
        } else {
            this.player.play();
        }
    }

    togglePlay() {
        if(this.widget){
            this.widget.toggle();
        } else {
            try {
                this.player.playPause();
            } catch (err) {
                printInfo(err);
            }
        }
    }
}