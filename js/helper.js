function readTitle(songURL){
    if (typeof(Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem(songURL));    
    }
}

function killTitle(songURL){
    if (typeof(Storage) !== "undefined" && songURL) {
        localStorage.removeItem(songURL);    
    }
}

function writeTitle(songURL,title){
    if (typeof(Storage) !== "undefined" && songURL) {
        if(songURL.startsWith("/")){
            songURL = songURL.substring(1);
        }
        const data = [title,"","",""];
        localStorage.setItem(songURL, JSON.stringify(data));    
    }
}

function writeTitle(songURL,title,artist,cover,genre,startPos){
    if (typeof(Storage) !== "undefined" && songURL) {
        if(songURL.startsWith("/")){
            songURL = songURL.substring(1);
        }
        if (songURL.startsWith("tracks/")){ //update old metadata 
            songURL = "SC/" + songURL.substring(7);
        }
        const data = [title,artist,cover,genre,startPos];
        localStorage.setItem(songURL, JSON.stringify(data));    
    }
}

function displayCover(audioURL){
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
      var songInfo = readTitle(audioURL),
          cover = "";  
      if(songInfo[2]){
        cover = songInfo[2];
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
                writeTitle(data[0],data[1],data[2],data[3],data[4]);
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
    if (typeof(Storage) == "undefined") return;

    Object.keys(localStorage).filter(function(key){
        return key.startsWith("tracks/");
    }).forEach(oldURL => { //update old metadata 
        const newURL = "SC/" + oldURL.substring(7);
        localStorage.setItem(newURL, localStorage.getItem(oldURL));  
        killTitle(oldURL);
    });

    Object.keys(localStorage).filter(function(key){
        return !key.startsWith("file/");
    }).forEach(item => {
        const data = JSON.parse(localStorage.getItem(item));
        if(data[1]=='null'){data[1]=''};
        if(data[1]){
            readCallback(`${data[1]} - ${data[0]}`,item); //title + artist, URL
        } else {
            readCallback(data[0],item); //title, URL
        } 
    });
}

async function addSomethingNew(type,something){
    if(type == "SC"){
        newUrl = SCextractID(something);
    } else {
        newUrl = AudiusExtractID(something);
    }
    if(!newUrl) return false;
    if(readTitle(newUrl)){
        printInfo(newUrl + " already exists");
        return true;
    }
    if(type == "SC"){
        var meta = SCextractTitle(something),
            title = (meta ? meta : newUrl),
            track = newUrl.replace("tracks/","SC/");
            writeTitle(track,title);
    } else {
        var url = AudiusAddress + "/v1/" + newUrl,
          meta = await AudiusReadMetadata(url),
          title = (meta ? meta.title : newUrl),
          track = newUrl.replace("tracks/","audius/");
          AudiusSaveMetadata(track,meta);
    }

    addListEntry(title,track,true);
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