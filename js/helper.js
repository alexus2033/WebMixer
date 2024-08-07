var myDB;

function DBinit(){
    return new Promise (function(resolve) {
        indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;    
        if(!indexedDB){
            return reject("IndexedDB not available");
        }
        var request = indexedDB.open("alpha_idb",2);
        request.onupgradeneeded = function(e){
            myDB = e.target.result;
            if(!myDB.objectStoreNames.contains("titles")){
                let osTitles = myDB.createObjectStore("titles",{keyPath:"id"});
                osTitles.createIndex('id','id',{unique: true});
                osTitles.createIndex('artist','artist',{unique: false});
                osTitles.createIndex('genre','genre',{unique: false});
                osTitles.createIndex('duration','duration',{unique: false});
                osTitles.createIndex('added','added',{unique: false});
                osTitles.createIndex('played','played',{unique: false});
            }
            if(!myDB.objectStoreNames.contains("playlists")){
                let osPLists = myDB.createObjectStore("playlists",{keyPath:"id"});
                osPLists.createIndex('id','id',{unique: true});
                osPLists.createIndex('parent','parent',{unique: false});
                osPLists.createIndex('name','name',{unique: false});
                osPLists.createIndex('pos','pos',{unique: false});
            }
            if(!myDB.objectStoreNames.contains("playlistcontent")){
                let osPListC = myDB.createObjectStore("playlistcontent");
                osPListC.createIndex('plid','plid',{unique: false});
                osPListC.createIndex('tid','tid',{unique: false});
                osPListC.createIndex('pos','pos',{unique: false});
                osPListC.createIndex('start','start',{unique: false});
                osPListC.createIndex('end','end',{unique: false});
            }
            return resolve(myDB);
        }
        request.onsuccess = function(e){
            myDB = e.target.result;
            return resolve(myDB);
        }
        request.onerror = function(){
            return reject(request.error);
        }
    });
}

function promiseReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
}

function DBsetTransaction(ttype){
    var trans = myDB.transaction(["titles"],ttype);
    return trans.objectStore("titles");
}

async function DBreadTitle(songURL){
    const titleStore = DBsetTransaction("readonly");
    let val = await promiseReq(titleStore.get(songURL));
    return val;
}

function DBkillTitle(songURL){
    const titleStore = DBsetTransaction("readwrite");
    var result = titleStore.delete(songURL);
    result.onerror = function(event){
        let request = event.target; 
        printInfo("DB killTitle failed: " + request.error);
    }
}

function DBAdd2PList(title){
    const newItem = {
        plid:0,
        tid:title,
        pos:0
    };
    var trans = myDB.transaction(["playlistcontent"],"readwrite"),
        playStore = trans.objectStore("playlistcontent"),
        result = playStore.add(newItem);
    result.onerror = function(event){
        let info = (title ? title : songURL),
            request = event.target;
        console.log(request.error); 
        printInfo("DB insert failed: " + info);
    }
}

function DBupdateTitle(entry){
    const titleStore = DBsetTransaction("readwrite");
    var result = titleStore.get(entry.id);
    result.onsuccess = function(event){
        var record = event.target.result;
        Object.assign(record, entry); //merge entry into record
        var result = titleStore.put(record);
        result.onerror = function(event){
            let request = event.target; 
            printInfo("DB update failed: " + request.error);
        }
    }
}

class DBtitle {

    constructor(id, title) {
        this.id = this.fixID(id);
        this.name = title;
        this.artist = "";
        this.coverArt = "";
        this.genre = "";
        this.added = new Date().getTime();
        this.duration = 0;
        this.played = 0;
        this.rating = 0;
      	if(Array.isArray(id)){
          for (const [x, value] of id.entries()) {
              let prop = Object.keys(this)[x];
              if(value){ //assign array to properties
                this[prop]=value
              }
          }  
        }    
    }

    fixID(inputVal){
        if(Array.isArray(inputVal)){
            inputVal[0] = this.fixID(inputVal[0]);
            return;
        }
        if(inputVal.startsWith("/")){
            inputVal = inputVal.substring(1);
        }
        if (inputVal.startsWith("tracks/")){ //update old metadata 
            inputVal = "SC/" + inputVal.substring(7);
        }
        return inputVal;
    }

    insert() {
        const titleStore = DBsetTransaction("readwrite");
        let info = (this.name ? this.name : this.id),
        result = titleStore.add(this);
        result.onerror = function(){
            printInfo("DB insert failed: " + info);
        }
    }

    update() {
        const titleStore = DBsetTransaction("readwrite");
        var result = titleStore.get(this.id);
        result.onsuccess = function(event){
            var record = event.target.result;
            Object.assign(record, this); //merge entry into record
            var result = titleStore.put(record);
            result.onerror = function(event){
                let request = event.target; 
                printInfo("DB update failed: " + request.error);
            }
        }
    }

