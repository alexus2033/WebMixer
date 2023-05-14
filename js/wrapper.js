const msgEOM = 0x3a;
const playLED = 0x01;
const playedSecs = 15;

function availableDeck(){
    var nextDeck = 0;
    if(control[0].playing == true || (control[0].duration > 0 && control[1].duration == 0)){
        nextDeck = 1;
    }
    return nextDeck;
}

class Wrapper {
    #eom;
    #active;
    #played;
    #playing;

    constructor(id, newPlayer) {
        this.id = id;
        this.player = newPlayer;
        this.duration = 0;
        this.url = null;
        this.#eom = false;
        this.#played = false;
        this.#playing = false;
        this.#active = false;
        this.widget = null;
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
        if(newState == false){
            this.EOM = false; //stop blinker
            this.playing = false;
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
     * @param {boolean} newState
     */
    set markPlayed(newState) {
        if(newState == this.#played)
            return; //nothing changed
        console.log(this.url);
        this.#played = newState;
        const listEntry = $("#fileList option[value='"+ this.url +"']");
        if(listEntry){
            listEntry.css('background-color', 'lightgrey');
        }
    }

    get markPlayed() {
        return this.#played;
    }

    /**
     * @param {boolean} newState
     */
    set EOM(newState) {
        if(newState == this.#eom)
            return; //nothing changed

        this.#eom = newState;
        if(newState == true){
            sendShortMsg([0x90,msgEOM+this.id,0x7f]);
            if(this.widget && this.url.startsWith("users/")){
                SCgetPlaylist(this.widget,this.id); //reload playlist
            }
        } else {
            console.log("set EOM off");
            sendShortMsg([0x90,msgEOM+this.id,0x01]);
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
        if(newState == true){
            sendShortMsg([0x90,playLED+this.id,0x7f]);
            $(".playstop")[this.id].value = " Stop ";
        } else {
            sendShortMsg([0x90,playLED+this.id,0x01]);
            $(".playstop")[this.id].value = " Play ";
        }
    }

    get playing() {
        return this.#playing;
    }

    setVolume(newLevel){
        if(!this.widget){
            this.player.setVolume(newLevel);
        } else {
            this.widget.setVolume(newLevel*100);
        }
    }

    setPosition(newPos){
        if(!this.widget){
            this.player.seekTo(newPos);
        } else {
            this.widget.seekTo(newPos*1000);
        }
    }

    load(mediaEntry, autoplay=false) {
        console.log(mediaEntry);
        this.url = mediaEntry;
        this.#played = false;
        if(mediaEntry.startsWith("file/")){
            var x = mediaEntry.substring(5);
            this.loadFile(fileStore[x-1], autoplay);
        } else if (mediaEntry.startsWith("audius/")){
            this.loadAudius(mediaEntry, autoplay);
        } else {     // Soundcloud
            const [trackURL, settings] = SCGetTrackURL(mediaEntry,autoplay);
            this.loadSCTrack(trackURL,settings);
        }
        if(autoplay==true) this.player.play();
    }

    loadFile(file) {
        this.displaySCPlayer(false);
        const src = URL.createObjectURL(file);
        this.player.load(src);
        WSReadFileMetadata(this.id,file);
    }

    async loadAudius(trackURL){
        this.displaySCPlayer(false);
        var url = AudiusStreamURL(trackURL),
            song = new Audio(url),
            songInfo = readTitle(trackURL);

        this.player.load(song);
        if(songInfo.length<4){
            var meta = await AudiusReadMetadata(trackURL);
            AudiusSaveMetadata(trackURL,meta);
            this.duration = meta.duration;
        } else {
            playerInfo[this.id].innerText = songInfo[0];
            extraInfo[this.id].innerText = songInfo[3];
        }
    }

    loadSCTrack(trackURL,settings) {
        this.displaySCPlayer(true);
        if(!this.widget){
            SCPlayerCreate(this.id,trackURL);
        } else {
            this.widget.load(trackURL,settings);
        }
    }

    displaySCPlayer(showSC){
        const wave = this.player.container.querySelector("wave");
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
            this.player.setWaveColor('#3B8686');
        }
        playerInfo[this.id].innerText = "";
        extraInfo[this.id].innerText = "";
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
            this.player.playPause();
        }
    }
}