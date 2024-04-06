var myDB;

function DBinit(){
    return new Promise (function(resolve) {
        indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;    
        if(!indexedDB){
            return reject("IndexedDB not available");
        }
        var request = indexedDB.open("alpha_idb",1);
        request.onupgradeneeded = function(e){
            myDB = e.target.result;
            if(!myDB.objectStoreNames.contains("titles")){
                var osTitles = myDB.createObjectStore("titles",{keyPath:"id"});
                osTitles.createIndex('id','id',{unique: true});
                osTitles.createIndex('artist','artist',{unique: false});
                osTitles.createIndex('genre','genre',{unique: false});
                osTitles.createIndex('duration','duration',{unique: false});
                osTitles.createIndex('added','added',{unique: false});
                osTitles.createIndex('played','played',{unique: false});
            }
        }
        request.onsuccess = function(){
            myDB = request.result;
            return resolve(request.result);
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

function DBinsertTitle(songURL,title,artist,cover,genre){
    if (songURL) {
        if(songURL.startsWith("/")){
            songURL = songURL.substring(1);
        }
        if (songURL.startsWith("tracks/")){ //update old metadata 
            songURL = "SC/" + songURL.substring(7);
        }
    }
    const newItem = {
        id:songURL,
        name:title,
        artist:artist,
        genre:genre,
        coverArt:cover,
        added:new Date().getTime()
    };
    const titleStore = DBsetTransaction("readwrite");
    var result = titleStore.add(newItem);
    result.onerror = function(event){
        let info = (title ? title : songURL),
            request = event.target;
        console.log(request.error); 
        printInfo("DB insert failed: " + info);
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
}

function importCSV(){
    var file = document.getElementById('importer').files[0],
        reader = new FileReader();
    reader.onload = function (progressEvent) {
        var lines = this.result.split('\n');
        lines.forEach(line => {
            const data = line.split(';');
            if(data.length > 1){
                DBinsertTitle(data[0],data[1],data[2],data[3],data[4]); //songURL,title,artist,cover,genre
                if(data[2] && data[2]!=="null"){
                    addListEntry(`${data[2]} - ${data[1]}`,data[0]); //title + artist, URL
                } else {
                    addListEntry(data[1],data[0])
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
          fieldList = ["id","name","artist","coverArt","genre"];
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
    if(!newUrl) return false;
    if(await DBreadTitle(newUrl)){
        printInfo(newUrl + " already exists");
        return true;
    }
    if(type == "SC"){
        var meta = SCextractTitle(something),
            title = (meta.length>1 ? meta[1] : newUrl),
            artist = (meta.length>1 ? meta[0] : "")
            track = newUrl.replace("tracks/","SC/");
            DBinsertTitle(track,title,artist);
    } else {
        var url = AudiusAddress + "/v1/" + newUrl,
          meta = await AudiusReadMetadata(url),
          title = (meta ? meta.title : newUrl),
          track = newUrl.replace("tracks/","audius/");
          AudiusSaveMetadata(track,meta);
    }

    let label = createLabel(artist,title,"")
    addListEntry(label,track,true);
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

function killTouch(){
    document.addEventListener('touchstart', function(e) {e.preventDefault()}, false);
    document.addEventListener('touchmove', function(e) {e.preventDefault()}, false);
}

// Convert milliseconds into Hours (h), Minutes (m), and Seconds (s)
var timecode = function(ms) {
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

function makeStruct(keys) {
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
            navigator.wakeLock.request('screen').then(lock => { 
                console.log("Screenlock active."); 
                screenLock = lock;
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