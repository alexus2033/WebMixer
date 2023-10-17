
function idbExists(){
    return "indexedDB" in window;
}

if(idbExists){
    var myDB;
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
    request.onsuccess = function(e){
        myDB = request.result;
    }
}

function promiseReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
}

function setTransaction(ttype){
    var trans = myDB.transaction(["titles"],ttype);
    return trans.objectStore("titles");
}

async function readTitle(songURL){
    const titleStore = setTransaction("readonly");
    let val = await promiseReq(titleStore.get(songURL));
    return val;
}

function killTitle(songURL){
    const titleStore = setTransaction("readwrite");
    var result = titleStore.delete(songURL);
    result.onerror = function(event){
        let request = event.target; 
        printInfo("DB update failed: " + request.error);
    }
}

function updateTitle(entry){
    const titleStore = setTransaction("readwrite");
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

function insertTitle(songURL,title,artist,cover,genre){
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
    const titleStore = setTransaction("readwrite");
    var result = titleStore.add(record);
    result.onerror = function(event){
        let request = event.target; 
        printInfo("DB insert failed: " + request.error);
    }
}

const demoItem = {
    id: "audius/qGBBkOP",
    name: "Orange tales - Like that",
    artist: "Destinuna",
    genre: "Electronic",
    coverArt: "https://audius-content-14.figment.io/content/QmebtB7V8JtcetCrCB3ndmdgESjMFhSkm6NnSoyfMVJBLv/480x480.jpg",
    added: 1697391643396,
    start: 0
}

async function displayCover(audioURL){
    img = document.getElementById("cover");
    if(audioURL.startsWith('file/')){
      var x = audioURL.substring(5);
      window.jsmediatags.read(fileStore[x-1], {
          onSuccess: function(tag) {
            if(!tag.tags.picture){
                img.src = "";
                return;
            }
            const { data, format } = tag.tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
              base64String += String.fromCharCode(data[i]);
            }
            img.src = `data:${format};base64,${window.btoa(base64String)}`;
          },
          onError: function(error) {
            img.src = "";
          }
        });
    } else { //not startsWith('file')
        const songInfo = await readTitle(audioURL);
        var cover = "";  
        if(songInfo.coverArt){
            cover = songInfo.coverArt;
            if(cover.endsWith("large.jpg")){
                cover = cover.replace("large.jpg","t500x500.jpg");
            } else if (cover.endsWith("large.png")){
                cover = cover.replace("large.png","t500x500.png");
            }
        }
        img.src = cover;
    }
}

function importCSV(file){
    var reader = new FileReader();
    reader.onload = function (progressEvent) {
        var lines = this.result.split('\n');
        lines.forEach(line => {
            const data = line.split(';'),
                exist = localStorage.getItem(data[0]);
            if(!exist && data.length > 1){
                insertTitle(data[0],data[1],data[2],data[3],data[4]);
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

function exportCSV(){
    const link = document.createElement("a");
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
    const file = new Blob([content], { type: 'text/csv' });
    link.href = URL.createObjectURL(file);
    link.download = "alphabeat-export.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}

function readTitles(readCallback){
    const titleStore = setTransaction("readwrite"),
          sorter = $("#sorter :checked").val();
    var order = "next";
    if(sorter == "added" || sorter == "played"){
        order = "prev";
    }
    var request = titleStore.index(sorter).openCursor(null,order);
    request.onsuccess = function() {
        const cursor = request.result;
        if (cursor) {
            // Called for each matching record.
            if(cursor.value.artist){
                readCallback(`${cursor.value.artist} - ${cursor.value.name}`,cursor.value.id);
            } else {
                readCallback(cursor.value.name,cursor.value.id);
            }
            cursor.continue();
        }
    };
}

async function addSomethingNew(type,something){
    if(type == "SC"){
        newUrl = SCextractID(something);
    } else {
        newUrl = AudiusExtractID(something);
    }
    if(!newUrl) return false;
    if(await readTitle(newUrl)){
        printInfo(newUrl + " already exists");
        return true;
    }
    if(type == "SC"){
        var meta = SCextractTitle(something),
            title = (meta.length>1 ? meta[1] : newUrl),
            artist = (meta.length>1 ? meta[0] : "")
            track = newUrl.replace("tracks/","SC/");
            insertTitle(track,title,artist);
    } else {
        var url = AudiusAddress + "/v1/" + newUrl,
          meta = await AudiusReadMetadata(url),
          title = (meta ? meta.title : newUrl),
          track = newUrl.replace("tracks/","audius/");
          AudiusSaveMetadata(track,meta);
    }

    if(artist){
        addListEntry(`${artist} - ${title}`,track,true); //title + artist, URL
    } else {
        addListEntry(title,track,true);
    }
    return true;
}

function printInfo(value){
    if (typeof log === 'undefined' || log === null) {
        console.log(value);
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
        tc = []; // Timecode array to be joined with '.'

    if (hms.h > 0) {
      tc.push(hms.h);
    }

    tc.push((hms.m < 10 && hms.h > 0 ? "0" + hms.m : hms.m));
    tc.push((hms.s < 10  ? "0" + hms.s : hms.s));

    return tc.join('.');
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