    kill() {
        const titleStore = DBsetTransaction("readwrite");
        var result = titleStore.delete(this.id);
        result.onerror = function(event){
            let request = event.target; 
            printInfo("DB killTitle failed: " + request.error);
        }
    }
}

async function displayCover(audioURL){
    const img = document.getElementById("cover"),
    songInfo = await DBreadTitle(audioURL);
    if(typeof songInfo == "undefined" || !songInfo.coverArt){
        img.src = "https://upload.wikimedia.org/wikipedia/commons/8/86/No_cover.png";
        return;
    }
    if(audioURL.startsWith('file/')){
        const { data, format } = songInfo.coverArt;
        let base64String = "";
        for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
        }
        img.src = `data:${format};base64,${window.btoa(base64String)}`;
    } else { //not startsWith('file')  
        var cover = songInfo.coverArt;
        if(cover.endsWith("large.jpg")){
            cover = cover.replace("large.jpg","t500x500.jpg");
        } else if (cover.endsWith("large.png")){
            cover = cover.replace("large.png","t500x500.png");
        }
        img.src = cover;
    }
    $("#tagger #start").val("0:00");
    $("#tagger #dura").val(timecode(songInfo.duration)); 
}

function importCSV(){
    var file = document.getElementById('importer').files[0],
        reader = new FileReader();
    reader.onload = function (progressEvent) {
        var lines = this.result.split('\n');
        lines.forEach(line => {
            const data = line.split(';');
            if(data.length > 1){
                var newTitle = new DBtitle(data); //songURL,title,artist,cover,genre
                newTitle.insert();
                if(data[2] && data[2]!=="null"){
                    UIaddListEntry(`${data[2]} - ${data[1]}`,data[0]); //title + artist, URL
                } else {
                    UIaddListEntry(data[1],data[0])
                }
            }
        });
    };
    reader.readAsText(file);
}

// export data from localStorage (old)
function exportOldCSV(){
    var content = "";
    Object.keys(localStorage).filter(function(key){
        return !key.startsWith("file/");
    }).forEach(key => {
        content += `${key};`
        const data = JSON.parse(localStorage.getItem(key));
        data.forEach(item => {
            content += `${item};`
        });
        content += "\n";
    });
    Save2File(content);
}

function storeSettings() {
    $("#autobox input[type='checkbox']").forEach(cBox => {
        localStorage.setItem('settings/'+cBox.id, cbox.checked);    
    });
}

