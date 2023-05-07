const msgEOM = 0x3a;
const playLED = 0x01;

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
    #playing;

    constructor(id, newPlayer) {
        this.id = id;
        this.player = newPlayer;
        this.duration = 0;
        this.#eom = false;
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
            $(".playstop")[this.id].value = "Stop ";
        } else {
            sendShortMsg([0x90,playLED+this.id,0x01]);
            $(".playstop")[this.id].value = "Play ";
        }
    }

    get playing() {
        console.log(this.#playing);
        return this.#playing;
    }

    setVolume(newLevel){
        if(!this.widget){
            this.player.volume = newLevel;
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

    loadSCTrack(trackURL,settings) {
        this.url = trackURL;
        if(!this.widget){
            SCPlayerCreate(this.id,trackURL);
        } else {
            this.widget.load(trackURL,settings);
        }
    }

    async load(mediaEntry, autoplay) {
        this.player.setWaveColor('#3B8686');
        if(mediaEntry.startsWith("file/")){
            var x = mediaEntry.substring(5);
            this.loadFile(fileStore[x-1], autoplay);
        } else if (mediaEntry.startsWith("audius/")){
            var url = AudiusStreamURL(mediaEntry),
                song = new Audio(url);
            this.player.load(song);
            var meta = await AudiusReadMetadata(mediaEntry);
            this.duration = meta.duration;
            playerInfo[this.id].innerText = meta.title;
            extraInfo[this.id].innerText = meta.genre;
        } else { //Soundcloud
            loadSCTrackID(mediaEntry, autoplay);
        }
    }

    loadFile(file, autoplay) {
        if(this.widget){
            this.widget = null;
            SCPlayerKillEvents(this.id);
        }
        this.url = file.name;
        const src = URL.createObjectURL(file);
        this.player.load(src);
        if(autoplay==true) this.player.play();
        WSupdateMetadata(this.id,file);
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