function readTitle(songURL){
    if (typeof(Storage) !== "undefined") {
        return JSON.parse(localStorage.getItem(songURL));    
    }
}

function writeTitle(songURL,title,artist,cover){
    if (typeof(Storage) !== "undefined") {
        const data = [title,artist,cover];
        localStorage.setItem(songURL, JSON.stringify(data));    
    }
}

function readTitles(readCallback){
    if (typeof(Storage) !== "undefined") {

        for (var key in localStorage){
            if(key.startsWith("tracks/")){
                const data = JSON.parse(localStorage.getItem(key));
                if(data[1]){
                    readCallback(`${data[1]} - ${data[0]}`,key); //title + artist, URL
                } else {
                    readCallback(data[0],key); //title, URL
                }
            }
        }
    } 
}

function addURL(title,newUrl){
    newUrl = SCextractID(newUrl);
    if(!newUrl) return;
    if(title === ""){
      title = newUrl;
    }
    writeTitle(newUrl,title);
    addListEntry(title,newUrl);
}

function SCextractID(bigURL){
    bigURL = bigURL.trim().toLowerCase();
    var pos = bigURL.indexOf("tracks/");
    if(pos < 0){
      pos = bigURL.indexOf("users/");
    }
    if(pos < 0) return null;
    return bigURL.substring(pos);
}

// format number
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}