function Save2File(data) {
    const link = document.createElement("a"),
          file = new Blob([data], { type: 'text/csv' });
    link.href = URL.createObjectURL(file);
    link.download = "alphabeat-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}

// export data from indexedDB (new)
function exportCSV(){
    const titleStore = DBsetTransaction("readonly"),
          fieldList = ["id","name","artist","coverArt","genre","added"];
    let content = "",
        loadrequest = titleStore.getAll();
    loadrequest.onerror = event => reject(event.target.error);
    loadrequest.onsuccess = event => {
        var alldata = event.target.result,
            data = alldata.filter(item => !item.id.startsWith("file/"));
            data.forEach(row => {
                fieldList.forEach(key => {
                    let value = (typeof row[key] !== "undefined" ? row[key] : "");
                    content += `${value};`
                });
            content += "\n";
        });
        Save2File(content);
    };
}

function displayCount(index){
    const countRequest = index.count();
    countRequest.onsuccess = function() {
        printInfo(`${countRequest.result} Songs found in Database`);
    };
}

function DBcleanUpFiles(){
    const titleStore = DBsetTransaction("readonly"),
    index = titleStore.index("id"),
    request = index.getAllKeys();
    request.onsuccess = () => {
        const data = request.result.filter(item => item.startsWith("file/"));
        data.forEach(id => {
            DBkillTitle(id);
        });
    };
}

function DBreadTitles(readCallback,displayCounter=false){
    const titleStore = DBsetTransaction("readonly"),
          sorter = $("#sorter :checked").val();
    let order = "next";
    if(sorter == "added" || sorter == "played"){
        order = "prev";
    }
    let index = titleStore.index(sorter),
        findtext = $("#searchbox input").val().trim();
    if(displayCounter){
        if(displayCount(index)==0){
            readCallback(AudiusDemoItem.name, AudiusDemoItem.id);
        }       
    }
    let request = index.openCursor(null,order);
    request.onsuccess = function() {
        const cursor = request.result;
        if (cursor) { // Called for each matching record.
            if(cursor.value.artist && !cursor.value.name.startsWith(cursor.value.artist)){
                var label = `${cursor.value.artist} - ${cursor.value.name}`;
            } else {
                var label = cursor.value.name;
            }
            if(sorter == "added"){
                let ago = moment(cursor.value.added).fromNow();
                //  ago = moment(cursor.value.added).format('DD.MM.YY hh:mm');
                label = `[${ago}] ${label}`;
            } else if(sorter == "played"){
                let ago = moment(cursor.value.played).fromNow();
                label = `[${ago}] ${label}`;
            } else if(sorter == "duration"){
                let dura = timecode(cursor.value.duration)
                label = `[${dura}] ${label}`;
            } else if(sorter == "genre"){
                label = `[${cursor.value.genre}] ${label}`;
            } else if(sorter == "artist"){
                label = `[${cursor.value.artist}] ${cursor.value.name}`;
            }
            if(label.toLowerCase().includes(findtext.toLowerCase())){
                if(typeof sessionStarted !== 'undefined' && cursor.value.played >= sessionStarted){
                    readCallback(label,cursor.value.id,false,true); //mark as played
                } else {
                    readCallback(label,cursor.value.id);
                }
            }
            cursor.continue();
        }
    };
}

function readTags(){
    document.styleSheets[0].insertRule(".hugo::after {content: ' hallo '; border-radius: 5px; color: white; background-color: green; margin-left: 5px; padding: 1px 7px 1px 4px;}",0);
}

// update volume slider & display
function updateSlider(id,volume){
    $("#volume"+(id+1)).val(volume);
    $(`.slider:eq(${id})`).slider('value',volume);
}

async function addSomethingNew(type,something){
    if(type == "SC"){
        newUrl = SCextractID(something);
    } else {
        newUrl = AudiusExtractID(something);
    }
    if(!newUrl){
        printInfo("No valid Data found.");
        return false;
    }
    const songInfo = await DBreadTitle(newUrl);
    if(songInfo){
        printInfo(songInfo.name + " already exists");
        return true;
    }
    if(type == "SC"){
        var meta = SCextractTitle(something),
            title = (meta.length>1 ? meta[1] : newUrl),
            artist = (meta.length>1 ? meta[0] : "")
            track = newUrl.replace("tracks/","SC/"),
            newItem = new DBtitle([track, title, artist]);
            newItem.insert();
    } else {
        var url = AudiusAddress + "/v1/" + newUrl,
          meta = await AudiusReadMetadata(url),
          title = (meta ? meta.title : newUrl),
          track = newUrl.replace("tracks/","audius/");
          AudiusSaveMetadata(track,meta);
    }

    let label = createLabel(artist,title,"")
    UIaddListEntry(label,track,true);
    return true;
}

function createLabel(artist, title, filename){
    if(artist && title){
        return `${artist.trim()} - ${title}`
    } else if(title) {
        return title;
    }
    //remove extension
    return filename.replace(/\.[^/.]+$/, "");
}

function updateListEntry(id, title){
    const listEntry = $("#fileList option[value='"+ id +"']");
    if(listEntry){
        listEntry.text(title);
    }        
}

function printInfo(value){
    if (typeof log === 'undefined' || log === null) {
        //console.log(value);
    } else {
        value += "\n";
        log.innerText += value;
    }
}

function clearInfo(){
    if(log!=null){
        log.innerText = "";
    }
}

// Convert milliseconds into Hours (h), Minutes (m), and Seconds (s)
var timecode = function(ms) {
    if(!ms){ return "" }
    var hms = function(ms) {
          return {
            h: Math.floor(ms/(60*60*1000)),
            m: Math.floor((ms/60000) % 60),
            s: Math.floor((ms/1000) % 60)
          };
        }(ms),
        tc = []; // Timecode array to be joined with seperator

    if (hms.h > 0) {
      tc.push(hms.h);
    }

    tc.push((hms.m < 10 && hms.h > 0 ? "0" + hms.m : hms.m));
    tc.push((hms.s < 10  ? "0" + hms.s : hms.s));

    return tc.join(':');
  };
  
function htmlDecode(input){
    let doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

function HelpDisableScroll() {
    window.scroll(0, 0);
    document.body.style.overflow = 'hidden';  
    // Get the current page scroll position
    let scrollTop = window.scrollY || document.documentElement.scrollTop;
    let scrollLeft = window.scrollX || document.documentElement.scrollLeft
    // if any scroll is attempted, set this to the previous value
    window.onscroll = function () {
        window.scrollTo(scrollLeft, scrollTop);
    };
}

function HelpEnableScroll(){
    document.body.style.overflow = 'visible';
    // remove handler
    window.onscroll = function () { };
}

function HelpResizeList(){
    fileList.size = ($(window).height() - $('#fileList').offset().top) / 26
}

function HelpMakeStruct(keys) {
    if (!keys) return null;
    const k = keys.split(', ');
    const count = k.length;
  
    /** @constructor */
    function constructor() {
      for (let x = 0; x < count; x++) this[k[x]] = arguments[x];
    }
    return constructor;
}

(async () => {  //keep Screen Awake
    if ("wakeLock" in navigator) {
        let wakeLock = null;
        try {
            navigator.wakeLock.request('screen').then(result => {
                console.log("Screenlock active."); 
                wakeLock = result;
            });
        } catch (err) {
            printInfo(`${err.name}, ${err.message}`);
        }
    }     
})().catch( console.error );

// format number with leading zero
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}