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

function writeTitle(songURL,title,artist,cover){
    if (typeof(Storage) !== "undefined" && songURL) {
        const data = [title,artist,cover];
        localStorage.setItem(songURL, JSON.stringify(data));    
    }
}

function displayCover(audioURL){
    img = document.getElementById("cover");
    if(audioURL.startsWith('file')){
      var x = audioURL.substring(5);
      window.jsmediatags.read(fileStore[x-1], {
          onSuccess: function(tag) {
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
      if(songInfo.length>2){
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
                writeTitle(data[0],data[1],data[2],data[3]);
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

function exportList(){
    const link = document.createElement("a");
    var content = "";
    Object.keys(localStorage).filter(function(key){
        return key.startsWith("tracks/");
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
    }).forEach(item => {
        const data = JSON.parse(localStorage.getItem(item));
        if(data[1]){
            readCallback(`${data[1]} - ${data[0]}`,item); //title + artist, URL
        } else {
            readCallback(data[0],item); //title, URL
        } 
    });
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

// format number with leading zero
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}