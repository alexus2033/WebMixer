const msgEOM = 0x3a;
const playLED = 0x01;

class Wrapper {
    #eom;
    #active;
    #playing;

    constructor(id) {
        this.id = id;
        this.#eom = false;
        this.#playing = false;
        this.#active = false;
        this.widget = null;
        this.player = player[this.id];
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
        if(newState == this.#playing)
            return; //nothing changed

        this.#playing = newState;
        if(newState == true){
            sendShortMsg([0x90,playLED+this.id,0x7f]);
        } else {
            sendShortMsg([0x90,playLED+this.id,0x01]);
        }
    }

    get playing() {
        return this.#playing;
    }

    loadSCTrack(trackURL,settings) {
        if(!this.widget){
            SCPlayerCreate(this.id,trackURL);
        } else {
            this.widget.load(trackURL,settings);
        }
    }

    loadFile(file) {
        var url = URL.createObjectURL(file); 
        this.player.setAttribute('src', url);
        this.player.load();
        this.localFile = file.name;
        info[this.id].innerText = file.name;
    }

    togglePlay() {
        if(this.widget){
            this.widget.toggle();
        }
    }
}